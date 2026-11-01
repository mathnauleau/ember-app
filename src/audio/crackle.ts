import { audioContext } from './mic'

const LOOP_S = 30
const OVERLAP_S = 1 // the tail fades into the head, so the loop has no seam
const BED_HZ = 350
const BED_LEVEL = 0.04
const FLUTTER_HZ = 2
const FLUTTER_DEPTH = 0.6
const SNAP_HZ = 5000
const POPS_PER_S = 5
const TRAIL_S = 0.12 // loud pops throw a few small ones after them
const PEAK = 0.9
const LEVEL = 0.3
const FADE_S = 0.2

const smoothing = (hz: number, sampleRate: number) => 1 - Math.exp((-2 * Math.PI * hz) / sampleRate)
// Scales white noise (-1 to 1) through a one-pole filter back to an RMS of 1, at any sample rate.
const unitRms = (a: number) => Math.sqrt((3 * (2 - a)) / a)

function addPop(output: Float32Array, at: number, level: number, decayS: number, sampleRate: number, random: () => number) {
  const decay = decayS * sampleRate
  const length = Math.min(Math.floor(decay * 6), output.length - at)
  const a = smoothing(SNAP_HZ, sampleRate)
  let low = 0
  for (let i = 0; i < length; i++) {
    const noise = random() * 2 - 1
    low += (noise - low) * a
    output[at + i] += (noise - low) * level * Math.exp(-i / decay)
  }
}

// A low rumble with random pops on top: mostly tiny ticks, now and then a louder snap.
export function crackleSamples(sampleRate: number, seconds = LOOP_S, random = Math.random) {
  const length = Math.floor(seconds * sampleRate)
  const overlap = Math.floor(OVERLAP_S * sampleRate)
  const output = new Float32Array(length + overlap)

  const a = smoothing(BED_HZ, sampleRate)
  const b = smoothing(FLUTTER_HZ, sampleRate)
  let low = 0
  let flutter = 0
  for (let i = 0; i < output.length; i++) {
    low += (random() * 2 - 1 - low) * a
    flutter += (random() * 2 - 1 - flutter) * b
    const swell = Math.max(0, 1 + FLUTTER_DEPTH * flutter * unitRms(b))
    output[i] = low * unitRms(a) * BED_LEVEL * swell
  }

  let at = 0
  for (;;) {
    at += Math.floor((-Math.log(1 - random()) / POPS_PER_S) * sampleRate)
    if (at >= output.length) break
    const level = 0.08 + 0.92 * random() ** 4
    addPop(output, at, level, 0.002 + random() * 0.01, sampleRate, random)
    const trail = level > 0.5 ? 3 + Math.floor(random() * 5) : 0
    for (let i = 0; i < trail; i++) {
      const next = at + Math.floor(random() * TRAIL_S * sampleRate)
      if (next < output.length) addPop(output, next, level * 0.2, 0.002, sampleRate, random)
    }
  }

  for (let i = 0; i < overlap; i++) {
    const t = i / overlap
    output[i] = output[i] * t + output[length + i] * (1 - t)
  }

  const loop = output.subarray(0, length)
  const peak = loop.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0)
  return loop.map((sample) => (sample / peak) * PEAK)
}

let gain: GainNode | null = null

export function setCrackle(on: boolean) {
  const context = audioContext()
  if (!context) return
  if (on) void context.resume()
  if (!gain) {
    if (!on) return
    const buffer = context.createBuffer(1, Math.floor(LOOP_S * context.sampleRate), context.sampleRate)
    buffer.copyToChannel(crackleSamples(context.sampleRate) as Float32Array<ArrayBuffer>, 0)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    gain = context.createGain()
    gain.gain.value = 0
    source.connect(gain).connect(context.destination)
    source.start()
  }
  gain.gain.setTargetAtTime(on ? LEVEL : 0, context.currentTime, FADE_S)
}
