import { useState } from 'react'
import { STRINGS } from '../../audio/pitch'
import { useTuner } from '../../audio/useTuner'
import { SessionShell } from '../SessionShell'
import { Tuner } from '../Tuner'
import { MicPermission } from './MicPermission'
import { finishedLogs, type StepContext } from './context'
import { StepDone } from './StepDone'

// No time limit: tuning takes as long as it takes. It ends at six strings, or on Next.
export function TuneStep({ context }: { context: StepContext }) {
  const [lock, setLock] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)

  const tuner = useTuner({ lock, active: !finished })
  const { status } = tuner.mic.reading
  const needsMic = status === 'idle' || status === 'starting'
  const allTuned = tuner.done.length === STRINGS.length
  if (allTuned && !finished) setFinished(true)

  return (
    <SessionShell
      step="Tune"
      stepNumber={context.stepNumber}
      totalSteps={context.totalSteps}
      phase={finished ? 'Complete' : 'Auto-detect'}
      logs={finishedLogs(context, finished)}
      skipLabel="Skip tuning"
      nextLabel={finished ? context.nextName : 'Next'}
      background="centered"
      onLeave={context.onLeave}
      onSkip={context.onSkip}
      onNext={finished ? context.onDone : () => setFinished(true)}
    >
      {finished ? (
        <StepDone
          title={allTuned ? 'All six strings in tune.' : 'Tuned enough for tonight.'}
          summary="The first log is on the fire."
          nextStep={context.nextName}
          onAdvance={context.onDone}
        />
      ) : needsMic ? (
        <MicPermission
          error={tuner.mic.error}
          starting={status === 'starting'}
          onAllow={tuner.mic.start}
          onWithout={() => {
            context.onNoMic(true)
            context.onSkip()
          }}
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
