import { describe, expect, it } from 'vitest'
import chords from '../data/chords.json'
import curriculum from '../data/curriculum.json'
import patterns from '../data/patterns.json'
import songs from '../data/songs.json'
import theory from '../data/theory.json'
import {
  afterChordPass,
  afterStrumSession,
  afterTheorySeen,
  BarChecker,
  currentSong,
  drillPair,
  earnedStrumCredit,
  isUnlocked,
  learnedChords,
  missingChords,
  patternFor,
  theoryCard,
  walkFor,
  warmupsFor,
} from './curriculum'

describe('chords', () => {
  it('starts on the first two curriculum chords', () => {
    expect(learnedChords(2)).toEqual(['Em', 'Am'])
  })

  it('takes turns on the hold, drilling the two newest', () => {
    expect(drillPair(2, 0)).toEqual(['Am', 'Em'])
    expect(drillPair(2, 1)).toEqual(['Em', 'Am'])
    expect(drillPair(3, 0)).toEqual(['D', 'Am'])
  })

  it('adds a chord only after three passed sessions', () => {
    let s = { learnedCount: 2, setPasses: 0 }
    for (const expected of [null, null, 'D']) {
      const next = afterChordPass(s)
      expect(next.newChord).toBe(expected)
      s = next
    }
    expect(s).toMatchObject({ learnedCount: 3, setPasses: 0 })
  })

  it('walks the whole order, then stops', () => {
    let s = { learnedCount: 2, setPasses: 0 }
    for (let i = 0; i < 40; i++) s = afterChordPass(s)
    expect(s.learnedCount).toBe(curriculum.chordOrder.length)
    expect(afterChordPass(s).newChord).toBeNull()
  })

  it('has a voicing for every curriculum and song chord', () => {
    for (const name of curriculum.chordOrder) expect(chords).toHaveProperty(name)
    for (const song of songs) for (const bar of song.bars) expect(chords).toHaveProperty(bar)
  })
})

describe('strum patterns', () => {
  it('rates patterns one to five', () => {
    expect(patterns.map((p) => p.level)).toEqual([1, 2, 3, 4, 5])
    for (const p of patterns) expect(p.slots).toHaveLength(8)
  })

  it('gives every pattern an off-beat strum, so timing feedback can run', () => {
    for (const p of patterns) expect(p.slots.some((s, i) => i % 2 === 1 && s !== '_')).toBe(true)
  })

  it('needs half the bars on time, from enough bars', () => {
    expect(earnedStrumCredit(2, 4)).toBe(true)
    expect(earnedStrumCredit(1, 4)).toBe(false)
    expect(earnedStrumCredit(3, 3)).toBe(false)
  })

  it('advances after three good sessions, and bad ones do not count', () => {
    let s = { patternLevel: 1, strumGood: 0 }
    s = afterStrumSession(s, 8, 10)
    s = afterStrumSession(s, 1, 10)
    s = afterStrumSession(s, 8, 10)
    expect(s).toEqual({ patternLevel: 1, strumGood: 2 })
    expect(afterStrumSession(s, 8, 10)).toEqual({ patternLevel: 2, strumGood: 0 })
  })

  it('stays on the last pattern', () => {
    expect(afterStrumSession({ patternLevel: 5, strumGood: 2 }, 8, 10).patternLevel).toBe(5)
    expect(patternFor(9).level).toBe(5)
  })
})

describe('songs', () => {
  it('has a song for the first two chords', () => {
    expect(songs.filter((s) => isUnlocked(s, ['Em', 'Am'])).map((s) => s.id)).toEqual(['evening-road'])
  })

  it('names the missing chords', () => {
    expect(missingChords(songs[3], ['Em', 'Am'])).toEqual(['Dm', 'E'])
  })

  it('never picks a locked song, and honours a choice', () => {
    expect(currentSong('swing-low', ['Em', 'Am']).id).toBe('evening-road')
    expect(currentSong('evening-road', ['Em', 'Am', 'D']).id).toBe('evening-road')
  })

  it('moves to the newest open song by default', () => {
    expect(currentSong(null, ['Em', 'Am', 'D']).id).toBe('drunken-sailor')
  })

  it('keeps every song to eight bars with no lyrics', () => {
    for (const s of songs) {
      expect(s.bars).toHaveLength(8)
      expect(s).not.toHaveProperty('lyrics')
    }
  })
})

describe('warm-ups', () => {
  it('rotates daily and shows two different exercises', () => {
    const [a, b] = warmupsFor('2026-11-01')
    const [c] = warmupsFor('2026-11-02')
    expect(a.id).not.toBe(b.id)
    expect(c.id).toBe(b.id)
  })

  it('walks every string with four notes', () => {
    expect(walkFor(warmupsFor('2026-11-01')[0])).toHaveLength(24)
  })

  it('goes thick to thin going up, thin to thick coming down', () => {
    const up = walkFor({ id: 'a', name: '', sub: '', order: 'up', bpm: 60 })
    const down = walkFor({ id: 'b', name: '', sub: '', order: 'down', bpm: 60 })
    expect(up[0].string).toBe(5)
    expect(down[0].string).toBe(0)
  })
})

describe('theory', () => {
  it('shows one card a day, in order, without repeats until the set is done', () => {
    let s = { theorySeen: 0, theoryDate: null as string | null }
    const titles: string[] = []
    for (let d = 1; d <= theory.length; d++) {
      const date = `2026-11-${String(d).padStart(2, '0')}`
      titles.push(theoryCard(s, date).title)
      s = afterTheorySeen(s, date)
      expect(theoryCard(s, date).title).toBe(titles[titles.length - 1])
    }
    expect(new Set(titles).size).toBe(theory.length)
    expect(theoryCard(s, '2026-12-01').title).toBe(titles[0])
  })

  it('counts a card once a day', () => {
    const once = afterTheorySeen({ theorySeen: 0, theoryDate: null }, '2026-11-01')
    expect(afterTheorySeen(once, '2026-11-01')).toEqual(once)
  })

  it('waits on an unseen card', () => {
    const s = { theorySeen: 0, theoryDate: null }
    expect(theoryCard(s, '2026-11-01').title).toBe(theoryCard(s, '2026-11-05').title)
  })
})

describe('song bars', () => {
  it('counts a bar clean when the chord lands before beat three', () => {
    const b = new BarChecker(300)
    b.update(1, 0, true, 0)
    b.update(1, 0, true, 299)
    expect(b.clean.has(1)).toBe(false)
    b.update(1, 1, true, 300)
    expect(b.clean.has(1)).toBe(true)
  })

  it('calls a chord landing after beat two late', () => {
    const b = new BarChecker(300)
    b.update(2, 2, true, 0)
    b.update(2, 3, true, 1000)
    expect(b.clean.has(2)).toBe(false)
  })

  it('needs the chord held, not a flicker', () => {
    const b = new BarChecker(300)
    b.update(3, 0, true, 0)
    b.update(3, 0, false, 200)
    b.update(3, 1, true, 250)
    b.update(3, 1, true, 400)
    expect(b.clean.has(3)).toBe(false)
  })
})
