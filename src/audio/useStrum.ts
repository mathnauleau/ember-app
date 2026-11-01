import { useCallback, useEffect, useRef, useState } from 'react'
import { getProgress, updateBpm, useProgress } from '../store/progress'
import { SLOTS_PER_BAR } from './metronome'
import { barVerdict, bpmFromTaps, matchOnsets, type GridSlot, type Onset, type Verdict } from './strumTiming'
import { strum } from './synth'
import { audioUnlocked } from './mic'
import { useMetronome, type SlotRecord } from './useMetronome'
import { useMic } from './useMic'

export type StrumPattern = { id: string; name: string; level: number; bpm: number; slots: string[] }
export type StrumPhase = 'listen' | 'play'

const LISTEN_BARS = 2
const TAP_WINDOW_MS = 3000
const MAX_TAPS = 5

export function useStrum({ pattern, frets, active, held, noMic }: {
  pattern: StrumPattern
  frets: number[]
  active: boolean
  held: boolean // pause dialog open: the click rests, the mic stays on
  noMic: boolean // practising without listening: the pattern plays, with no timing feedback
}) {
  const { settings, thresholds } = useProgress()
  const bpm = settings.bpmByPattern[pattern.id] ?? pattern.bpm
  const onsets = useRef<Onset[]>([])
  const mic = useMic({ active: active && !noMic, onOnset: (onset) => onsets.current.push(onset) })
  const [phase, setPhaseState] = useState<StrumPhase>('listen')
  const [feedback, setFeedback] = useState<Verdict | 'thin' | null>(null)
  // Without an earlier mic step audio isn't unlocked yet, so it starts on the first tap.
  const [paused, setPaused] = useState(() => noMic && !audioUnlocked())
  const [listenBar, setListenBar] = useState(1)
  const phaseRef = useRef<StrumPhase>('listen')
  const listenFrom = useRef(0)
  const playFrom = useRef<number | null>(null)
  const taps = useRef<number[]>([])
  const bars = useRef({ onTime: 0, total: 0 })

  const onSlot = useCallback(
    ({ index, time }: SlotRecord, context: AudioContext) => {
      const position = index % SLOTS_PER_BAR
      if (phaseRef.current === 'listen') {
        const played = index - listenFrom.current
        if (position === 0 && played >= LISTEN_BARS * SLOTS_PER_BAR) {
          phaseRef.current = 'play'
          playFrom.current = index
          setPhaseState('play')
        } else {
          if (position === 0) setListenBar(played / SLOTS_PER_BAR + 1)
          const stroke = pattern.slots[position]
          if (stroke === 'D' || stroke === 'U') strum(context, frets, time, stroke)
        }
      }
      if (phaseRef.current === 'play' && playFrom.current === null) playFrom.current = index
    },
    [frets, pattern],
  )

  const metronome = useMetronome({ bpm, onSlot })
  const { slot, running, slots, start, stop } = metronome
  const micReady = noMic || !['idle', 'starting'].includes(mic.reading.status)
  const latencyS = useRef(0)
  latencyS.current = mic.reading.latencyMs / 1000

  const setPhase = (next: StrumPhase) => {
    phaseRef.current = next
    setPhaseState(next)
    setFeedback(null)
    playFrom.current = null
    // Listening starts on the next bar line.
    listenFrom.current = Math.ceil((Math.max(slot, 0) + 1) / SLOTS_PER_BAR) * SLOTS_PER_BAR
    setListenBar(1)
  }

  useEffect(() => {
    const resting = !active || paused || held
    if (micReady && !resting && !running) start()
    if (resting && running) stop()
  }, [active, micReady, paused, held, running, start, stop])

  // One eighth into each bar, every strum of the last bar has landed.
  useEffect(() => {
    if (slot < 0 || slot % SLOTS_PER_BAR !== 1 || playFrom.current === null) return
    const barStart = slot - 1 - SLOTS_PER_BAR
    if (barStart < playFrom.current) return

    const bar = slots.current.filter((s) => s.index >= barStart && s.index < barStart + SLOTS_PER_BAR)
    if (bar.length < SLOTS_PER_BAR) return
    const grid: GridSlot[] = bar.map((s) => ({
      time: s.time,
      strum: pattern.slots[s.index % SLOTS_PER_BAR] !== '_',
      click: s.index % 2 === 0,
    }))
    const eighthS = bar[0].eighthS
    const inBar = onsets.current.filter((o) => o.time >= bar[0].time - eighthS && o.time < bar[bar.length - 1].time + eighthS * 2)
    const offsets = matchOnsets(inBar, grid, {
      eighthS,
      latencyS: latencyS.current,
      offsetS: (getProgress().settings.latencyOffsetMs ?? 0) / 1000,
    })
    const verdict = barVerdict(offsets, thresholds.onTime)?.verdict
    if (verdict) bars.current = { onTime: bars.current.onTime + (verdict === 'on' ? 1 : 0), total: bars.current.total + 1 }
    setFeedback(verdict ?? 'thin')
    onsets.current = onsets.current.filter((o) => o.time >= bar[bar.length - 1].time)
  }, [slot, slots, pattern, thresholds.onTime])

  const setBpm = (next: number) => updateBpm(pattern.id, Math.min(160, Math.max(40, next)))

  // Reads the stored value, so quick taps each count even before the screen has updated.
  const stepBpm = (delta: number) => setBpm((getProgress().settings.bpmByPattern[pattern.id] ?? pattern.bpm) + delta)

  const tap = () => {
    const now = Date.now()
    taps.current = [...taps.current, now].filter((t) => now - t < TAP_WINDOW_MS).slice(-MAX_TAPS)
    const tapped = bpmFromTaps(taps.current)
    if (tapped !== null) setBpm(tapped)
  }

  const togglePause = () => {
    setFeedback(null)
    playFrom.current = null
    setPaused(!paused)
  }

  return {
    mic,
    bpm,
    phase,
    setPhase,
    paused,
    togglePause,
    stepBpm,
    tap,
    feedback,
    bars,
    listenBar,
    position: running && slot >= 0 ? slot % SLOTS_PER_BAR : 2,
    micReady,
  }
}
