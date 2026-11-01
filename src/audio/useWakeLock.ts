import { useEffect } from 'react'

// Keeps the screen on while `enabled`, where Safari allows it. iOS drops the lock when the app is hidden.
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let released = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (released) void next.release()
        else lock = next
      } catch {
        // Refused, for example in Low Power Mode: the session carries on without it.
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release()
    }
  }, [enabled])
}
