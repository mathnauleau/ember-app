import { useEffect, useSyncExternalStore } from 'react'
import { getProgress, useProgress } from '../store/progress'
import { micListening, subscribeMicListening, unlockAudio } from './mic'
import { setCrackle } from './crackle'

export const useMicListening = () => useSyncExternalStore(subscribeMicListening, micListening)

// Runs for the whole app. Rests while the mic is open: pops from the speaker would read as strums.
export function useCrackle() {
  const { sound } = useProgress().settings
  const listening = useMicListening()
  const audible = sound && !listening

  useEffect(() => {
    const apply = () => setCrackle(audible && document.visibilityState === 'visible')
    // Bubbles up after the toggle's own handler, so turning it on counts as the unlocking tap.
    const tapped = () => {
      if (getProgress().settings.sound) unlockAudio()
      apply()
    }
    apply()
    document.addEventListener('visibilitychange', apply)
    window.addEventListener('touchend', tapped)
    window.addEventListener('click', tapped)
    return () => {
      document.removeEventListener('visibilitychange', apply)
      window.removeEventListener('touchend', tapped)
      window.removeEventListener('click', tapped)
    }
  }, [audible])
}
