export const STRINGS = [
  { note: 'E', octave: '2', sub: '6th · low', hz: 82.41 },
  { note: 'A', octave: '2', sub: '5th', hz: 110.0 },
  { note: 'D', octave: '3', sub: '4th', hz: 146.83 },
  { note: 'G', octave: '3', sub: '3rd', hz: 196.0 },
  { note: 'B', octave: '3', sub: '2nd', hz: 246.94 },
  { note: 'E', octave: '4', sub: '1st · high', hz: 329.63 },
]

export const centsBetween = (hz: number, target: number) => 1200 * Math.log2(hz / target)

export function nearestStringIndex(hz: number) {
  let best = 0
  STRINGS.forEach((s, i) => {
    if (Math.abs(centsBetween(hz, s.hz)) < Math.abs(centsBetween(hz, STRINGS[best].hz))) best = i
  })
  return best
}

export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length / 2
  return Number.isInteger(mid) ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[Math.floor(mid)]
}

export function rmsOf(buffer: Float32Array) {
  let sum = 0
  for (const v of buffer) sum += v * v
  return Math.sqrt(sum / buffer.length)
}

export const dbToRms = (db: number) => 10 ** (db / 20)
export const rmsToDb = (rms: number) => (rms > 0 ? 20 * Math.log10(rms) : -Infinity)

// No two open strings are 1.9-2.1x apart, so changing string never counts as a jump.
export function isOctaveJump(previous: number, next: number) {
  const ratio = Math.max(previous, next) / Math.min(previous, next)
  return ratio >= 1.9 && ratio <= 2.1
}
