import { describe, expect, it } from 'vitest'
import { ONSET } from '../config/thresholds'
import { OnsetDetector } from './onsetDetector'
import { barVerdict, bpmFromTaps, matchOnsets, type GridSlot, type Onset } from './strumTiming'
import { fretHz, pluck } from './synth'

const SAMPLE_RATE = 48000

function clickTrain(times: number[], seconds: number, amp = 0.3) {
  const signal = new Float32Array(seconds * SAMPLE_RATE)
  let seed = 1
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
  for (let i = 0; i < signal.length; i++) signal[i] = noise() * 0.0004
  for (const t of times) {
    const start = Math.round(t * SAMPLE_RATE)
    for (let i = 0; i < 1500; i++) signal[start + i] += noise() * amp * Math.exp(-i / 300)
  }
  return signal
}

function detect(signal: Float32Array, block = 128) {
  const detector = new OnsetDetector(SAMPLE_RATE)
  const found: number[] = []
  for (let at = 0; at < signal.length; at += block) {
    for (const o of detector.process(signal.subarray(at, at + block), at)) found.push(o.frame / SAMPLE_RATE)
  }
  return found
}

describe('onset detector', () => {
  const times = [0.5, 1, 1.5, 2, 2.25, 2.5, 3]

  it('finds every click within 5 ms', () => {
    const found = detect(clickTrain(times, 4))
    expect(found).toHaveLength(times.length)
    found.forEach((t, i) => expect(Math.abs(t - times[i]) * 1000).toBeLessThan(5))
  })

  it('finds nothing in a quiet room', () => {
    expect(detect(clickTrain([], 2))).toEqual([])
  })

  it('counts one strum as one onset', () => {
    expect(detect(clickTrain([1], 2))).toHaveLength(1)
  })

  it('splits fast eighths at 160 bpm', () => {
    const fast = Array.from({ length: 8 }, (_, i) => 0.5 + i * (30 / 160))
    expect(detect(clickTrain(fast, 3))).toHaveLength(8)
  })

  it('does not depend on the audio block size', () => {
    expect(detect(clickTrain(times, 4), 128)).toEqual(detect(clickTrain(times, 4), 300))
  })

  it('still hears a quiet strum', () => {
    expect(detect(clickTrain(times, 4, 0.01))).toHaveLength(times.length)
  })

  it('uses a hop short enough for timing feedback', () => {
    expect((ONSET.hopSize / SAMPLE_RATE) * 1000).toBeLessThan(5)
  })
})

describe('strum timing', () => {
  const eighthS = 30 / 72
  const pattern = ['D', '_', 'D', 'U', '_', 'U', 'D', 'U']
  const slots: GridSlot[] = pattern.map((p, i) => ({ time: 10 + i * eighthS, strum: p !== '_', click: i % 2 === 0 }))
  const played = (shiftMs: number, latency = 0): Onset[] =>
    slots.filter((s) => s.strum).map((s) => ({ time: s.time + latency + shiftMs / 1000, strength: 1 }))
  const options = { eighthS, latencyS: 0, offsetS: 0 }

  it('reads steady early and late bars', () => {
    expect(barVerdict(matchOnsets(played(0), slots, options), 70)?.verdict).toBe('on')
    expect(barVerdict(matchOnsets(played(-120), slots, options), 70)?.verdict).toBe('early')
    expect(barVerdict(matchOnsets(played(120), slots, options), 70)?.verdict).toBe('late')
  })

  it('treats exactly the on-time window as on time', () => {
    expect(barVerdict([70, 70, 70, 70], 70)?.verdict).toBe('on')
    expect(barVerdict([71, 71, 71, 71], 70)?.verdict).toBe('late')
  })

  it('gives no feedback under four matched strums', () => {
    expect(barVerdict([0, 0, 0], 70)).toBeNull()
    expect(barVerdict(matchOnsets(played(0).slice(0, 3), slots, options), 70)).toBeNull()
  })

  it('subtracts latency and the calibration offset', () => {
    const offsets = matchOnsets(played(41, 0.02), slots, { eighthS, latencyS: 0.02, offsetS: 0.041 })
    expect(Math.max(...offsets.map(Math.abs))).toBeLessThan(0.01)
  })

  it('ignores an onset far from every strum', () => {
    const stray = { time: slots[1].time + 0.001, strength: 1 }
    const between = slots[1].time - slots[0].time
    expect(between).toBeGreaterThan(0)
    expect(matchOnsets([stray], slots.map((s) => ({ ...s, strum: s === slots[6] })), options)).toEqual([])
  })

  it('never treats a bare click leaking into the mic as playing', () => {
    const leak = slots.filter((s) => s.click).map((s) => ({ time: s.time + 0.03, strength: 0.05 }))
    expect(barVerdict(matchOnsets(leak, slots, { ...options, latencyS: 0.03 }), 70)).toBeNull()
  })

  it('keeps on-click strums that are as loud as the rest, drops quiet leaks', () => {
    const strums = played(0, 0.03).map((o) => ({ ...o, strength: 1 }))
    const leak = { time: slots[4].time + 0.03, strength: 0.05 }
    const offsets = matchOnsets([...strums, leak], slots, { ...options, latencyS: 0.03 })
    expect(offsets).toHaveLength(strums.length)
  })
})

describe('tap tempo', () => {
  it('needs three taps and clamps to the range', () => {
    expect(bpmFromTaps([0, 500])).toBeNull()
    expect(bpmFromTaps([0, 500, 1000])).toBe(120)
    expect(bpmFromTaps([0, 100, 200])).toBe(160)
    expect(bpmFromTaps([0, 5000, 10000])).toBe(40)
  })
})

describe('synth', () => {
  it('plucks at the fretted pitch', () => {
    const signal = pluck(fretHz(0, 3), SAMPLE_RATE, 0.5)
    expect(fretHz(0, 3)).toBeCloseTo(98, 0)
    expect(signal.length).toBe(24000)
    const start = Math.max(...signal.slice(0, 2400).map(Math.abs))
    const end = Math.max(...signal.slice(21600).map(Math.abs))
    expect(end).toBeLessThan(start)
  })
})
