import { useCallback, useEffect, useRef, useState } from 'react'
import { CHORD } from '../config/thresholds'
import { BarChecker, type Song } from '../engine/curriculum'
import { getProgress, updateBpm, useProgress } from '../store/progress'
import type { ChordShape } from './chord'
import { audioUnlocked } from './mic'
import { useChordCheck } from './useChordCheck'
import { useMetronome } from './useMetronome'
import { useMic } from './useMic'

const SLOTS_PER_BEAT = 2
const BEATS_PER_BAR = 4
const SLOW = 0.75

export function useSong({ song, chords, active, held, noMic }: {
  song: Song
  chords: Record<string, ChordShape>
  active: boolean
  held: boolean
  noMic: boolean
}) {
  const key = `song:${song.id}`
  const base = useProgress().settings.bpmByPattern[key] ?? song.bpm
  const [slow, setSlow] = useState(false)
  // Without an earlier mic step audio isn't unlocked yet, so it starts on the first tap.
  const [paused, setPaused] = useState(() => noMic && !audioUnlocked())
  const [run, setRun] = useState(1)
  const [finished, setFinished] = useState(false)
  const [clean, setClean] = useState<number[]>([])
  const bpm = Math.round(base * (slow ? SLOW : 1))

  const mic = useMic({ active: active && !noMic, chroma: true })
  const micReady = noMic || !['idle', 'starting'].includes(mic.reading.status)
  const { slot, running, start, stop } = useMetronome({ bpm })

  const beats = Math.max(0, Math.floor(slot / SLOTS_PER_BEAT))
  const bar = Math.min(song.bars.length - 1, Math.floor(beats / BEATS_PER_BAR))
  const beat = beats % BEATS_PER_BAR
  const check = useChordCheck(mic.reading, { target: song.bars[bar], chords })
  const checker = useRef(new BarChecker(CHORD.stableChangeMs))

  useEffect(() => {
    if (running) checker.current.update(bar, beat, check.close, performance.now())
  }, [running, bar, beat, check])

  const resting = !active || paused || held || finished
  useEffect(() => {
    if (micReady && !resting && !running) start()
    if (resting && running) stop()
  }, [micReady, resting, running, start, stop])

  useEffect(() => {
    if (slot >= song.bars.length * BEATS_PER_BAR * SLOTS_PER_BEAT) {
      setClean([...checker.current.clean])
      setFinished(true)
    }
  }, [slot, song])

  const again = useCallback(() => {
    checker.current = new BarChecker(CHORD.stableChangeMs)
    setRun((r) => r + 1)
    setClean([])
    setFinished(false)
    setPaused(false)
  }, [])

  const stepBpm = (delta: number) => {
    const current = getProgress().settings.bpmByPattern[key] ?? song.bpm
    updateBpm(key, Math.min(160, Math.max(40, current + delta)))
  }

  return {
    mic,
    micReady,
    bar,
    beat,
    running,
    paused,
    togglePause: () => setPaused(!paused),
    slow,
    setSlow,
    bpm,
    stepBpm,
    run,
    finished,
    clean,
    again,
  }
}
