import { useCallback, useMemo, useState } from 'react'
import { useChordDrill } from '../../audio/useChordDrill'
import { useStepTimer } from '../../audio/useStepTimer'
import chords from '../../data/chords.json'
import curriculum from '../../data/curriculum.json'
import { ChangePhase, HoldPhase, type DrillChord } from '../ChordDrill'
import { SessionShell } from '../SessionShell'
import { MicPermission } from './MicPermission'
import { StepDone } from './StepDone'
import { TimeUp } from './TimeUp'

const STEP_SECONDS = 300
const TOTAL_STEPS = 6
const NEXT_STEP = 'Strum pattern' // the session engine (M4) will supply this
const LOGS_BEFORE = 2

const library = chords as Record<string, DrillChord>
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function ChordStep({ go, pair }: { go: (route: string) => void; pair?: string[] }) {
  const [first, second] = pair ?? curriculum.chordOrder
  const rivals = useMemo(
    () => Object.fromEntries([...new Set([first, second, ...curriculum.chordOrder.slice(0, curriculum.learned)])].map((n) => [n, library[n]])),
    [first, second],
  )
  const [paused, setPaused] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const drill = useChordDrill({ first, second, chords: rivals, active: !timedOut })
  const done = drill.phase === 'done'
  const { left, extend } = useStepTimer(STEP_SECONDS, drill.micReady && !paused && !timedOut && !done)
  if (left === 0 && !timedOut) setTimedOut(true)

  const leave = useCallback(() => go('/'), [go])
  const ended = done || timedOut

  return (
    <SessionShell
      step="Chord drill"
      stepNumber={3}
      totalSteps={TOTAL_STEPS}
      phase={ended ? 'Complete' : drill.phase === 'hold' ? 'Hold the shape' : 'Changes'}
      time={clock(done ? 0 : left)}
      timeMuted={timedOut}
      logsDone={ended ? LOGS_BEFORE + 1 : LOGS_BEFORE}
      logsLit={ended ? 0 : 1}
      nextLabel={ended ? NEXT_STEP : 'Next'}
      background="drill"
      onPauseChange={setPaused}
      onLeave={leave}
      onSkip={leave}
      onNext={ended ? leave : drill.advance}
    >
      {done ? (
        <StepDone title="Chord drill done." summary="Another log on the fire." nextStep={NEXT_STEP} onAdvance={leave} />
      ) : timedOut ? (
        <TimeUp
          title="That's the chord drill for tonight."
          summary={`Five minutes with ${first} and ${second}. The log is on the fire.`}
          nextStep={NEXT_STEP}
          onAdvance={leave}
          onExtend={() => {
            extend(60)
            setTimedOut(false)
          }}
        />
      ) : !drill.micReady ? (
        <MicPermission
          kicker="Before we play"
          error={drill.mic.error}
          starting={drill.mic.reading.status === 'starting'}
          onAllow={drill.mic.start}
          onWithout={() => go('/session/no-mic')}
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
