import { useEffect, useRef, useState } from 'react'
import { ChangeCounter, type ChordShape } from './chord'
import { useChordCheck } from './useChordCheck'
import { useMetronome } from './useMetronome'
import { useMic } from './useMic'

export type DrillPhase = 'hold' | 'changes' | 'done'

const CHANGE_BPM = 60
const CHANGE_SECONDS = 60
const SLOTS_PER_BEAT = 2
const BEATS_PER_BAR = 4

export function useChordDrill({ first, second, chords, active }: {
  first: string
  second: string
  chords: Record<string, ChordShape>
  active: boolean
}) {
  const [phase, setPhase] = useState<DrillPhase>('hold')
  const [changes, setChanges] = useState(0)
  const mic = useMic({ active: active && phase !== 'done', chroma: true })
  const { slot, start, stop, running } = useMetronome({ bpm: CHANGE_BPM })

  const beats = Math.max(0, Math.floor(slot / SLOTS_PER_BEAT))
  const bar = Math.floor(beats / BEATS_PER_BAR)
  const onSecond = phase === 'changes' && bar % 2 === 1
  const target = onSecond ? second : first
  const check = useChordCheck(mic.reading, { target, chords })
  const counter = useRef(new ChangeCounter())
  const micReady = !['idle', 'starting'].includes(mic.reading.status)

  useEffect(() => {
    if (phase === 'hold' && check.held) setPhase('changes')
  }, [phase, check.held])

  useEffect(() => {
    if (phase === 'changes' && micReady && active && !running) start()
    if ((phase !== 'changes' || !active) && running) stop()
  }, [phase, micReady, active, running, start, stop])

  const drillLeft = Math.max(0, CHANGE_SECONDS - beats)
  useEffect(() => {
    if (phase === 'changes' && running && drillLeft === 0) setPhase('done')
  }, [phase, running, drillLeft])

  useEffect(() => {
    if (phase === 'changes' && running) setChanges(counter.current.update(target, check.close, performance.now()))
  }, [phase, running, target, check])

  const advance = () => setPhase(phase === 'hold' ? 'changes' : 'done')

  return {
    mic,
    micReady,
    phase,
    advance,
    target,
    check,
    beat: beats % BEATS_PER_BAR,
    onSecond,
    changes,
    drillLeft,
  }
}
