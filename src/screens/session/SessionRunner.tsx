import { useEffect, useMemo } from 'react'
import { useWakeLock } from '../../audio/useWakeLock'
import { currentStep, isComplete, logStates, nextStep, planOf } from '../../engine/session'
import { completeStep, dismissResumePrompt, passOverStep, recordChordPass, recordStrum, setNoMic } from '../../store/session'
import { useProgress } from '../../store/progress'
import { ChordStep } from './ChordStep'
import type { StepContext } from './context'
import { SongStep } from './SongStep'
import { StrumStep } from './StrumStep'
import { TheoryStep } from './TheoryStep'
import { TuneStep } from './TuneStep'
import { WarmupStep } from './WarmupStep'

export function SessionRunner({ go }: { go: (route: string) => void }) {
  const { session, settings } = useProgress()
  const step = session ? currentStep(session) : null
  useWakeLock(settings.keepAwake && step !== null)

  useEffect(() => {
    if (!session) go('/')
    else if (isComplete(session)) go('/summary')
  }, [session, go])

  const context = useMemo<StepContext | null>(() => {
    if (!session || !step) return null
    return {
      index: session.index,
      stepNumber: session.index + 1,
      totalSteps: planOf(session).length,
      minutes: step.minutes,
      logs: logStates(session),
      nextName: nextStep(session)?.name ?? 'Summary',
      noMic: session.noMic,
      onDone: completeStep,
      onSkip: passOverStep,
      onLeave: () => {
        dismissResumePrompt()
        go('/')
      },
      onNoMic: setNoMic,
      onPass: recordChordPass,
      onStrum: recordStrum,
    }
  }, [session, step, go])

  if (!step || !context) return null

  // Keyed by position, so each step starts clean and releases the mic when it ends.
  switch (step.id) {
    case 'tune':
      return <TuneStep key={context.index} context={context} />
    case 'chords':
      return <ChordStep key={context.index} context={context} />
    case 'strum':
      return <StrumStep key={context.index} context={context} />
    case 'warmup':
      return <WarmupStep key={context.index} context={context} />
    case 'song':
      return <SongStep key={context.index} context={context} />
    case 'theory':
      return <TheoryStep key={context.index} context={context} />
  }
}
