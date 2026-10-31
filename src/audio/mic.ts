import { PitchDetector } from 'pitchy'
import { PITCH } from '../config/thresholds'
import { dbToRms, isOctaveJump, median, rmsOf } from './pitch'

const { minClarity, smoothing, lowClarityReadings, floorMeasureMs, silentRatio, readingMs, fftSize } = PITCH

export type MicStatus = 'idle' | 'starting' | 'measuring' | 'silent' | 'listening' | 'noisy'

export type MicReading = {
  status: MicStatus
  hz: number | null
  rawHz: number
  clarity: number
  rms: number
  floorRms: number | null
  octaveJumps: number
  sampleRate: number
  latencyMs: number
}

export type MicConfig = { silentDb: number; noisyDb: number; minHz: number; maxHz: number }

export const IDLE_READING: MicReading = {
  status: 'idle',
  hz: null,
  rawHz: 0,
  clarity: 0,
  rms: 0,
  floorRms: null,
  octaveJumps: 0,
  sampleRate: 0,
  latencyMs: 0,
}

let sharedContext: AudioContext | null = null

// One context for mic, metronome and synth, first created inside a tap (iOS requires it).
export function unlockAudio() {
  sharedContext ??= new AudioContext()
  void sharedContext.resume()
  return sharedContext
}

export const audioUnlocked = () => sharedContext?.state === 'running'

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
  onStopped: () => void
}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException('getUserMedia is not available', 'SecurityError')
  }

  const context = unlockAudio()
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })
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

  stream.getAudioTracks()[0]?.addEventListener('ended', options.onStopped)

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

  const read = () => {
    if (context.state !== 'running') return { rawHz: 0, clarity: 0, rms: 0 }

    analyser.getFloatTimeDomainData(buffer)
    const rms = rmsOf(buffer)
    const [rawHz, clarity] = detector.findPitch(buffer, context.sampleRate)

    if (floorRms === null) {
      // The analyser reads digital zero until the first mic samples arrive.
      if (rms > 0) {
        floorStartedAt ??= performance.now()
        floorSamples.push(rms)
      }
      if (floorStartedAt !== null && performance.now() - floorStartedAt >= floorMeasureMs) {
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
      if (noisyRoom || unclear >= lowClarityReadings) status = 'noisy'
    }
    return { rawHz, clarity, rms }
  }

  const timer = setInterval(() => {
    options.onReading({
      ...read(),
      status,
      hz: smoothed,
      floorRms,
      octaveJumps,
      sampleRate: context.sampleRate,
      latencyMs: ((context.baseLatency ?? 0) + (context.outputLatency ?? 0)) * 1000,
    })
  }, readingMs)

  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', resumeWhenVisible)
    stream.getTracks().forEach((track) => track.stop())
    source.disconnect()
    analyser.disconnect()
    mute.disconnect()
  }
}
