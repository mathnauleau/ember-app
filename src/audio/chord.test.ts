import { describe, expect, it } from 'vitest'
import { CHORD, DEFAULT_THRESHOLDS } from '../config/thresholds'
import chords from '../data/chords.json'
import {
  ChangeCounter,
  chordPitchClasses,
  chordTemplate,
  chromaFromSpectrum,
  ChordTracker,
  cosine,
  isCloseEnough,
  NOTES,
  pitchClass,
  scoreChords,
} from './chord'
import { fretHz } from './synth'

const SAMPLE_RATE = 48000
const { close, margin } = DEFAULT_THRESHOLDS

// Radix-2 FFT with the analyser's Blackman window, returning dB like getFloatFrequencyData.
function spectrumOf(signal: Float64Array) {
  const n = signal.length
  const re = Float64Array.from(signal, (v, i) => {
    const x = (2 * Math.PI * i) / n
    return v * (0.42 - 0.5 * Math.cos(x) + 0.08 * Math.cos(2 * x))
  })
  const im = new Float64Array(n)
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) [re[i], re[j]] = [re[j], re[i]]
  }
  for (let len = 2; len <= n; len <<= 1) {
    const step = (-2 * Math.PI) / len
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const c = Math.cos(step * k)
        const s = Math.sin(step * k)
        const a = i + k
        const b = a + len / 2
        const tr = re[b] * c - im[b] * s
        const ti = re[b] * s + im[b] * c
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
      }
    }
  }
  return Float32Array.from({ length: n / 2 }, (_, k) => 20 * Math.log10(Math.hypot(re[k], im[k]) / n + 1e-12))
}

// Guitar-like strum: every sounding string with its decaying overtones, plus a little room noise.
function strum(frets: number[], gain = 0.05) {
  let seed = 7
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
  const out = new Float64Array(CHORD.fftSize)
  const partials = [0.6, 1, 0.5, 0.3, 0.2, 0.12]
  frets.forEach((fret, string) => {
    if (fret < 0) return
    const hz = fretHz(string, fret)
    partials.forEach((amp, k) => {
      for (let i = 0; i < out.length; i++) out[i] += gain * amp * Math.sin((2 * Math.PI * hz * (k + 1) * i) / SAMPLE_RATE)
    })
  })
  return out.map((v) => v + noise() * 0.0005)
}

const chromaOf = (frets: number[]) => chromaFromSpectrum(spectrumOf(strum(frets)), SAMPLE_RATE, CHORD.fftSize)
const names = Object.keys(chords) as (keyof typeof chords)[]

describe('chord voicings', () => {
  it('reads the right notes from each shape', () => {
    const notes = (n: keyof typeof chords) => chordPitchClasses(chords[n].frets).map((p) => NOTES[p]).sort()
    expect(notes('Em')).toEqual(['B', 'E', 'G'])
    expect(notes('Am')).toEqual(['A', 'C', 'E'])
    expect(notes('D')).toEqual(['A', 'D', 'F♯'])
    expect(notes('G')).toEqual(['B', 'D', 'G'])
    expect(notes('C')).toEqual(['C', 'E', 'G'])
    expect(notes('Dm')).toEqual(['A', 'D', 'F'])
  })

  it('weights the bass note higher', () => {
    const em = chordTemplate(chords.Em.frets)
    expect(em[pitchClass(82.41)]).toBeGreaterThan(em[pitchClass(196)])
  })
})

describe('chroma', () => {
  it('finds a single note in the right bin', () => {
    const tone = new Float64Array(CHORD.fftSize).map((_, i) => 0.2 * Math.sin((2 * Math.PI * 440 * i) / SAMPLE_RATE))
    const chroma = chromaFromSpectrum(spectrumOf(tone), SAMPLE_RATE, CHORD.fftSize)
    expect(chroma.indexOf(Math.max(...chroma))).toBe(9)
  })

  it('stays empty on digital silence', () => {
    expect(chromaFromSpectrum(new Float32Array(8192).fill(-Infinity), SAMPLE_RATE, CHORD.fftSize)).toEqual(new Array(12).fill(0))
  })
})

