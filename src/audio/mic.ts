import { PitchDetector } from 'pitchy'
import { CHORD, PITCH } from '../config/thresholds'
import { chromaFromSpectrum, type Chroma } from './chord'
import workletUrl from './onset.worklet.ts?worker&url'
import { dbToRms, isOctaveJump, median, rmsOf } from './pitch'
import type { Onset } from './strumTiming'

const { minClarity, smoothing, lowClarityReadings, floorMeasureMs, silentRatio, floorAdapt, stalledMs, readingMs, fftSize } = PITCH

export type MicStatus = 'idle' | 'starting' | 'measuring' | 'silent' | 'listening' | 'noisy' | 'stalled'

export type MicReading = {
  status: MicStatus
  hz: number | null
  rawHz: number
  clarity: number
  rms: number
  chroma: Chroma | null
  floorRms: number | null
  octaveJumps: number
  sampleRate: number
  latencyMs: number
  contextState: string
  trackState: string
}

export type MicConfig = { silentDb: number; noisyDb: number; minHz: number; maxHz: number }

export const IDLE_READING: MicReading = {
  status: 'idle',
  hz: null,
  rawHz: 0,
  clarity: 0,
  rms: 0,
  chroma: null,
  floorRms: null,
  octaveJumps: 0,
  sampleRate: 0,
  latencyMs: 0,
  contextState: '',
  trackState: '',
}

let sharedContext: AudioContext | null = null
let workletLoaded: Promise<void> | null = null
let micAllowed = false
let openMics = 0
const micListeners = new Set<() => void>()

function countMic(change: 1 | -1) {
  openMics += change
  micListeners.forEach((listener) => listener())
}

export const micListening = () => openMics > 0

export function subscribeMicListening(listener: () => void) {
  micListeners.add(listener)
  return () => {
    micListeners.delete(listener)
  }
}

// One context for mic, metronome and synth, first created inside a tap (iOS requires it).
export function unlockAudio() {
  sharedContext ??= new AudioContext()
  void sharedContext.resume()
  return sharedContext
}

export const audioContext = () => sharedContext

export const audioUnlocked = () => sharedContext?.state === 'running'

// Any tap can unlock audio, but the mic only opens by itself once it has been allowed here.
export const micReady = () => micAllowed && audioUnlocked()

export function micErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  switch (name) {
    case 'NotAllowedError':
      return 'The mic is blocked. Allow it in iPad Settings under Apps > Safari > Microphone, then try again.'
    case 'NotFoundError':
      return "This device doesn't seem to have a microphone."
    case 'NotReadableError':
      return 'Another app is using the mic. Close it, then try again.'
    case 'SecurityError':
      return 'The mic only works when Ember is served over HTTPS.'
    case 'OverconstrainedError':
      return "This device couldn't open the mic with the settings Ember needs."
    default:
      return `The mic couldn't start: ${error instanceof Error ? error.message : String(error)}`
  }
}

