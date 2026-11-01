import { useState } from 'react'
import { useStepTimer } from '../../audio/useStepTimer'
import { Fretboard, type FretDot } from '../../components/Fretboard'
import { theoryCard } from '../../engine/curriculum'
import { today } from '../../lib/dates'
import { useProgress } from '../../store/progress'
import { markTheorySeen } from '../../store/session'
import { SessionShell } from '../SessionShell'
import { finishedLogs, type StepContext } from './context'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function TheoryStep({ context }: { context: StepContext }) {
  const card = theoryCard(useProgress(), today())
  const [paused, setPaused] = useState(false)
  const { left } = useStepTimer(context.minutes * 60, !paused)

  const gotIt = () => {
    markTheorySeen()
    context.onDone()
  }

  return (
    <SessionShell
      step="Theory card"
      stepNumber={context.stepNumber}
      totalSteps={context.totalSteps}
      phase="One idea"
      time={clock(left)}
      logs={finishedLogs(context, false)}
      nextLabel="Got it"
      nextIcon="check"
      background="centered"
      onPauseChange={setPaused}
      onLeave={context.onLeave}
      onSkip={context.onSkip}
      onNext={gotIt}
    >
      <div className="stage stage-theory">
        <span className="kicker">Theory card · 30 seconds</span>
        <h1 className="title-theory">{card.title}</h1>
        <div className="theory-row">
          {card.dots.length > 0 && (
            <div className="theory-board">
              <Fretboard width={520} frets={3} dots={card.dots as FretDot[]} />
            </div>
          )}
          <div className="theory-notes">
            {card.notes.map((note, i) => (
              <span key={i} className="theory-note-wrap">
                {i > 0 && <span className="theory-plus">+</span>}
                <span className="theory-note">{note}</span>
              </span>
            ))}
          </div>
        </div>
        <p className="lede lede-lg">{card.caption}</p>
      </div>
    </SessionShell>
  )
}
