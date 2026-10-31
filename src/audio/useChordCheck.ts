import { useEffect, useRef, useState } from 'react'
import { useProgress } from '../store/progress'
import { ChordTracker, isCloseEnough, scoreChords, type ChordMode, type ChordShape } from './chord'
import type { MicReading } from './mic'

export type ChordCheck = {
  scores: Record<string, number>
  lead: number
  close: boolean
  mode: ChordMode
  hold: number
  held: boolean
}

const INITIAL: ChordCheck = { scores: {}, lead: 0, close: false, mode: 'listening', hold: 0, held: false }

export function useChordCheck(reading: MicReading, { target, chords }: { target: string; chords: Record<string, ChordShape> }) {
  const { close: closeAt, margin } = useProgress().thresholds
  const tracker = useRef<ChordTracker | null>(null)
  const [check, setCheck] = useState(INITIAL)
  const { chroma, status } = reading

  useEffect(() => {
    if (!chroma) return
    const now = performance.now()
    tracker.current ??= new ChordTracker(now)
    const scores = scoreChords(chroma, chords)
    const { close, lead } = isCloseEnough(scores, target, closeAt, margin)
    const sounding = status === 'listening' || status === 'noisy'
    const mode = tracker.current.update({ close, sounding, noisy: status === 'noisy', now })
    setCheck({ scores, lead, close: close && sounding, mode, hold: tracker.current.hold, held: tracker.current.held })
  }, [chroma, status, target, chords, closeAt, margin])

  return check
}
