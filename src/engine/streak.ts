export type Streak = { streak: number; lastSessionDate: string | null; streakBefore: number }
export type FireLevel = 'first' | 'full' | 'dim' | 'embers'

const DAY_MS = 86400000
const GRACE_DAYS = 1 // one missed day keeps the streak

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}

export const daysBetween = (from: string, to: string) => dayNumber(to) - dayNumber(from)

// Nights between the last session and tonight with nothing played.
export function missedDays(lastSessionDate: string | null, today: string) {
  return lastSessionDate === null ? 0 : Math.max(0, daysBetween(lastSessionDate, today) - 1)
}

export function isBroken(lastSessionDate: string | null, today: string) {
  return missedDays(lastSessionDate, today) > GRACE_DAYS
}

// The streak a person would see tonight: a broken one reads as nights kept, not as a live run.
export function fireLevel(lastSessionDate: string | null, today: string): FireLevel {
  if (lastSessionDate === null) return 'first'
  const missed = missedDays(lastSessionDate, today)
  if (missed === 0) return 'full'
  return missed >= 3 ? 'embers' : 'dim'
}

export function creditNight(current: Streak, today: string): Streak {
  if (current.lastSessionDate === today) return current
  const broken = isBroken(current.lastSessionDate, today)
  return {
    streak: broken ? 1 : current.streak + 1,
    lastSessionDate: today,
    streakBefore: broken ? current.streak : 0,
  }
}
