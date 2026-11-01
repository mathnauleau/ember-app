import { useSyncExternalStore } from 'react'
import { DEFAULT_THRESHOLDS, type Thresholds } from '../config/thresholds'
import curriculum from '../data/curriculum.json'
import patterns from '../data/patterns.json'
import { PLANS, type Session, type StepId } from '../engine/session'

const KEY = 'ember.progress'
const BACKUP_VERSION = 1
const THRESHOLDS_REV = 2 // bump to discard saved thresholds when their defaults change

export type Settings = {
  defaultMinutes: 15 | 10
  sound: boolean
  keepAwake: boolean
  clickVolume: number
  latencyOffsetMs: number | null
  latencyOffsetSetOn: string | null
  bpmByPattern: Record<string, number>
}

export type NightRecord = { date: string; minutes: number; logs: string[] }

export type Progress = {
  settings: Settings
  thresholds: Thresholds
  thresholdsRev: number
  lastBackupOn: string | null
  session: Session | null
  streak: number
  streakBefore: number // nights kept when the streak last reset
  lastSessionDate: string | null
  history: NightRecord[]
  passCounts: Record<string, number>
  learnedCount: number
  setPasses: number // sessions passed on the current chord set
  patternLevel: number
  strumGood: number // sessions with half the bars on time at this level
  currentSong: string | null
  theorySeen: number
  theoryDate: string | null
}

export const DEFAULT_PROGRESS: Progress = {
  settings: {
    defaultMinutes: 15,
    sound: true,
    keepAwake: true,
    clickVolume: 30,
    latencyOffsetMs: null,
    latencyOffsetSetOn: null,
    bpmByPattern: {},
  },
  thresholds: DEFAULT_THRESHOLDS,
  thresholdsRev: THRESHOLDS_REV,
  lastBackupOn: null,
  session: null,
  streak: 0,
  streakBefore: 0,
  lastSessionDate: null,
  history: [],
  passCounts: {},
  learnedCount: curriculum.learned,
  setPasses: 0,
  patternLevel: 1,
  strumGood: 0,
  currentSong: null,
  theorySeen: 0,
  theoryDate: null,
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const strOrNull = (v: unknown) => (typeof v === 'string' ? v : null)

const STEP_IDS = PLANS[15].map((step) => step.id)

function readSession(v: unknown): Session | null {
  if (!isRecord(v) || typeof v.date !== 'string' || (v.minutes !== 15 && v.minutes !== 10) || typeof v.index !== 'number') return null
  const logged = Array.isArray(v.logged) ? v.logged.filter((id): id is StepId => STEP_IDS.includes(id)) : []
  return { date: v.date, minutes: v.minutes, index: v.index, logged, noMic: v.noMic === true, passed: v.passed === true, newChord: strOrNull(v.newChord) }
}

function readHistory(v: unknown): NightRecord[] {
  if (!Array.isArray(v)) return []
  return v.filter(isRecord).flatMap((night) =>
    typeof night.date === 'string'
      ? [{ date: night.date, minutes: num(night.minutes, 0), logs: Array.isArray(night.logs) ? night.logs.filter((l): l is string => typeof l === 'string') : [] }]
      : [],
  )
}

function readCounts(v: unknown) {
  const entries = isRecord(v) ? Object.entries(v) : []
  return Object.fromEntries(entries.filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] >= 0))
}

function readBpms(v: unknown) {
  const entries = isRecord(v) ? Object.entries(v) : []
  return Object.fromEntries(entries.filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] >= 40 && e[1] <= 160))
}

// Field by field, so stored or imported data can never put a bad value in the store.
export function sanitize(raw: unknown): Progress {
  const d = DEFAULT_PROGRESS
  const r = isRecord(raw) ? raw : {}
  const s = isRecord(r.settings) ? r.settings : {}
  const t = isRecord(r.thresholds) && r.thresholdsRev === THRESHOLDS_REV ? r.thresholds : {}
  return {
    settings: {
      defaultMinutes: s.defaultMinutes === 10 ? 10 : 15,
      sound: bool(s.sound, d.settings.sound),
      keepAwake: bool(s.keepAwake, d.settings.keepAwake),
      clickVolume: Math.min(100, Math.max(0, num(s.clickVolume, d.settings.clickVolume))),
      latencyOffsetMs: numOrNull(s.latencyOffsetMs),
      latencyOffsetSetOn: strOrNull(s.latencyOffsetSetOn),
      bpmByPattern: readBpms(s.bpmByPattern),
    },
    thresholds: {
      floor: num(t.floor, d.thresholds.floor),
      noisy: num(t.noisy, d.thresholds.noisy),
      close: num(t.close, d.thresholds.close),
      margin: num(t.margin, d.thresholds.margin),
      onTime: num(t.onTime, d.thresholds.onTime),
    },
    thresholdsRev: THRESHOLDS_REV,
    lastBackupOn: strOrNull(r.lastBackupOn),
    session: readSession(r.session),
    streak: Math.max(0, num(r.streak, 0)),
    streakBefore: Math.max(0, num(r.streakBefore, 0)),
    lastSessionDate: strOrNull(r.lastSessionDate),
    history: readHistory(r.history),
    passCounts: readCounts(r.passCounts),
    learnedCount: Math.max(curriculum.learned, Math.min(curriculum.chordOrder.length, num(r.learnedCount, curriculum.learned))),
    setPasses: Math.max(0, num(r.setPasses, 0)),
    patternLevel: Math.max(1, Math.min(patterns.length, num(r.patternLevel, 1))),
    strumGood: Math.max(0, num(r.strumGood, 0)),
    currentSong: strOrNull(r.currentSong),
    theorySeen: Math.max(0, num(r.theorySeen, 0)),
    theoryDate: strOrNull(r.theoryDate),
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

export function updateBpm(patternId: string, bpm: number) {
  updateSettings({ bpmByPattern: { ...state.settings.bpmByPattern, [patternId]: bpm } })
}

export function setCurrentSong(currentSong: string) {
  commit({ ...state, currentSong })
}

export function updateThresholds(patch: Partial<Thresholds>) {
  commit({ ...state, thresholds: { ...state.thresholds, ...patch } })
}

export function markBackedUp(on: string) {
  commit({ ...state, lastBackupOn: on })
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
