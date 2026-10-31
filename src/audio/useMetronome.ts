import { useCallback, useEffect, useRef, useState } from 'react'
import { getProgress } from '../store/progress'
import { Metronome } from './metronome'
import { unlockAudio } from './mic'

export type SlotRecord = { index: number; time: number; eighthS: number }

const HISTORY = 64

export function useMetronome({ bpm, onSlot }: { bpm: number; onSlot?: (slot: SlotRecord, context: AudioContext) => void }) {
  const [slot, setSlot] = useState(-1)
  const [running, setRunning] = useState(false)
  const metronome = useRef<Metronome | null>(null)
  const slots = useRef<SlotRecord[]>([])
  const frame = useRef(0)
  const onSlotRef = useRef(onSlot)
  onSlotRef.current = onSlot

  const stop = useCallback(() => {
    metronome.current?.stop()
    metronome.current = null
    cancelAnimationFrame(frame.current)
    setRunning(false)
    setSlot(-1)
  }, [])

  const start = useCallback(() => {
    stop()
    const context = unlockAudio()
    slots.current = []
    const clicks = new Metronome(context, {
      bpm,
      volume: getProgress().settings.clickVolume / 100,
      onSlot: (index, time, eighthS) => {
        const record = { index, time, eighthS }
        slots.current = [...slots.current.slice(-HISTORY + 1), record]
        onSlotRef.current?.(record, context)
      },
    })
    metronome.current = clicks
    clicks.start()
    setRunning(true)

    // The highlight reads the audio clock, so it can't drift from what is heard.
    const draw = () => {
      const now = context.currentTime
      const current = [...slots.current].reverse().find((s) => s.time <= now)
      if (current) setSlot(current.index)
      frame.current = requestAnimationFrame(draw)
    }
    frame.current = requestAnimationFrame(draw)
  }, [bpm, stop])

  useEffect(() => {
    metronome.current?.setBpm(bpm)
  }, [bpm])

  useEffect(() => stop, [stop])

  return { slot, running, slots, start, stop }
}
