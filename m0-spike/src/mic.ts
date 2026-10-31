import { PitchDetector } from 'pitchy'
import { isOctaveJump, median, rmsOf } from './pitch'

const FFT_SIZE = 4096
const READING_MS = 33 // about 30 readings/s
const FLOOR_MEASURE_MS = 1000
const MIN_CLARITY = 0.9
const MIN_HZ = 70
const MAX_HZ = 400
const SMOOTHING_WINDOW = 5
const SILENT_RATIO = 2 // silent = RMS under twice the noise floor
const MIN_SILENT_RMS = 0.0005 // keeps the silent gate open on a digitally silent floor
const NOISY_FLOOR_RMS = 0.02 // about -34 dBFS
const LOW_CLARITY_READINGS = 15 // about 0.5 s of sound with no clear pitch

export type Label = 'measuring' | 'silent' | 'listening' | 'noisy'

export type Snapshot = {
  label: Label
  smoothedHz: number | null
  rawHz: number
  clarity: number
  rms: number
  noiseFloor: number | null
  octaveJumps: number
  contextState: string
  sampleRate: number
  baseLatency: number | undefined
  outputLatency: number | undefined
}

let sharedContext: AudioContext | null = null

// Created inside the tap handler, which is what iOS requires before audio can run.
function getAudioContext() {
  sharedContext ??= new AudioContext()
  void sharedContext.resume()
  return sharedContext
}

export function micErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  switch (name) {
    case 'NotAllowedError':
      return 'Mic access was blocked. In iPad Settings, go to Apps > Safari > Microphone (or tap aA in the address bar, then Website Settings), allow it, then try again.'
    case 'NotFoundError':
      return 'No microphone was found on this device.'
    case 'NotReadableError':
      return 'The mic is busy or unavailable. Close other apps using it, then try again.'
    case 'SecurityError':
      return 'This page is not allowed to use the mic. It must be served over HTTPS.'
    case 'OverconstrainedError':
      return 'This device could not open the mic with the requested settings.'
    default:
      return `The mic could not start: ${error instanceof Error ? error.message : String(error)}`
  }
}

export async function startMic(onUpdate: (snapshot: Snapshot) => void, onStopped: () => void) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('this browser does not offer mic access here. The page must be served over HTTPS.')
  }

  const context = getAudioContext()
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })
  void context.resume()

  const source = context.createMediaStreamSource(stream)
  const analyser = context.createAnalyser()
  analyser.fftSize = FFT_SIZE
  // Silent path to the output keeps the graph pulled, without playing the mic back.
  const mute = context.createGain()
  mute.gain.value = 0
  source.connect(analyser)
  analyser.connect(mute)
  mute.connect(context.destination)

  stream.getAudioTracks()[0]?.addEventListener('ended', onStopped)

  const buffer = new Float32Array(FFT_SIZE)
  const detector = PitchDetector.forFloat32Array(FFT_SIZE)
  const floorSamples: number[] = []
  const recent: number[] = []
  let floorStartedAt: number | null = null
  let noiseFloor: number | null = null
  let smoothedHz: number | null = null
  let octaveJumps = 0
  let unclearReadings = 0
  let label: Label = 'measuring'

  const reading = () => {
    if (context.state !== 'running') return { rawHz: 0, clarity: 0, rms: 0 }

    analyser.getFloatTimeDomainData(buffer)
    const rms = rmsOf(buffer)
    const [rawHz, clarity] = detector.findPitch(buffer, context.sampleRate)

    if (noiseFloor === null) {
      // The analyser reads digital zero until the first mic samples arrive.
      if (rms > 0) {
        floorStartedAt ??= performance.now()
        floorSamples.push(rms)
      }
      if (floorStartedAt !== null && performance.now() - floorStartedAt >= FLOOR_MEASURE_MS) {
        noiseFloor = median(floorSamples)
        label = 'silent'
      }
      return { rawHz, clarity, rms }
    }

    const noisyRoom = noiseFloor > NOISY_FLOOR_RMS
    if (rms < Math.max(noiseFloor * SILENT_RATIO, MIN_SILENT_RMS)) {
      label = noisyRoom ? 'noisy' : 'silent'
      recent.length = 0
      smoothedHz = null
      unclearReadings = 0
      return { rawHz, clarity, rms }
    }

    if (clarity >= MIN_CLARITY && rawHz >= MIN_HZ && rawHz <= MAX_HZ) {
      recent.push(rawHz)
      if (recent.length > SMOOTHING_WINDOW) recent.shift()
      const next = median(recent)
      if (smoothedHz !== null && isOctaveJump(smoothedHz, next)) octaveJumps += 1
      smoothedHz = next
      unclearReadings = 0
      label = 'listening'
    } else {
      unclearReadings += 1
      if (noisyRoom || unclearReadings >= LOW_CLARITY_READINGS) label = 'noisy'
    }
    return { rawHz, clarity, rms }
  }

  const timer = setInterval(() => {
    onUpdate({
      ...reading(),
      label,
      smoothedHz,
      noiseFloor,
      octaveJumps,
      contextState: context.state,
      sampleRate: context.sampleRate,
      baseLatency: context.baseLatency,
      outputLatency: context.outputLatency,
    })
  }, READING_MS)

  return () => {
    clearInterval(timer)
    stream.getTracks().forEach((track) => track.stop())
    source.disconnect()
    analyser.disconnect()
    mute.disconnect()
  }
}
