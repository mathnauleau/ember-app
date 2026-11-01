import type { LogState, Step, StepId } from '../../engine/session'

// What a step needs from whatever is running it: the session, or a single practice route.
export type StepContext = {
  index: number
  stepNumber: number
  totalSteps: number
  minutes: number
  logs: LogState[]
  nextName: string
  noMic: boolean
  onDone: () => void // earns the log
  onSkip: () => void // earns none
  onLeave: () => void
  onNoMic: (noMic: boolean) => void
  onPass?: (chord: string) => void
  onStrum?: (onTime: number, total: number) => void
}

const SINGLE: Record<StepId, Pick<Step, 'minutes'> & { number: number; next: string }> = {
  tune: { minutes: 1, number: 1, next: 'Warm-up' },
  warmup: { minutes: 2, number: 2, next: 'Chord drill' },
  chords: { minutes: 5, number: 3, next: 'Strum pattern' },
  strum: { minutes: 4, number: 4, next: 'Song' },
  song: { minutes: 3, number: 5, next: 'Theory card' },
  theory: { minutes: 0.5, number: 6, next: 'Home' },
}

// One step on its own, outside a session: everything returns Home and nothing is recorded.
export function singleStep(id: StepId, go: (route: string) => void, noMic: boolean, onNoMic: (noMic: boolean) => void): StepContext {
  const { minutes, number, next } = SINGLE[id]
  const home = () => go('/')
  return {
    index: number - 1,
    stepNumber: number,
    totalSteps: 6,
    minutes,
    logs: Array.from({ length: 6 }, (_, i) => (i === number - 1 ? 'lit' : i < number - 1 ? 'done' : 'unlit')),
    nextName: next,
    noMic,
    onDone: home,
    onSkip: home,
    onLeave: home,
    onNoMic,
  }
}

export const finishedLogs = (context: StepContext, ended: boolean) =>
  context.logs.map((state, i) => (ended && i === context.index ? 'done' : state))
