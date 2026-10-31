import { useEffect, useRef, useState } from 'react'

export const CALIBRATION_BEATS = 8
const BEAT_MS = 1000 // 60 bpm

// Placeholder until M2: the design's sample result. Replace with the median onset
// offset from the metronome + onset worklet. No sound is played or heard yet.
const SIMULATED_OFFSET_MS = 41

export type Calibration =
  | { phase: 'idle' }
  | { phase: 'running'; beat: number; flash: boolean }
  | { phase: 'done'; offsetMs: number }

export function useCalibration() {
  const [state, setState] = useState<Calibration>({ phase: 'idle' })
  const frame = useRef(0)

  const stop = () => cancelAnimationFrame(frame.current)
  useEffect(() => stop, [])

  const start = () => {
    stop()
    const startedAt = performance.now()
    const tick = (now: number) => {
      const beats = (now - startedAt) / BEAT_MS
      if (beats >= CALIBRATION_BEATS) {
        setState({ phase: 'done', offsetMs: SIMULATED_OFFSET_MS })
        return
      }
      const beat = Math.max(0, Math.floor(beats))
      setState({ phase: 'running', beat, flash: beats - beat < 0.25 })
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }

  return { state, start }
}
