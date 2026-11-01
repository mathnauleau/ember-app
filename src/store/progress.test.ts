import { describe, expect, it } from 'vitest'
import { DEFAULT_PROGRESS, parseBackup, sanitize, serializeBackup } from './progress'
import { median } from '../audio/pitch'
import { formatDay, nextDay, today, weekdayOf } from '../lib/dates'

describe('backup', () => {
  it('round-trips progress', () => {
    const progress = {
      ...DEFAULT_PROGRESS,
      lastBackupOn: '2026-10-12',
      settings: { ...DEFAULT_PROGRESS.settings, defaultMinutes: 10 as const, latencyOffsetMs: 38 },
    }
    expect(parseBackup(serializeBackup(progress))).toEqual(progress)
  })

  it('rejects files that are not Ember backups', () => {
    expect(parseBackup('not json')).toBeNull()
    expect(parseBackup('[]')).toBeNull()
    expect(parseBackup('{"app":"other","progress":{}}')).toBeNull()
    expect(parseBackup('{"app":"ember"}')).toBeNull()
  })
})

describe('sanitize', () => {
  it('falls back per field on bad values', () => {
    const p = sanitize({ settings: { defaultMinutes: 7, sound: 'yes', clickVolume: 400 }, thresholds: { close: 'x' } })
    expect(p.settings.defaultMinutes).toBe(15)
    expect(p.settings.sound).toBe(true)
    expect(p.settings.clickVolume).toBe(100)
    expect(p.thresholds.close).toBe(DEFAULT_PROGRESS.thresholds.close)
  })

  it('discards thresholds saved under older defaults', () => {
    const p = sanitize({ thresholds: { floor: -52 } })
    expect(p.thresholds.floor).toBe(DEFAULT_PROGRESS.thresholds.floor)
  })

  it('keeps thresholds saved under the current defaults', () => {
    const p = sanitize({ ...DEFAULT_PROGRESS, thresholds: { ...DEFAULT_PROGRESS.thresholds, floor: -70 } })
    expect(p.thresholds.floor).toBe(-70)
  })

  it('drops a malformed saved session', () => {
    expect(sanitize({ session: { logsDone: 2 } }).session).toBeNull()
    expect(sanitize({ session: { date: '2026-10-31', minutes: 7, index: 0 } }).session).toBeNull()
  })

  it('keeps a valid session, dropping unknown steps', () => {
    const session = sanitize({ session: { date: '2026-10-31', minutes: 15, index: 2, logged: ['tune', 'nope'] } }).session
    expect(session).toEqual({ date: '2026-10-31', minutes: 15, index: 2, logged: ['tune'], noMic: false, passed: false, newChord: null })
  })

  it('keeps streak and history through a backup', () => {
    const progress = { ...DEFAULT_PROGRESS, streak: 12, lastSessionDate: '2026-10-30', history: [{ date: '2026-10-30', minutes: 15, logs: ['tune'] }], passCounts: { Em: 2 } }
    expect(parseBackup(serializeBackup(progress))).toEqual(progress)
  })
})

describe('helpers', () => {
  it('takes the median of odd and even lists', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
  })

  it('keeps dates in one fixed format', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(nextDay('2026-10-31')).toBe('2026-11-01')
    expect(nextDay('2026-12-31')).toBe('2027-01-01')
    expect(weekdayOf('2026-10-27')).toBe('Tuesday')
  })

  it('formats days and names today', () => {
    expect(formatDay('2026-10-24')).toBe('24 October')
    expect(formatDay(today())).toBe('today')
  })
})
