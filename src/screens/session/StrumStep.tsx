import { useState } from 'react'
import { useStepTimer } from '../../audio/useStepTimer'
import { useStrum } from '../../audio/useStrum'
import chords from '../../data/chords.json'
import patterns from '../../data/patterns.json'
import { drillPair, patternFor } from '../../engine/curriculum'
import { useProgress } from '../../store/progress'
import { SessionShell } from '../SessionShell'
import { Strum } from '../Strum'
import { finishedLogs, type StepContext } from './context'
import { MicPermission } from './MicPermission'
import { TimeUp } from './TimeUp'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function StrumStep({ context, patternId }: { context: StepContext; patternId?: string }) {
  const { patternLevel, learnedCount, setPasses } = useProgress()
  const [pattern] = useState(() => patterns.find((p) => p.id === patternId) ?? patternFor(patternLevel))
  const [chord] = useState(() => drillPair(learnedCount, setPasses)[0] as keyof typeof chords)
  const [paused, setPaused] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const strum = useStrum({ pattern, frets: chords[chord].frets, active: !timedOut, held: paused, noMic: context.noMic })
  const { left, extend } = useStepTimer(context.minutes * 60, strum.micReady && !paused && !timedOut)
  if (left === 0 && !timedOut) setTimedOut(true)

  const needsMic = !strum.micReady

  const finish = () => {
    context.onStrum?.(strum.bars.current.onTime, strum.bars.current.total)
    context.onDone()
  }

  return (
    <SessionShell
      step="Strum pattern"
      stepNumber={context.stepNumber}
      totalSteps={context.totalSteps}
      phase={timedOut ? 'Complete' : strum.phase === 'listen' ? 'Listen' : 'Play'}
      time={clock(left)}
      timeMuted={timedOut}
      logs={finishedLogs(context, timedOut)}
      nextLabel={timedOut ? context.nextName : 'Next'}
      background="centered"
      onPauseChange={setPaused}
      onLeave={context.onLeave}
      onSkip={context.onSkip}
      onNext={finish}
    >
      {timedOut ? (
        <TimeUp
          title="That's the strumming for tonight."
          summary="The log is on the fire."
          nextStep={context.nextName}
          onAdvance={finish}
          onExtend={() => {
            extend(60)
            setTimedOut(false)
          }}
        />
      ) : needsMic ? (
        <MicPermission
          kicker="Before we strum"
          error={strum.mic.error}
          starting={strum.mic.reading.status === 'starting'}
          onAllow={strum.mic.start}
          onWithout={() => context.onNoMic(true)}
        />
      ) : (
        <Strum
          pattern={pattern}
          phase={strum.phase}
          onPhase={strum.setPhase}
          position={strum.position}
          bpm={strum.bpm}
          onBpmStep={strum.stepBpm}
          paused={strum.paused}
          onTogglePause={strum.togglePause}
          onTap={strum.tap}
          feedback={strum.feedback}
          listenBar={strum.listenBar}
          micStalled={strum.mic.reading.status === 'stalled'}
        />
      )}
    </SessionShell>
  )
}