export async function startMic(options: {
  getConfig: () => MicConfig
  onReading: (reading: MicReading) => void
  onOnset?: (onset: Onset) => void
  chroma?: boolean // chord work: a strum has no single pitch, so low clarity isn't noise
  onStopped: () => void
}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException('getUserMedia is not available', 'SecurityError')
  }

  const context = unlockAudio()
  countMic(1)
  const stream = await navigator.mediaDevices
    .getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
    .catch((error: unknown) => {
      countMic(-1)
      throw error
    })
  micAllowed = true
  void context.resume()

  const source = context.createMediaStreamSource(stream)
  const analyser = context.createAnalyser()
  analyser.fftSize = fftSize
  // Silent path to the output keeps the graph pulled, without playing the mic back.
  const mute = context.createGain()
  mute.gain.value = 0
  source.connect(analyser)
  analyser.connect(mute)
  mute.connect(context.destination)

  let spectrumNode: AnalyserNode | null = null
  if (options.chroma) {
    spectrumNode = context.createAnalyser()
    spectrumNode.fftSize = CHORD.fftSize
    spectrumNode.smoothingTimeConstant = 0
    source.connect(spectrumNode)
    spectrumNode.connect(mute)
  }
  const spectrum = new Float32Array(spectrumNode?.frequencyBinCount ?? 0)
  let chroma: Chroma | null = null
  let readings = 0

  // Tuning doesn't depend on onsets, so a failed worklet must not stop the mic.
  let onsetNode: AudioWorkletNode | null = null
  if (options.onOnset) {
    try {
      workletLoaded ??= context.audioWorklet.addModule(workletUrl)
      await workletLoaded
      onsetNode = new AudioWorkletNode(context, 'onset')
      onsetNode.port.onmessage = (event: MessageEvent<Onset>) => options.onOnset?.(event.data)
      source.connect(onsetNode)
      onsetNode.connect(mute)
    } catch (error) {
      console.error('Onset detection could not start', error)
    }
  }

  const track = stream.getAudioTracks()[0]
  track?.addEventListener('ended', options.onStopped)

  // iOS suspends the context on interruptions such as a call or switching apps.
  const resumeWhenVisible = () => {
    if (document.visibilityState === 'visible') void context.resume()
  }
  document.addEventListener('visibilitychange', resumeWhenVisible)

  const buffer = new Float32Array(fftSize)
  const detector = PitchDetector.forFloat32Array(fftSize)
  const floorSamples: number[] = []
  const recent: number[] = []
  let floorStartedAt: number | null = null
  let floorRms: number | null = null
  let smoothed: number | null = null
  let octaveJumps = 0
  let unclear = 0
  let status: MicStatus = 'measuring'
  let lastMinHz = 0
  let lastLiveAt = performance.now()

  const read = () => {
    const now = performance.now()
    // Only an interrupted context or muted track counts as stalled. Exact zeros don't:
    // iPadOS sends digital silence from a quiet room, and the mic is fine.
    if (context.state !== 'running' || track?.muted) {
      if (context.state !== 'running') void context.resume()
      if (now - lastLiveAt >= stalledMs) status = 'stalled'
      return { rawHz: 0, clarity: 0, rms: 0 }
    }
    lastLiveAt = now
    if (status === 'stalled') status = floorRms === null ? 'measuring' : 'silent'

    analyser.getFloatTimeDomainData(buffer)
    const rms = rmsOf(buffer)
    const [rawHz, clarity] = detector.findPitch(buffer, context.sampleRate)
    if (spectrumNode && ++readings % CHORD.everyReadings === 0) {
      spectrumNode.getFloatFrequencyData(spectrum)
      chroma = chromaFromSpectrum(spectrum, context.sampleRate, CHORD.fftSize)
    }

    if (floorRms === null) {
      floorStartedAt ??= now
      floorSamples.push(rms)
      if (now - floorStartedAt >= floorMeasureMs) {
        floorRms = median(floorSamples)
        status = 'silent'
      }
      return { rawHz, clarity, rms }
    }

    const { silentDb, noisyDb, minHz, maxHz } = options.getConfig()
    if (minHz !== lastMinHz) {
      recent.length = 0
      lastMinHz = minHz
    }

    // Playing during the first second inflates the floor, so let it settle back down.
    if (rms > 0 && rms < floorRms) floorRms += (rms - floorRms) * floorAdapt

    const noisyRoom = floorRms > dbToRms(noisyDb)
    if (rms < Math.max(floorRms * silentRatio, dbToRms(silentDb))) {
      status = noisyRoom ? 'noisy' : 'silent'
      recent.length = 0
      smoothed = null
      unclear = 0
      return { rawHz, clarity, rms }
    }

    if (clarity >= minClarity && (rawHz < minHz || rawHz > maxHz)) {
      // A clear note outside the range, like another string while one is locked, isn't noise.
      recent.length = 0
      smoothed = null
      unclear = 0
      status = 'listening'
    } else if (clarity >= minClarity) {
      recent.push(rawHz)
      if (recent.length > smoothing) recent.shift()
      const next = median(recent)
      if (smoothed !== null && isOctaveJump(smoothed, next)) octaveJumps += 1
      smoothed = next
      unclear = 0
      status = 'listening'
    } else {
      unclear += 1
      if (noisyRoom) status = 'noisy'
      else if (options.chroma) status = 'listening'
      else if (unclear >= lowClarityReadings) status = 'noisy'
    }
    return { rawHz, clarity, rms }
  }

  const timer = setInterval(() => {
    options.onReading({
      ...read(),
      chroma,
      status,
      hz: smoothed,
      floorRms,
      octaveJumps,
      sampleRate: context.sampleRate,
      latencyMs: ((context.baseLatency ?? 0) + (context.outputLatency ?? 0)) * 1000,
      contextState: context.state,
      trackState: !track ? 'none' : track.muted ? 'muted' : track.readyState,
    })
  }, readingMs)

  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', resumeWhenVisible)
    stream.getTracks().forEach((track) => track.stop())
    source.disconnect()
    analyser.disconnect()
    onsetNode?.disconnect()
    spectrumNode?.disconnect()
    mute.disconnect()
    countMic(-1)
  }
}
