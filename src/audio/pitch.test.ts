import { PitchDetector } from 'pitchy'
import { describe, expect, it } from 'vitest'
import { centsBetween, dbToRms, isOctaveJump, median, nearestStringIndex, rmsOf, rmsToDb, STRINGS } from './pitch'
import { rangeFor, TunerTracker } from './tuner'

const SAMPLE_RATE = 48000
const SIZE = 4096

// Guitar-like tone: the fundamental is weaker than the second harmonic, which is what provokes octave errors.
function tone(hz: number) {
  const amps = [0.35, 1, 0.7, 0.45, 0.3]
  return Float32Array.from({ length: SIZE }, (_, i) =>
    amps.reduce((sum, a, k) => sum + 0.1 * a * Math.sin((2 * Math.PI * hz * (k + 1) * i) / SAMPLE_RATE), 0),
  )
}

describe('pitch detection', () => {
  const detector = PitchDetector.forFloat32Array(SIZE)

  it.each(STRINGS.map((s) => [s.note + s.octave, s.hz] as const))('reads open %s without an octave error', (_, hz) => {
    const [found, clarity] = detector.findPitch(tone(hz), SAMPLE_RATE)
    expect(clarity).toBeGreaterThan(0.9)
    expect(Math.abs(centsBetween(found, hz))).toBeLessThan(2)
  })
})

describe('helpers', () => {
  it('finds the nearest string', () => {
    expect(nearestStringIndex(84)).toBe(0)
    expect(nearestStringIndex(112)).toBe(1)
    expect(nearestStringIndex(325)).toBe(5)
  })

  it('measures RMS and converts dB', () => {
    expect(rmsOf(Float32Array.from([0.5, -0.5]))).toBeCloseTo(0.5)
    expect(rmsToDb(dbToRms(-34))).toBeCloseTo(-34)
    expect(rmsToDb(0)).toBe(-Infinity)
  })

  it('takes the median of a smoothing window', () => {
    expect(median([110, 220, 110, 110, 109])).toBe(110)
  })

  it('counts octaves as jumps but not changes between open strings', () => {
    expect(isOctaveJump(110, 220)).toBe(true)
    for (const a of STRINGS) for (const b of STRINGS) expect(isOctaveJump(a.hz, b.hz)).toBe(false)
  })
})

describe('tuner', () => {
  it('marks a string done only after 400 ms in tune', () => {
    const t = new TunerTracker()
    expect(t.update(110, 0, null).done).toEqual([])
    expect(t.update(110.1, 399, null).done).toEqual([])
    expect(t.update(110.1, 400, null).done).toEqual([1])
  })

  it('restarts the hold when the pitch drifts out or the note stops', () => {
    const t = new TunerTracker()
    t.update(110, 0, null)
    t.update(112, 200, null)
    expect(t.update(110, 300, null).done).toEqual([])
    expect(t.update(110, 650, null).done).toEqual([])
    t.update(null, 3000, null)
    expect(t.update(110, 3100, null).done).toEqual([])
    expect(t.update(110, 3500, null).done).toEqual([1])
  })

  it('treats exactly +-5 cents as in tune', () => {
    const t = new TunerTracker()
    expect(t.update(110 * 2 ** (4.9 / 1200), 0, null).inTune).toBe(true)
    expect(t.update(110 * 2 ** (5.1 / 1200), 0, null).inTune).toBe(false)
  })

  it('keeps a locked string even when another is closer', () => {
    const t = new TunerTracker()
    const view = t.update(120, 0, 1)
    expect(view.active).toBe(1)
    expect(view.cents).toBeGreaterThan(100)
  })

  it('keeps done strings when the signal stops', () => {
    const t = new TunerTracker()
    t.update(110, 0, null)
    t.update(110, 500, null)
    expect(t.update(null, 3000, null)).toMatchObject({ signal: false, inTune: false, done: [1] })
  })

  it('holds the last reading through a brief dropout', () => {
    const t = new TunerTracker()
    t.update(112, 0, null)
    expect(t.update(null, 90, null)).toMatchObject({ signal: true, active: 1 })
    expect(t.update(null, 1900, null).signal).toBe(true)
    expect(t.update(null, 2100, null).signal).toBe(false)
  })

  it('counts time in tune across a dropout', () => {
    const t = new TunerTracker()
    t.update(110, 0, null)
    t.update(null, 200, null)
    expect(t.update(110, 400, null).done).toEqual([1])
  })

  it('does not keep showing the old string after locking another', () => {
    const t = new TunerTracker()
    t.update(112, 0, null)
    expect(t.update(null, 100, 3)).toMatchObject({ signal: false, active: 3 })
  })

  it('narrows the range around a locked string so its octave is excluded', () => {
    const { minHz, maxHz } = rangeFor(0)
    expect(minHz).toBeGreaterThan(82.41 / 2)
    expect(maxHz).toBeLessThan(82.41 * 2)
  })
})
