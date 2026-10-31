import { useSyncExternalStore } from 'react'
import { DEFAULT_THRESHOLDS, type Thresholds } from '../config/thresholds'

const KEY = 'ember.progress'
const BACKUP_VERSION = 1

export type Settings = {
  defaultMinutes: 15 | 10
  sound: boolean
  keepAwake: boolean
  clickVolume: number
  latencyOffsetMs: number | null
  latencyOffsetSetOn: string | null
}

export type SavedSession = {
  logsDone: number
  totalSteps: number
  nextStep: string
  minutesLeft: number
}

export type Progress = {
  settings: Settings
  thresholds: Thresholds
  lastBackupOn: string | null
  session: SavedSession | null
}

export const DEFAULT_PROGRESS: Progress = {
  settings: {
    defaultMinutes: 15,
    sound: true,
    keepAwake: true,
    clickVolume: 30,
    latencyOffsetMs: null,
    latencyOffsetSetOn: null,
  },
  thresholds: DEFAULT_THRESHOLDS,
  lastBackupOn: null,
  session: null,
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const strOrNull = (v: unknown) => (typeof v === 'string' ? v : null)

function readSession(v: unknown): SavedSession | null {
  if (!isRecord(v) || typeof v.nextStep !== 'string') return null
  return {
    logsDone: num(v.logsDone, 0),
    totalSteps: num(v.totalSteps, 6),
    nextStep: v.nextStep,
    minutesLeft: num(v.minutesLeft, 0),
  }
}

// Field by field, so stored or imported data can never put a bad value in the store.
export function sanitize(raw: unknown): Progress {
  const d = DEFAULT_PROGRESS
  const r = isRecord(raw) ? raw : {}
  const s = isRecord(r.settings) ? r.settings : {}
  const t = isRecord(r.thresholds) ? r.thresholds : {}
  return {
    settings: {
      defaultMinutes: s.defaultMinutes === 10 ? 10 : 15,
      sound: bool(s.sound, d.settings.sound),
      keepAwake: bool(s.keepAwake, d.settings.keepAwake),
      clickVolume: Math.min(100, Math.max(0, num(s.clickVolume, d.settings.clickVolume))),
      latencyOffsetMs: numOrNull(s.latencyOffsetMs),
      latencyOffsetSetOn: strOrNull(s.latencyOffsetSetOn),
    },
    thresholds: {
      floor: num(t.floor, d.thresholds.floor),
      noisy: num(t.noisy, d.thresholds.noisy),
      close: num(t.close, d.thresholds.close),
      margin: num(t.margin, d.thresholds.margin),
      onTime: num(t.onTime, d.thresholds.onTime),
    },
    lastBackupOn: strOrNull(r.lastBackupOn),
    session: readSession(r.session),
  }
}

export function serializeBackup(progress: Progress): string {
  return JSON.stringify({ app: 'ember', version: BACKUP_VERSION, progress }, null, 2)
}

export function parseBackup(text: string): Progress | null {
  try {
    const raw: unknown = JSON.parse(text)
    if (!isRecord(raw) || raw.app !== 'ember' || !isRecord(raw.progress)) return null
    return sanitize(raw.progress)
  } catch {
    return null
  }
}

function load(): Progress {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return DEFAULT_PROGRESS
  }
}

let state = load()
const listeners = new Set<() => void>()

function commit(next: Progress) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private mode or full storage: keep working from memory.
  }
  listeners.forEach((l) => l())
}

export function getProgress() {
  return state
}

export function replaceProgress(next: Progress) {
  commit(next)
}

export function updateSettings(patch: Partial<Settings>) {
  commit({ ...state, settings: { ...state.settings, ...patch } })
}

export function updateThresholds(patch: Partial<Thresholds>) {
  commit({ ...state, thresholds: { ...state.thresholds, ...patch } })
}

export function markBackedUp(on: string) {
  commit({ ...state, lastBackupOn: on })
}

export function saveSession(session: SavedSession | null) {
  commit({ ...state, session })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useProgress() {
  return useSyncExternalStore(subscribe, getProgress)
}
