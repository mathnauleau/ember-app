import { useEffect, useState } from 'react'

// Seconds left, counting only while running. Display only, never used for audio timing.
export function useStepTimer(seconds: number, running: boolean) {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    if (!running || left === 0) return
    const id = setTimeout(() => setLeft(left - 1), 1000)
    return () => clearTimeout(id)
  }, [left, running])

  return { left, extend: setLeft }
}
