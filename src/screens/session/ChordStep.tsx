import { useEffect, useMemo, useState } from 'react'
import { useChordDrill } from '../../audio/useChordDrill'
import { useStepTimer } from '../../audio/useStepTimer'
import chords from '../../data/chords.json'
import { drillPair, learnedChords } from '../../engine/curriculum'
import { useProgress } from '../../store/progress'
import { ChangePhase, HoldPhase, type DrillChord } from '../ChordDrill'
import { SessionShell } from '../SessionShell'
import { finishedLogs, type StepContext } from './context'
import { MicPermission } from './MicPermission'
import { NoMicDrill } from './NoMicDrill'
import { StepDone } from './StepDone'
import { TimeUp } from './TimeUp'

const library = chords as Record<string, DrillChord>
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function ChordStep({ context, pair }: { context: StepContext; pair?: string[] }) {
  const { learnedCount, setPasses } = useProgress()
  // Fixed for the whole step, so a pass partway through doesn't swap the chords mid-drill.
  const [[first, second]] = useState(() => pair ?? drillPair(learnedCount, setPasses))
  const rivals = useMemo(
    () => Object.fromEntries([...new Set([first, second, ...learnedChords(learnedCount)])].map((n) => [n, library[n]])),
    [first, second, learnedCount],
  )
  const [paused, setPaused] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const drill = useChordDrill({ first, second, chords: rivals, active: !timedOut && !context.noMic })
  const done = drill.phase === 'done'
  const { left, extend } = useStepTimer(context.minutes * 60, (drill.micReady || context.noMic) && !paused && !timedOut && !done)
  if (left === 0 && !timedOut) setTimedOut(true)

  const { onPass } = context
  const held = drill.check.held
  useEffect(() => {
    if (held) onPass?.(first)
  }, [held, first, onPass])

  const ended = done || timedOut

  return (
    <SessionShell
      step="Chord drill"
      stepNumber={context.stepNumber}
      totalSteps={context.totalSteps}
      phase={ended ? 'Complete' : context.noMic ? 'No mic' : drill.phase === 'hold' ? 'Hold the shape' : 'Changes'}
      time={clock(done ? 0 : left)}
      timeMuted={timedOut}
      logs={finishedLogs(context, ended)}
      nextLabel={ended ? context.nextName : 'Next'}
      background="drill"
      onPauseChange={setPaused}
      onLeave={context.onLeave}
      onSkip={context.onSkip}
      onNext={ended || context.noMic ? context.onDone : drill.advance}
    >
      {done ? (
        <StepDone title="Chord drill done." summary="Another log on the fire." nextStep={context.nextName} onAdvance={context.onDone} />
      ) : timedOut ? (
        <TimeUp
          title="That's the chord drill for tonight."
          summary={`Five minutes with ${first} and ${second}. The log is on the fire.`}
          nextStep={context.nextName}
          onAdvance={context.onDone}
          onExtend={() => {
            extend(60)
            setTimedOut(false)
          }}
        />
      ) : context.noMic ? (
        <NoMicDrill chord={library[first]} onListen={() => context.onNoMic(false)} />
      ) : !drill.micReady ? (
        <MicPermission
          kicker="Before we play"
          error={drill.mic.error}
          starting={drill.mic.reading.status === 'starting'}
          onAllow={drill.mic.start}
          onWithout={() => context.onNoMic(true)}
        />
      ) : drill.phase === 'hold' ? (
        <HoldPhase label={first} chord={library[first]} mode={drill.check.mode} hold={drill.check.hold} />
      ) : (
        <ChangePhase
          first={first}
          second={second}
          firstChord={library[first]}
          secondChord={library[second]}
          onSecond={drill.onSecond}
          close={drill.check.close}
          beat={drill.beat}
          changes={drill.changes}
          drillLeft={drill.drillLeft}
        />
      )}
    </SessionShell>
  )
}
