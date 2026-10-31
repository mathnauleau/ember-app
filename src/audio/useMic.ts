import { useCallback, useEffect, useRef, useState } from 'react'
import { getProgress } from '../store/progress'
import { audioUnlocked, IDLE_READING, micErrorMessage, startMic, unlockAudio, type MicReading } from './mic'
import { FULL_RANGE } from './tuner'

// Releases the mic whenever `active` goes false or the screen unmounts.
export function useMic({ active = true, range = FULL_RANGE } = {}) {
  const [reading, setReading] = useState<MicReading>(IDLE_READING)
  const [error, setError] = useState<string | null>(null)
  const stopMic = useRef<(() => void) | null>(null)
  const session = useRef(0)
  const rangeRef = useRef(range)
  rangeRef.current = range

  const stop = useCallback(() => {
    session.current += 1
    stopMic.current?.()
    stopMic.current = null
    setReading(IDLE_READING)
  }, [])

  const open = useCallback(async () => {
    const id = ++session.current
    setError(null)
    setReading({ ...IDLE_READING, status: 'starting' })
    try {
      const release = await startMic({
        getConfig: () => {
          const { floor, noisy } = getProgress().thresholds
          return { silentDb: floor, noisyDb: noisy, ...rangeRef.current }
        },
        onReading: (next) => {
          if (id === session.current) setReading(next)
        },
        onStopped: () => {
          stop()
          setError('The mic stopped. Tap to start it again.')
        },
      })
      // The screen may have gone away while the permission prompt was open.
      if (id === session.current) stopMic.current = release
      else release()
    } catch (e) {
      if (id !== session.current) return
      setReading(IDLE_READING)
      setError(micErrorMessage(e))
    }
  }, [stop])

  // Call from a tap: iOS only unlocks audio inside a user gesture.
  const start = useCallback(() => {
    unlockAudio()
    void open()
  }, [open])

  useEffect(() => {
    if (active && audioUnlocked()) void open()
    return stop
  }, [active, open, stop])

  return { reading, error, start }
}
