const OPEN_STRINGS = [82.41, 110, 146.83, 196, 246.94, 329.63]
const STAGGER_S = 0.015
const RING_S = 1.2
const DAMPING = 0.996
const LEVEL = 0.22

export function fretHz(string: number, fret: number) {
  return OPEN_STRINGS[string] * 2 ** (fret / 12)
}

// Karplus-Strong: a noise burst circulating through a damped delay line.
export function pluck(hz: number, sampleRate: number, seconds = RING_S, random = Math.random) {
  const period = Math.round(sampleRate / hz)
  const line = Float32Array.from({ length: period }, () => random() * 2 - 1)
  const output = new Float32Array(Math.floor(seconds * sampleRate))
  for (let i = 0; i < output.length; i++) {
    const at = i % period
    output[i] = line[at]
    line[at] = DAMPING * 0.5 * (line[at] + line[(at + 1) % period])
  }
  return output
}

const buffers = new Map<string, AudioBuffer>()

function bufferFor(context: AudioContext, hz: number) {
  const key = `${context.sampleRate}:${hz.toFixed(2)}`
  let buffer = buffers.get(key)
  if (!buffer) {
    buffer = context.createBuffer(1, Math.floor(RING_S * context.sampleRate), context.sampleRate)
    buffer.copyToChannel(pluck(hz, context.sampleRate) as Float32Array<ArrayBuffer>, 0)
    buffers.set(key, buffer)
  }
  return buffer
}

// Down strums run low to high, up strums high to low.
export function strum(context: AudioContext, frets: number[], time: number, direction: 'D' | 'U') {
  const strings = frets.map((fret, string) => ({ fret, string })).filter((s) => s.fret >= 0)
  if (direction === 'U') strings.reverse()
  strings.forEach(({ fret, string }, i) => {
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = bufferFor(context, fretHz(string, fret))
    gain.gain.value = LEVEL
    source.connect(gain).connect(context.destination)
    source.start(time + i * STAGGER_S)
  })
}
