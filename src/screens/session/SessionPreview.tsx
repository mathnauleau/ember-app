import { useCallback, useEffect, useState } from 'react'
import chords from '../../data/chords.json'
import { saveSession, type SavedSession } from '../../store/progress'
import { SessionShell } from '../SessionShell'
import { NoMicDrill } from './NoMicDrill'
import { TimeUp } from './TimeUp'

// Stand-in for the session engine (M4): sample data, enough to walk the edge states.
export const PREVIEW_SESSION: SavedSession = { logsDone: 2, totalSteps: 6, nextStep: 'Chord drill', minutesLeft: 9 }
const NO_MIC_SECONDS = 168

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function SessionPreview({ start, go }: { start: 'time-up' | 'no-mic'; go: (route: string) => void }) {
  const [secondsLeft, setSecondsLeft] = useState(start === 'no-mic' ? NO_MIC_SECONDS : 0)
  const timeUp = secondsLeft === 0

  useEffect(() => {
    if (timeUp) return
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [timeUp])

  const finish = useCallback(() => {
    saveSession(null)
    go('/')
  }, [go])

  const pause = () => {
    saveSession(PREVIEW_SESSION)
    go('/')
  }

  return (
    <SessionShell
      step="Chord drill"
      stepNumber={3}
      totalSteps={PREVIEW_SESSION.totalSteps}
      phase={timeUp ? 'Complete' : 'No mic'}
      time={clock(secondsLeft)}
      timeMuted={timeUp}
      logsDone={timeUp ? 3 : 2}
      logsLit={timeUp ? 0 : 1}
      nextLabel={timeUp ? 'Strum pattern' : 'Next'}
      onPause={pause}
      onSkip={finish}
      onNext={finish}
    >
      {timeUp ? (
        <TimeUp
          title="That's the chord drill for tonight."
          summary="Five minutes with G and C. The log is on the fire."
          nextStep="Strum pattern"
          onAdvance={finish}
          onExtend={() => setSecondsLeft(60)}
        />
      ) : (
        <NoMicDrill chord={chords.G} />
      )}
    </SessionShell>
  )
}
