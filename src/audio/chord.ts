import { CHORD } from '../config/thresholds'
import { fretHz } from './synth'

export const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const C0 = 16.3516

export type Chroma = number[]
export type ChordShape = { frets: number[] }

export const pitchClass = (hz: number) => ((Math.round(12 * Math.log2(hz / C0)) % 12) + 12) % 12

export function chordPitchClasses(frets: number[]) {
  return [...new Set(frets.flatMap((fret, string) => (fret < 0 ? [] : [pitchClass(fretHz(string, fret))])))]
}

// Spectrum in dB, as the analyser reports it. Only peaks count, so one partial lands in one note.
export function chromaFromSpectrum(spectrum: Float32Array, sampleRate: number, fftSize: number): Chroma {
  const chroma = new Array<number>(12).fill(0)
  const hzPerBin = sampleRate / fftSize
  const first = Math.max(1, Math.ceil(CHORD.minHz / hzPerBin))
  const last = Math.min(spectrum.length - 2, Math.floor(CHORD.maxHz / hzPerBin))

  let loudest = -Infinity
  for (let bin = first; bin <= last; bin++) if (spectrum[bin] > loudest) loudest = spectrum[bin]
  if (!Number.isFinite(loudest)) return chroma

  const floor = loudest - CHORD.rangeDb
  for (let bin = first; bin <= last; bin++) {
    const db = spectrum[bin]
    if (db > floor && db >= spectrum[bin - 1] && db > spectrum[bin + 1]) chroma[pitchClass(bin * hzPerBin)] += db - floor
  }
  const top = Math.max(...chroma)
  return top > 0 ? chroma.map((v) => v / top) : chroma
}

// Built from the real voicing: doubled notes count double, and the bass counts extra.
export function chordTemplate(frets: number[]): Chroma {
  const template = new Array<number>(12).fill(0)
  frets.forEach((fret, string) => {
    if (fret >= 0) template[pitchClass(fretHz(string, fret))] += 1
  })
  const bass = frets.findIndex((fret) => fret >= 0)
  template[pitchClass(fretHz(bass, frets[bass]))] += CHORD.bassWeight - 1
  return template
}

export function cosine(a: Chroma, b: Chroma) {
  let dot = 0
  let normA = 0
  let normB = 0
  a.forEach((v, i) => {
    dot += v * b[i]
    normA += v * v
    normB += b[i] * b[i]
  })
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0
}

export function scoreChords(chroma: Chroma, chords: Record<string, ChordShape>) {
  return Object.fromEntries(Object.entries(chords).map(([name, c]) => [name, cosine(chroma, chordTemplate(c.frets))]))
}

// Target-driven: it must score well and beat every rival by the margin.
export function isCloseEnough(scores: Record<string, number>, target: string, close: number, margin: number) {
  const rivals = Object.entries(scores).filter(([name]) => name !== target).map(([, s]) => s)
  const best = rivals.length ? Math.max(...rivals) : 0
  return { close: scores[target] >= close && scores[target] - best >= margin, lead: scores[target] - best }
}

export type ChordMode = 'listening' | 'close' | 'retry' | 'silent' | 'noisy'
export type ChordInput = {
  close: boolean
  sounding: boolean
  noisy: boolean
  now: number
}

// Hold builds while close and fades slowly otherwise: it never resets outright.
export class ChordTracker {
  hold = 0
  held = false
  private last: number | null = null
  private soundingSince: number | null = null
  private lastSound: number
  private lastMiss = -Infinity

  constructor(now: number) {
    this.lastSound = now
  }

  update({ close, sounding, noisy, now }: ChordInput): ChordMode {
    const dt = this.last === null ? 0 : (now - this.last) / 1000
    this.last = now
    if (sounding) {
      this.lastSound = now
      this.soundingSince ??= now
    } else {
      this.soundingSince = null
    }

    if (close && sounding) {
      this.hold = Math.min(1, this.hold + dt / CHORD.holdSeconds)
      if (this.hold >= 1) this.held = true
      return 'close'
    }
    this.hold = Math.max(0, this.hold - dt * CHORD.holdDecayPerSecond)

    if (noisy) return 'noisy'
    if (sounding && now - (this.soundingSince ?? now) >= CHORD.retryAfterMs) this.lastMiss = now
    if (now - this.lastMiss < CHORD.retryLingerMs) return 'retry'
    return now - this.lastSound >= CHORD.idleAfterMs ? 'silent' : 'listening'
  }
}

// A clean change: the previous chord was played, the target switched, and the new chord then
// stayed close for 300 ms. Sitting on one chord while the target comes back to it doesn't count.
export class ChangeCounter {
  count = 0
  private armed = false
  private playedTarget = false
  private target: string | null = null
  private closeSince: number | null = null

  update(target: string, close: boolean, now: number) {
    if (target !== this.target) {
      this.armed = this.playedTarget
      this.playedTarget = false
      this.target = target
      this.closeSince = null
    }
    if (!close) {
      this.closeSince = null
      return this.count
    }
    this.closeSince ??= now
    if (now - this.closeSince >= CHORD.stableChangeMs) this.playedTarget = true
    if (this.armed && now - this.closeSince >= CHORD.stableChangeMs) {
      this.count += 1
      this.armed = false
    }
    return this.count
  }
}
