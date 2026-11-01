export type StepId = 'tune' | 'warmup' | 'chords' | 'strum' | 'song' | 'theory'
export type SessionMinutes = 15 | 10
export type Step = { id: StepId; name: string; minutes: number }

const NAMES: Record<StepId, string> = {
  tune: 'Tune',
  warmup: 'Warm-up',
  chords: 'Chord drill',
  strum: 'Strum pattern',
  song: 'Song',
  theory: 'Theory card',
}

const step = (id: StepId, minutes: number): Step => ({ id, name: NAMES[id], minutes })

export const PLANS: Record<SessionMinutes, Step[]> = {
  15: [step('tune', 1), step('warmup', 2), step('chords', 5), step('strum', 4), step('song', 3), step('theory', 0.5)],
  10: [step('tune', 1), step('chords', 4), step('strum', 3), step('song', 2)],
}

export type Session = {
  date: string
  minutes: SessionMinutes
  index: number // the current step; equal to the plan's length once complete
  logged: StepId[] // earned logs: skipped steps stay out
  noMic: boolean
  passed: boolean // a hold landed tonight: counts once towards the next chord
  newChord: string | null
}

export const startSession = (date: string, minutes: SessionMinutes): Session => ({
  date,
  minutes,
  index: 0,
  logged: [],
  noMic: false,
  passed: false,
  newChord: null,
})

export const planOf = (session: Session) => PLANS[session.minutes]
export const currentStep = (session: Session): Step | null => planOf(session)[session.index] ?? null
export const nextStep = (session: Session): Step | null => planOf(session)[session.index + 1] ?? null
export const isComplete = (session: Session) => session.index >= planOf(session).length

export function finishStep(session: Session): Session {
  const current = currentStep(session)
  if (!current) return session
  const logged = session.logged.includes(current.id) ? session.logged : [...session.logged, current.id]
  return { ...session, logged, index: session.index + 1 }
}

export function skipStep(session: Session): Session {
  return { ...session, index: session.index + 1 }
}

// Starting fresh runs the plan again from the top, and what's already burning stays lit.
export const restartSession = (session: Session): Session => ({ ...session, index: 0 })

export function minutesLeft(session: Session) {
  const rest = planOf(session).slice(session.index).reduce((sum, s) => sum + s.minutes, 0)
  return Math.max(1, Math.round(rest))
}

export type LogState = 'done' | 'lit' | 'unlit'

export function logStates(session: Session): LogState[] {
  return planOf(session).map((s, i) => (session.logged.includes(s.id) ? 'done' : i === session.index ? 'lit' : 'unlit'))
}
