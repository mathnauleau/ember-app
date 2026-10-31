export const STRINGS = [
  { name: 'E2', hz: 82.41 },
  { name: 'A2', hz: 110.0 },
  { name: 'D3', hz: 146.83 },
  { name: 'G3', hz: 196.0 },
  { name: 'B3', hz: 246.94 },
  { name: 'E4', hz: 329.63 },
]

export const centsBetween = (hz: number, target: number) => 1200 * Math.log2(hz / target)

export function nearestString(hz: number) {
  const string = STRINGS.reduce((best, s) =>
    Math.abs(centsBetween(hz, s.hz)) < Math.abs(centsBetween(hz, best.hz)) ? s : best,
  )
  return { name: string.name, cents: centsBetween(hz, string.hz) }
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

// No two open strings are 1.9-2.1x apart, so changing string never counts as a jump.
export function isOctaveJump(previous: number, next: number) {
  const ratio = Math.max(previous, next) / Math.min(previous, next)
  return ratio >= 1.9 && ratio <= 2.1
}
