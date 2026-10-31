import { describe, expect, it } from 'vitest'
import { DEFAULT_PROGRESS, parseBackup, sanitize, serializeBackup } from './progress'
import { median } from '../audio/debugSignal'
import { formatDay, today } from '../lib/dates'

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

  it('drops a malformed saved session', () => {
    expect(sanitize({ session: { logsDone: 2 } }).session).toBeNull()
  })
})

describe('helpers', () => {
  it('takes the median of odd and even lists', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
  })

  it('formats days and names today', () => {
    expect(formatDay('2026-10-24')).toBe('24 October')
    expect(formatDay(today())).toBe('today')
  })
})
