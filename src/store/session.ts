import { afterChordPass, afterStrumSession, afterTheorySeen } from '../engine/curriculum'
import { creditNight } from '../engine/streak'
import { currentStep, finishStep, isComplete, skipStep, startSession, type Session, type SessionMinutes } from '../engine/session'
import { today } from '../lib/dates'
import { getProgress, replaceProgress, type NightRecord } from './progress'

const HISTORY_LIMIT = 365

// Whether the person already chose Home over the session. Kept in memory on purpose: the prompt
// is for coming back after a reload or a new launch, which starts this over.
let resumePromptDismissed = false
export const isResumePromptDismissed = () => resumePromptDismissed
export const dismissResumePrompt = () => {
  resumePromptDismissed = true
}

function write(session: Session | null) {
  replaceProgress({ ...getProgress(), session })
}

export function beginSession(minutes: SessionMinutes) {
  // Asks Safari to keep the fire through storage clean-ups. Installed apps are already exempt.
  void navigator.storage?.persist?.().catch(() => {})
  const date = today()
  // Tonight's earned logs and chord pass carry into a fresh start.
  const earlier = getProgress().session
  const kept = earlier?.date === date ? { logged: earlier.logged, passed: earlier.passed, newChord: earlier.newChord } : {}
  write({ ...startSession(date, minutes), ...kept })
}
export const resumeWith = (session: Session) => write(session)
export const clearSession = () => write(null)

function advance(next: Session, credited: boolean) {
  const progress = getProgress()
  // A night counts once the chord drill is done, wherever the session goes after that.
  const streak = credited
    ? creditNight({ streak: progress.streak, lastSessionDate: progress.lastSessionDate, streakBefore: progress.streakBefore }, next.date)
    : { streak: progress.streak, lastSessionDate: progress.lastSessionDate, streakBefore: progress.streakBefore }
  const record: NightRecord | null = isComplete(next) ? { date: next.date, minutes: next.minutes, logs: next.logged } : null
  replaceProgress({ ...progress, ...streak, session: next, history: record ? [...progress.history, record].slice(-HISTORY_LIMIT) : progress.history })
}

// These read the saved session, not a copy from the last render: two actions can land together.
export function completeStep() {
  const { session } = getProgress()
  if (session) advance(finishStep(session), currentStep(session)?.id === 'chords')
}

export function passOverStep() {
  const { session } = getProgress()
  if (session) advance(skipStep(session), false)
}

export function setNoMic(noMic: boolean) {
  const { session } = getProgress()
  if (session) write({ ...session, noMic })
}

// A session counts once towards the next chord, however many holds land in it.
export function recordChordPass(chord: string) {
  const progress = getProgress()
  const passCounts = { ...progress.passCounts, [chord]: (progress.passCounts[chord] ?? 0) + 1 }
  const { session } = progress
  if (!session || session.passed) {
    replaceProgress({ ...progress, passCounts })
    return
  }
  const { newChord, ...set } = afterChordPass(progress)
  replaceProgress({ ...progress, ...set, passCounts, session: { ...session, passed: true, newChord } })
}

export function recordStrum(onTime: number, total: number) {
  const progress = getProgress()
  replaceProgress({ ...progress, ...afterStrumSession(progress, onTime, total) })
}

export function markTheorySeen() {
  const progress = getProgress()
  replaceProgress({ ...progress, ...afterTheorySeen(progress, today()) })
}
