import { useCallback, useState } from 'react'
import { useStepTimer } from '../../audio/useStepTimer'
import { useStrum } from '../../audio/useStrum'
import chords from '../../data/chords.json'
import patterns from '../../data/patterns.json'
import { SessionShell } from '../SessionShell'
import { Strum } from '../Strum'
import { MicPermission } from './MicPermission'
import { TimeUp } from './TimeUp'

const STEP_SECONDS = 240
const TOTAL_STEPS = 6
const NEXT_STEP = 'Song' // the session engine (M4) will supply this
const LOGS_BEFORE = 3

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function StrumStep({ go }: { go: (route: string) => void }) {
  const [paused, setPaused] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const strum = useStrum({ pattern: patterns[0], frets: chords.G.frets, active: !timedOut, held: paused })
  const { left, extend } = useStepTimer(STEP_SECONDS, strum.micReady && !paused && !timedOut)
  if (left === 0 && !timedOut) setTimedOut(true)

  const leave = useCallback(() => go('/'), [go])
  const needsMic = !strum.micReady

  return (
    <SessionShell
      step="Strum pattern"
      stepNumber={4}
      totalSteps={TOTAL_STEPS}
      phase={timedOut ? 'Complete' : strum.phase === 'listen' ? 'Listen' : 'Play'}
      time={clock(left)}
      timeMuted={timedOut}
      logsDone={timedOut ? LOGS_BEFORE + 1 : LOGS_BEFORE}
      logsLit={timedOut ? 0 : 1}
      nextLabel={timedOut ? NEXT_STEP : 'Next'}
      background="centered"
      onPauseChange={setPaused}
      onLeave={leave}
      onSkip={leave}
      onNext={leave}
    >
      {timedOut ? (
        <TimeUp
          title="That's the strumming for tonight."
          summary="The log is on the fire."
          nextStep={NEXT_STEP}
          onAdvance={leave}
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
          onWithout={() => go('/session/no-mic')}
        />
      ) : (
        <Strum
          pattern={patterns[0]}
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
