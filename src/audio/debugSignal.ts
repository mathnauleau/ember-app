import { useEffect, useState } from 'react'
import { median } from './pitch'

// Simulated until the real sources exist: chroma and chord scores in M3, onsets in M2.
export const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
export const TARGET_PITCH_CLASSES = [7, 11, 2] // G major
export const TARGET_NAME = 'G'
export const GRID_SLOTS = 16

const ONSET_OFFSETS_MS = [-12, 8, -40, 22, 5, -8, 31, -15, 14, -4]
const ONSET_SLOTS = [0, 2, 3, 5, 6, 7, 8, 10, 11, 13]
const CHORD_BASELINES: [string, number][] = [['G', 0.86], ['C', 0.61], ['D', 0.55], ['Em', 0.68]]

export function readSignal(t: number) {
  return {
    t,
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
