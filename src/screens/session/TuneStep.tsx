import { useCallback, useState } from 'react'
import { useStepTimer } from '../../audio/useStepTimer'
import { useTuner } from '../../audio/useTuner'
import { STRINGS } from '../../audio/pitch'
import { SessionShell } from '../SessionShell'
import { Tuner, TunerDone } from '../Tuner'
import { MicPermission } from './MicPermission'
import { TimeUp } from './TimeUp'

const STEP_SECONDS = 60
const TOTAL_STEPS = 6
const NEXT_STEP = 'Warm-up' // the session engine (M4) will supply this

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function TuneStep({ go }: { go: (route: string) => void }) {
  const [lock, setLock] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [finished, setFinished] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  const tuner = useTuner({ lock, active: !finished && !timedOut })
  const { status } = tuner.mic.reading
  const needsMic = status === 'idle' || status === 'starting'
  const allDone = finished || tuner.done.length === STRINGS.length

  const { left, extend } = useStepTimer(STEP_SECONDS, !needsMic && !paused && !allDone && !timedOut)
  if (left === 0 && !timedOut) setTimedOut(true)
  if (tuner.done.length === STRINGS.length && !finished) setFinished(true)

  const leave = useCallback(() => go('/'), [go])
  const ended = allDone || timedOut

  return (
    <SessionShell
      step="Tune"
      stepNumber={1}
      totalSteps={TOTAL_STEPS}
      phase={ended ? 'Complete' : 'Auto-detect'}
      time={clock(allDone ? 0 : left)}
      timeMuted={timedOut}
      logsDone={ended ? 1 : 0}
      logsLit={ended ? 0 : 1}
      skipLabel="Skip tuning"
      nextLabel={ended ? NEXT_STEP : 'Next'}
      centered
      onPauseChange={setPaused}
      onLeave={leave}
      onSkip={leave}
      onNext={leave}
    >
      {allDone ? (
        <TunerDone onAdvance={leave} />
      ) : timedOut ? (
        <TimeUp
          title="That's tuning for tonight."
          summary="The log is on the fire."
          nextStep={NEXT_STEP}
          onAdvance={leave}
          onExtend={() => {
            extend(STEP_SECONDS)
            setTimedOut(false)
          }}
        />
      ) : needsMic ? (
        <MicPermission
          error={tuner.mic.error}
          starting={status === 'starting'}
          onAllow={tuner.mic.start}
          onWithout={() => go('/session/no-mic')}
        />
      ) : (
        <Tuner
          active={tuner.active}
          cents={tuner.cents}
          signal={tuner.signal}
          inTune={tuner.inTune}
          done={tuner.done}
          noisy={status === 'noisy'}
          lock={lock}
          onLock={setLock}
        />
      )}
    </SessionShell>
  )
}
