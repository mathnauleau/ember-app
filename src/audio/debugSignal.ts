import { useEffect, useState } from 'react'

// Simulated readouts from the design, until the Debug screen is fed by /audio in M1.
export const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
export const TARGET_PITCH_CLASSES = [7, 11, 2] // G major
export const TARGET_NAME = 'G'
export const PITCH_TARGET_NAME = 'A2'
export const SAMPLE_RATE_KHZ = 48
export const LATENCY_MS = 21
export const GRID_SLOTS = 16

const ONSET_OFFSETS_MS = [-12, 8, -40, 22, 5, -8, 31, -15, 14, -4]
const ONSET_SLOTS = [0, 2, 3, 5, 6, 7, 8, 10, 11, 13]
const CHORD_BASELINES: [string, number][] = [['G', 0.86], ['C', 0.61], ['D', 0.55], ['Em', 0.68]]

export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length / 2
  return Number.isInteger(mid) ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[Math.floor(mid)]
}

export function readSignal(t: number) {
  const level = 0.55 + Math.sin(t / 420) * 0.25 + Math.sin(t / 97) * 0.08
  const hz = 110 + Math.sin(t / 900) * 0.9 + Math.sin(t / 130) * 0.2
  return {
    t,
    db: -60 + level * 50,
    hz,
    cents: 1200 * Math.log2(hz / 110),
    clarity: 0.91 + Math.sin(t / 250) * 0.04,
    chroma: NOTES.map((_, i) => {
      const base = TARGET_PITCH_CLASSES.includes(i) ? (i === 7 ? 0.95 : 0.7) : 0.12
      return Math.max(0.04, Math.min(1, base + Math.sin(t / (180 + i * 23) + i) * 0.1))
    }),
    scores: CHORD_BASELINES.map(([name, base], i) => ({
      name,
      value: Math.max(0, Math.min(1, base + Math.sin(t / (300 + i * 70)) * 0.05)),
    })),
    onsets: ONSET_OFFSETS_MS.map((offsetMs, i) => ({
      offsetMs,
      slot: ONSET_SLOTS[i],
      heard: i <= Math.floor(t / 400) % ONSET_OFFSETS_MS.length,
    })),
    medianOffsetMs: median(ONSET_OFFSETS_MS),
  }
}

export function useDebugSignal() {
  const [signal, setSignal] = useState(() => readSignal(0))
  useEffect(() => {
    const startedAt = performance.now()
    const id = setInterval(() => setSignal(readSignal(performance.now() - startedAt)), 100)
    return () => clearInterval(id)
  }, [])
  return signal
}
