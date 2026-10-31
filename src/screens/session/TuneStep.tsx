import { useCallback, useState } from 'react'
import { STRINGS } from '../../audio/pitch'
import { useTuner } from '../../audio/useTuner'
import { SessionShell } from '../SessionShell'
import { Tuner } from '../Tuner'
import { MicPermission } from './MicPermission'
import { StepDone } from './StepDone'

const TOTAL_STEPS = 6
const NEXT_STEP = 'Warm-up' // the session engine (M4) will supply this

// No time limit: tuning takes as long as it takes. It ends at six strings, or on Next.
export function TuneStep({ go }: { go: (route: string) => void }) {
  const [lock, setLock] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)

  const tuner = useTuner({ lock, active: !finished })
  const { status } = tuner.mic.reading
  const needsMic = status === 'idle' || status === 'starting'
  const allTuned = tuner.done.length === STRINGS.length
  if (allTuned && !finished) setFinished(true)

  const leave = useCallback(() => go('/'), [go])

  return (
    <SessionShell
      step="Tune"
      stepNumber={1}
      totalSteps={TOTAL_STEPS}
      phase={finished ? 'Complete' : 'Auto-detect'}
      logsDone={finished ? 1 : 0}
      logsLit={finished ? 0 : 1}
      skipLabel="Skip tuning"
      nextLabel={finished ? NEXT_STEP : 'Next'}
      background="centered"
      onLeave={leave}
      onSkip={leave}
      onNext={finished ? leave : () => setFinished(true)}
    >
      {finished ? (
        <StepDone
          title={allTuned ? 'All six strings in tune.' : 'Tuned enough for tonight.'}
          summary="The first log is on the fire."
          nextStep={NEXT_STEP}
          onAdvance={leave}
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
          micStatus={status}
          lock={lock}
          onLock={setLock}
        />
      )}
    </SessionShell>
  )
}
