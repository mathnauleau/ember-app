import { describe, expect, it } from 'vitest'
import {
  canResume,
  currentStep,
  finishStep,
  isComplete,
  logStates,
  minutesLeft,
  nextStep,
  PLANS,
  restartSession,
  skipStep,
  startSession,
} from './session'
import { creditNight, daysBetween, fireLevel, isBroken, missedDays } from './streak'

describe('session plans', () => {
  it('matches the brief', () => {
    expect(PLANS[15].map((s) => [s.id, s.minutes])).toEqual([['tune', 1], ['warmup', 2], ['chords', 5], ['strum', 4], ['song', 3], ['theory', 0.5]])
    expect(PLANS[10].map((s) => [s.id, s.minutes])).toEqual([['tune', 1], ['chords', 4], ['strum', 3], ['song', 2]])
  })
})

describe('session state', () => {
  const day = '2026-10-31'

  it('walks every step to complete', () => {
    let s = startSession(day, 10)
    expect(currentStep(s)?.id).toBe('tune')
    expect(nextStep(s)?.id).toBe('chords')
    for (let i = 0; i < 4; i++) {
      expect(isComplete(s)).toBe(false)
      s = finishStep(s)
    }
    expect(isComplete(s)).toBe(true)
    expect(s.logged).toEqual(['tune', 'chords', 'strum', 'song'])
    expect(currentStep(s)).toBeNull()
    expect(nextStep(s)).toBeNull()
  })

  it('earns no log for a skipped step', () => {
    const s = finishStep(skipStep(startSession(day, 15)))
    expect(s.logged).toEqual(['warmup'])
    expect(logStates(s)).toEqual(['unlit', 'done', 'lit', 'unlit', 'unlit', 'unlit'])
  })

  it('counts minutes left from the current step', () => {
    let s = startSession(day, 15)
    expect(minutesLeft(s)).toBe(16)
    s = finishStep(finishStep(s))
    expect(minutesLeft(s)).toBe(13)
  })

  it('keeps logs when starting fresh, without doubling them', () => {
    let s = finishStep(finishStep(startSession(day, 15)))
    s = restartSession(s)
    expect(currentStep(s)?.id).toBe('tune')
    expect(s.logged).toEqual(['tune', 'warmup'])
    expect(finishStep(s).logged).toEqual(['tune', 'warmup'])
  })

  it('stays put once complete', () => {
    let s = startSession(day, 10)
    for (let i = 0; i < 6; i++) s = finishStep(s)
    expect(s.index).toBe(4)
    expect(s.logged).toHaveLength(4)
  })
})

describe('streak', () => {
  const base = { streak: 12, lastSessionDate: '2026-10-30', streakBefore: 0 }

  it('counts days across a month and a year end', () => {
    expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2026-03-28', '2026-03-29')).toBe(1) // clocks change here in Europe
  })

  it('adds one for tonight', () => {
    expect(creditNight(base, '2026-10-31')).toEqual({ streak: 13, lastSessionDate: '2026-10-31', streakBefore: 0 })
  })

  it('adds only once a day', () => {
    const tonight = creditNight(base, '2026-10-31')
    expect(creditNight(tonight, '2026-10-31')).toEqual(tonight)
  })

  it('keeps the streak through one missed day', () => {
    expect(creditNight(base, '2026-11-01').streak).toBe(13)
    expect(isBroken('2026-10-30', '2026-11-01')).toBe(false)
  })

  it('resets after two missed days and remembers what was kept', () => {
    expect(creditNight(base, '2026-11-02')).toEqual({ streak: 1, lastSessionDate: '2026-11-02', streakBefore: 12 })
    expect(isBroken('2026-10-30', '2026-11-02')).toBe(true)
  })

  it('starts at one on the first night', () => {
    expect(creditNight({ streak: 0, lastSessionDate: null, streakBefore: 0 }, '2026-10-31').streak).toBe(1)
  })

  it('never goes to zero or to a negative miss', () => {
    expect(missedDays('2026-10-30', '2026-10-30')).toBe(0)
    expect(missedDays('2026-10-31', '2026-10-30')).toBe(0)
    expect(missedDays(null, '2026-10-30')).toBe(0)
  })

  it('decays the fire: one day dim, three days embers, never out', () => {
    expect(fireLevel(null, '2026-10-31')).toBe('first')
    expect(fireLevel('2026-10-30', '2026-10-30')).toBe('full')
    expect(fireLevel('2026-10-30', '2026-10-31')).toBe('full')
    expect(fireLevel('2026-10-30', '2026-11-01')).toBe('dim')
    expect(fireLevel('2026-10-30', '2026-11-02')).toBe('dim')
    expect(fireLevel('2026-10-30', '2026-11-03')).toBe('embers')
    expect(fireLevel('2026-10-30', '2027-06-01')).toBe('embers')
  })
})

describe('resuming', () => {
  const day = '2026-10-31'

  it('offers nothing to resume at the very first step', () => {
    expect(canResume(startSession(day, 15))).toBe(false)
  })

  it('offers a place to come back to once past it', () => {
    expect(canResume(finishStep(startSession(day, 15)))).toBe(true)
  })

  it('offers nothing once complete', () => {
    let s = startSession(day, 10)
    for (let i = 0; i < 4; i++) s = finishStep(s)
    expect(canResume(s)).toBe(false)
  })

  it('has nothing to resume right after starting fresh', () => {
    expect(canResume(restartSession(finishStep(startSession(day, 15))))).toBe(false)
  })
})
