import { describe, expect, it } from 'vitest'
import { crackleSamples } from './crackle'

const RATE = 8000
const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647

describe('crackle', () => {
  const samples = crackleSamples(RATE, 10, seeded(7))
  const peakOf = (part: Float32Array) => part.reduce((max, s) => Math.max(max, Math.abs(s)), 0)

  it('fills the loop without clipping', () => {
    expect(samples.length).toBe(10 * RATE)
    expect(peakOf(samples)).toBeCloseTo(0.9, 5)
    expect(samples.every(Number.isFinite)).toBe(true)
  })

  it('is mostly quiet, with pops standing well above the rumble', () => {
    const sorted = samples.map(Math.abs).sort()
    expect(sorted[Math.floor(sorted.length / 2)]).toBeLessThan(0.15)
  })

  it('has no gap of silence in the rumble', () => {
    for (let i = 0; i < 10; i++) expect(peakOf(samples.subarray(i * RATE, (i + 1) * RATE))).toBeGreaterThan(0.01)
  })

  it('loops without a jump at the seam', () => {
    expect(Math.abs(samples[samples.length - 1] - samples[0])).toBeLessThan(0.3)
  })
})
