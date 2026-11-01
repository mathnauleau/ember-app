import { useEffect, useState } from 'react'
import { audioUnlocked } from '../../audio/mic'
import { useMetronome } from '../../audio/useMetronome'
import { useStepTimer } from '../../audio/useStepTimer'
import { walkFor, warmupsFor } from '../../engine/curriculum'
import { today } from '../../lib/dates'
import { getProgress, updateBpm, useProgress } from '../../store/progress'
import { SessionShell } from '../SessionShell'
import { Warmup } from '../Warmup'
import { finishedLogs, type StepContext } from './context'
import { TimeUp } from './TimeUp'

const RESTING_POSITION = 6
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function WarmupStep({ context }: { context: StepContext }) {
  const total = context.minutes * 60
  const exercises = warmupsFor(today())
  const [held, setHeld] = useState(false)
  // Without an earlier mic step audio isn't unlocked yet, so it starts on the first tap.
  const [paused, setPaused] = useState(() => !audioUnlocked())
  const [timedOut, setTimedOut] = useState(false)
  const { left, extend } = useStepTimer(total, !held && !paused && !timedOut)
  if (left === 0 && !timedOut) setTimedOut(true)

  const number = left > total / 2 ? 0 : 1
  const exercise = exercises[number]
  const walk = walkFor(exercise)
  const stored = useProgress().settings.bpmByPattern[exercise.id]
  const bpm = stored ?? exercise.bpm
  const { slot, running, start, stop } = useMetronome({ bpm })

  const resting = paused || held || timedOut
  useEffect(() => {
    if (!resting && !running) start()
    if (resting && running) stop()
  }, [resting, running, start, stop])

  const position = running && slot >= 0 ? Math.floor(slot / 2) % walk.length : RESTING_POSITION

  return (
    <SessionShell
      step="Warm-up"
      stepNumber={context.stepNumber}
      totalSteps={context.totalSteps}
      phase={timedOut ? 'Complete' : paused ? 'Paused' : exercise.name}
      time={clock(left)}
      timeMuted={timedOut}
      logs={finishedLogs(context, timedOut)}
      nextLabel={timedOut ? context.nextName : 'Done'}
      nextIcon={timedOut ? 'arrow' : 'check'}
      background="centered"
      onPauseChange={setHeld}
      onLeave={context.onLeave}
      onSkip={context.onSkip}
      onNext={context.onDone}
    >
      {timedOut ? (
        <TimeUp
          title="That's the warm-up for tonight."
          summary="Your fingers are awake. The log is on the fire."
          nextStep={context.nextName}
          onAdvance={context.onDone}
          onExtend={() => {
            extend(60)
            setTimedOut(false)
          }}
        />
      ) : (
        <Warmup
          exercise={exercise}
          exerciseNumber={number + 1}
          walk={walk}
          position={position}
          bpm={bpm}
          paused={!running}
          onBpmStep={(delta) => {
            const current = getProgress().settings.bpmByPattern[exercise.id] ?? exercise.bpm
            updateBpm(exercise.id, Math.min(160, Math.max(40, current + delta)))
          }}
          onTogglePause={() => setPaused(!paused)}
        />
      )}
    </SessionShell>
  )
}
