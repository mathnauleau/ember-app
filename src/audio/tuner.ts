import { centsBetween, median, nearestStringIndex, STRINGS } from './pitch'

export const IN_TUNE_CENTS = 5
export const STAY_IN_TUNE_CENTS = 9 // once in tune, a fading note's wobble mustn't flip it back
export const IN_TUNE_HOLD_MS = 400
export const CENTS_WINDOW_MS = 400 // the shown value is the median of this much recent pitch
export const SIGNAL_HOLD_MS = 2000 // the reading stays up this long after the signal drops, so a fading note can be read
const LOCK_RANGE_CENTS = 600 // half an octave either side, so a locked string can't read an octave off

export const FULL_RANGE = { minHz: 70, maxHz: 400 }

export function rangeFor(lock: number | null) {
  if (lock === null) return FULL_RANGE
  const spread = 2 ** (LOCK_RANGE_CENTS / 1200)
  return { minHz: STRINGS[lock].hz / spread, maxHz: STRINGS[lock].hz * spread }
}

export type TunerView = {
  active: number
  cents: number
  signal: boolean
  inTune: boolean
  done: number[]
}

export class TunerTracker {
  private active = 0
  private inTuneSince: number | null = null
  private inTune = false
  private done = new Set<number>()
  private recent: { at: number; cents: number }[] = []
  private lastCents = 0
  private lastHeard = -Infinity

  update(hz: number | null, now: number, lock: number | null): TunerView {
    if (lock !== null && lock !== this.active) {
      this.switchTo(lock)
      this.lastHeard = -Infinity
    }
    if (hz === null) {
      // iPadOS can gate a fading note to silence mid-ring: hold the steadied reading through it.
      if (now - this.lastHeard < SIGNAL_HOLD_MS) return this.view(this.lastCents, true)
      this.inTuneSince = null
      this.inTune = false
      this.recent = []
      return this.view(0, false)
    }

    const string = lock ?? nearestStringIndex(hz)
    if (string !== this.active) this.switchTo(string)

    this.recent = [...this.recent.filter((r) => now - r.at < CENTS_WINDOW_MS), { at: now, cents: centsBetween(hz, STRINGS[string].hz) }]
    const cents = median(this.recent.map((r) => r.cents))
    this.lastCents = cents
    this.lastHeard = now

    this.inTune = Math.abs(cents) <= (this.inTune ? STAY_IN_TUNE_CENTS : IN_TUNE_CENTS)
    if (!this.inTune) {
      this.inTuneSince = null
    } else {
      this.inTuneSince ??= now
      if (now - this.inTuneSince >= IN_TUNE_HOLD_MS) this.done.add(string)
    }
    return this.view(cents, true)
  }

  private switchTo(string: number) {
    this.active = string
    this.inTuneSince = null
    this.inTune = false
    this.recent = []
  }

  private view(cents: number, signal: boolean): TunerView {
    return { active: this.active, cents, signal, inTune: signal && this.inTune, done: [...this.done] }
  }
}
