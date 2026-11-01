import curriculum from '../data/curriculum.json'
import patterns from '../data/patterns.json'
import songs from '../data/songs.json'
import theory from '../data/theory.json'
import warmups from '../data/warmups.json'
import { daysBetween } from './streak'

const { chordOrder, sessionsToAdvance } = curriculum
const MIN_BARS_FOR_CREDIT = 4
const EPOCH = '2026-01-01'

export type Song = (typeof songs)[number]
export type Pattern = (typeof patterns)[number]
export type Warmup = (typeof warmups)[number]

export const learnedChords = (learnedCount: number) => chordOrder.slice(0, Math.min(learnedCount, chordOrder.length))

// The drill is the two newest chords, and the hold takes turns between them.
export function drillPair(learnedCount: number, setPasses: number): [string, string] {
  const learned = learnedChords(learnedCount)
  const newest = learned[learned.length - 1]
  const previous = learned[learned.length - 2]
  return setPasses % 2 === 0 ? [newest, previous] : [previous, newest]
}

export function afterChordPass(state: { learnedCount: number; setPasses: number }) {
  const setPasses = state.setPasses + 1
  if (setPasses < sessionsToAdvance || state.learnedCount >= chordOrder.length) {
    return { learnedCount: state.learnedCount, setPasses, newChord: null }
  }
  return { learnedCount: state.learnedCount + 1, setPasses: 0, newChord: chordOrder[state.learnedCount] }
}

export const patternFor = (level: number): Pattern => patterns.find((p) => p.level === level) ?? patterns[patterns.length - 1]

export function earnedStrumCredit(onTime: number, total: number) {
  return total >= MIN_BARS_FOR_CREDIT && onTime * 2 >= total
}

export function afterStrumSession(state: { patternLevel: number; strumGood: number }, onTime: number, total: number) {
  if (!earnedStrumCredit(onTime, total)) return state
  const strumGood = state.strumGood + 1
  if (strumGood < sessionsToAdvance || state.patternLevel >= patterns.length) {
    return { patternLevel: state.patternLevel, strumGood }
  }
  return { patternLevel: state.patternLevel + 1, strumGood: 0 }
}

export const songChords = (song: Song) => [...new Set(song.bars)]

export const missingChords = (song: Song, learned: string[]) => songChords(song).filter((c) => !learned.includes(c))

export const isUnlocked = (song: Song, learned: string[]) => missingChords(song, learned).length === 0

export function currentSong(id: string | null, learned: string[]): Song {
  const open = songs.filter((s) => isUnlocked(s, learned))
  return open.find((s) => s.id === id) ?? open[open.length - 1] ?? songs[0]
}

export function warmupsFor(date: string): [Warmup, Warmup] {
  const start = ((daysBetween(EPOCH, date) % warmups.length) + warmups.length) % warmups.length
  return [warmups[start], warmups[(start + 1) % warmups.length]]
}

// One card a day, in order: a new day moves on only if yesterday's card was seen.
export function theoryCard(state: { theorySeen: number; theoryDate: string | null }, date: string) {
  const index = state.theoryDate === date ? state.theorySeen - 1 : state.theorySeen
  return theory[((index % theory.length) + theory.length) % theory.length]
}

export function afterTheorySeen(state: { theorySeen: number; theoryDate: string | null }, date: string) {
  return state.theoryDate === date ? state : { theorySeen: state.theorySeen + 1, theoryDate: date }
}

export type WalkStep = { string: number; fret: number; finger: number }

// string 0 is the high e, 5 the low E, as on the fretboard strip.
export function walkFor(warmup: Warmup): WalkStep[] {
  const strings = warmup.order === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0]
  const shape = warmup.order === 'reach' ? [1, 2, 4, 3] : [1, 2, 3, 4]
  return strings.flatMap((string) => shape.map((fret) => ({ string, fret, finger: fret })))
}

// A clean bar: its chord held for 300 ms before the third beat.
export class BarChecker {
  clean = new Set<number>()
  private bar = -1
  private closeSince: number | null = null

  constructor(private stableMs: number) {}

  update(bar: number, beat: number, close: boolean, now: number) {
    if (bar !== this.bar) {
      this.bar = bar
      this.closeSince = null
    }
    if (!close) {
      this.closeSince = null
      return
    }
    this.closeSince ??= now
    if (beat < 2 && now - this.closeSince >= this.stableMs) this.clean.add(bar)
  }
}
