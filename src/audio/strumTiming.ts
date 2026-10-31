import { TIMING } from '../config/thresholds'
import { median } from './pitch'

export type Onset = { time: number; strength: number }
export type GridSlot = { time: number; strum: boolean; click: boolean }
export type Verdict = 'on' | 'early' | 'late'

// Offsets in ms from the nearest expected strum, after latency and the calibration offset.
export function matchOnsets(onsets: Onset[], slots: GridSlot[], options: { eighthS: number; latencyS: number; offsetS: number }) {
  const { eighthS, latencyS, offsetS } = options
  const nearClick = (o: Onset) =>
    slots.some((s) => s.click && Math.abs(o.time - s.time - latencyS) * 1000 <= TIMING.clickLeakMs)

  // A click leaking into the mic is quieter than a strum, so off-click strums set the bar for what counts.
  const offClick = onsets.filter((o) => !nearClick(o)).map((o) => o.strength)
  const reference = offClick.length ? median(offClick) : Infinity

  const offsets: number[] = []
  for (const onset of onsets) {
    if (nearClick(onset) && onset.strength < reference * TIMING.clickLeakRatio) continue
    const adjusted = onset.time - latencyS - offsetS
    let best: number | null = null
    for (const slot of slots) {
      if (!slot.strum) continue
      const diff = adjusted - slot.time
      if (best === null || Math.abs(diff) < Math.abs(best)) best = diff
    }
    if (best !== null && Math.abs(best) <= eighthS / 2) offsets.push(best * 1000)
  }
  return offsets
}

export function barVerdict(offsetsMs: number[], onTimeMs: number): { medianMs: number; verdict: Verdict } | null {
  if (offsetsMs.length < TIMING.minMatched) return null
  const medianMs = median(offsetsMs)
  if (Math.abs(medianMs) <= onTimeMs) return { medianMs, verdict: 'on' }
  return { medianMs, verdict: medianMs < 0 ? 'early' : 'late' }
}

export function bpmFromTaps(taps: number[]) {
  if (taps.length < 3) return null
  const average = (taps[taps.length - 1] - taps[0]) / (taps.length - 1)
  return Math.round(Math.min(160, Math.max(40, 60000 / average)))
}
