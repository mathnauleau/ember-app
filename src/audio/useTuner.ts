import { useEffect, useMemo, useRef, useState } from 'react'
import { rangeFor, TunerTracker, type TunerView } from './tuner'
import { useMic } from './useMic'

const INITIAL: TunerView = { active: 0, cents: 0, signal: false, inTune: false, done: [] }

export function useTuner({ lock, active }: { lock: number | null; active: boolean }) {
  const range = useMemo(() => rangeFor(lock), [lock])
  const mic = useMic({ active, range })
  const tracker = useRef(new TunerTracker())
  const [view, setView] = useState(INITIAL)

  useEffect(() => {
    setView(tracker.current.update(mic.reading.hz, performance.now(), lock))
  }, [mic.reading, lock])

  return { ...view, mic }
}