describe('chord check', () => {
  it.each(names)('recognises %s among all eight chords', (name) => {
    const scores = scoreChords(chromaOf(chords[name].frets), chords)
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
    expect(best).toBe(name)
    expect(scores[name]).toBeGreaterThan(close)
  })

  it.each([['Em', 'Am'], ['Am', 'Em'], ['G', 'C'], ['C', 'G'], ['D', 'G'], ['Em', 'G']] as const)(
    'passes %s against rival %s by the margin',
    (target, rival) => {
      const scores = scoreChords(chromaOf(chords[target].frets), { [target]: chords[target], [rival]: chords[rival] })
      expect(isCloseEnough(scores, target, close, margin).close).toBe(true)
    },
  )

  it('does not pass a played chord as a different target', () => {
    const scores = scoreChords(chromaOf(chords.Am.frets), { Em: chords.Em, Am: chords.Am })
    expect(isCloseEnough(scores, 'Em', close, margin).close).toBe(false)
  })

  it('does not pass a single open string as the chord', () => {
    const lowE = chromaOf([0, -1, -1, -1, -1, -1])
    const scores = scoreChords(lowE, { Em: chords.Em, Am: chords.Am })
    expect(isCloseEnough(scores, 'Am', close, margin).close).toBe(false)
  })

  it('scores identical vectors at one', () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1)
    expect(cosine([0, 0], [1, 1])).toBe(0)
  })
})

describe('hold', () => {
  const tick = (t: ChordTracker, from: number, to: number, close: boolean, sounding = true) => {
    let mode
    for (let now = from; now <= to; now += 100) mode = t.update({ close, sounding, noisy: false, now })
    return mode
  }

  it('completes after two seconds close', () => {
    const t = new ChordTracker(0)
    tick(t, 0, 1900, true)
    expect(t.held).toBe(false)
    tick(t, 2000, 2100, true)
    expect(t.held).toBe(true)
  })

  it('decays slowly and never resets outright', () => {
    const t = new ChordTracker(0)
    tick(t, 0, 1000, true)
    const before = t.hold
    tick(t, 1100, 2100, false)
    expect(t.hold).toBeGreaterThan(0)
    expect(before - t.hold).toBeCloseTo(CHORD.holdDecayPerSecond, 1)
  })

  it('says try again after sustained wrong sound, then lingers', () => {
    const t = new ChordTracker(0)
    expect(tick(t, 0, 200, false)).toBe('listening')
    expect(tick(t, 300, 800, false)).toBe('retry')
    expect(tick(t, 900, 1500, false, false)).toBe('retry')
    expect(tick(t, 1600, 3600, false, false)).toBe('listening')
  })

  it('goes quiet after a long silence without nudging', () => {
    const t = new ChordTracker(0)
    expect(tick(t, 0, 7900, false, false)).toBe('listening')
    expect(tick(t, 8000, 8100, false, false)).toBe('silent')
  })
})

describe('change drill', () => {
  it('counts a change once the new chord holds 300 ms', () => {
    const c = new ChangeCounter()
    c.update('Em', true, 0)
    c.update('Em', true, 400)
    c.update('Am', true, 1000)
    expect(c.update('Am', true, 1299)).toBe(0)
    expect(c.update('Am', true, 1300)).toBe(1)
    expect(c.update('Am', true, 2000)).toBe(1)
  })

  it('does not count staying on the old chord or a wobble', () => {
    const c = new ChangeCounter()
    c.update('Em', true, 0)
    c.update('Em', true, 400)
    c.update('Am', false, 1000)
    c.update('Am', true, 1100)
    c.update('Am', false, 1300)
    expect(c.update('Am', true, 1400)).toBe(0)
    expect(c.update('Am', true, 1700)).toBe(1)
  })

  it('does not count sitting on one chord while the target leaves and returns', () => {
    const c = new ChangeCounter()
    c.update('Em', true, 0)
    c.update('Em', true, 1000)
    c.update('Am', false, 4000)
    c.update('Am', false, 7000)
    c.update('Em', true, 8000)
    expect(c.update('Em', true, 9000)).toBe(0)
  })

  it('does not count the very first chord', () => {
    const c = new ChangeCounter()
    expect(c.update('Em', true, 0)).toBe(0)
    expect(c.update('Em', true, 500)).toBe(0)
  })
})
