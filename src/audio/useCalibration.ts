import { useCallback, useEffect, useRef, useState } from 'react'
import { TIMING } from '../config/thresholds'
import { median } from './pitch'
import type { Onset } from './strumTiming'
import { useMetronome } from './useMetronome'
import { useMic } from './useMic'

export const CALIBRATION_BEATS = 8
const CALIBRATION_BPM = 60

export type Calibration =
  | { phase: 'idle' }
  | { phase: 'running'; beat: number; flash: boolean }
  | { phase: 'done'; offsetMs: number }
  | { phase: 'failed' }

export function useCalibration() {
  const onsets = useRef<Onset[]>([])
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'running' | 'finished'>('idle')
  const [result, setResult] = useState<number | null>(null)
  const mic = useMic({ active: false, onOnset: (onset) => onsets.current.push(onset) })
  const { slot, slots, start: startClick, stop: stopClick } = useMetronome({ bpm: CALIBRATION_BPM })
  const micReady = !['idle', 'starting'].includes(mic.reading.status)
  const latencyS = useRef(0)
  latencyS.current = mic.reading.latencyMs / 1000

  const { start: startMic, stop: stopMic } = mic

  const start = useCallback(() => {
    onsets.current = []
    setResult(null)
    setPhase('waiting')
    startMic()
  }, [startMic])

  useEffect(() => {
    if (phase === 'waiting' && mic.error) setPhase('idle')
    if (phase === 'waiting' && micReady) {
      startClick()
      setPhase('running')
    }
  }, [phase, micReady, mic.error, startClick])

  // One eighth past the last beat, every strum has landed.
  useEffect(() => {
    if (phase !== 'running' || slot < CALIBRATION_BEATS * 2 + 1) return
    const beats = slots.current.filter((s) => s.index % 2 === 0 && s.index < CALIBRATION_BEATS * 2)
    const offsets: number[] = []
    for (const beat of beats) {
      // A strum is louder than any click leak, so the strongest onset near each beat wins.
      const near = onsets.current.filter((o) => Math.abs(o.time - beat.time - latencyS.current) <= beat.eighthS)
      if (!near.length) continue
      const strongest = near.reduce((a, b) => (b.strength > a.strength ? b : a))
      offsets.push((strongest.time - beat.time - latencyS.current) * 1000)
    }
    stopClick()
    stopMic()
    setResult(offsets.length >= TIMING.minMatched ? Math.round(median(offsets)) : null)
    setPhase('finished')
  }, [phase, slot, slots, stopClick, stopMic])

  const reset = () => setPhase('idle')

  const state: Calibration =
    phase === 'finished'
      ? result === null
        ? { phase: 'failed' }
        : { phase: 'done', offsetMs: result }
      : phase === 'running' && slot >= 0
        ? { phase: 'running', beat: Math.min(CALIBRATION_BEATS - 1, Math.floor(slot / 2)), flash: slot % 2 === 0 }
        : { phase: 'idle' }

  return { state, start, reset, error: mic.error, waiting: phase === 'waiting' || (phase === 'running' && slot < 0) }
}
