import { useEffect } from 'react'
import { ArrowRight, Flame, Volume, VolumeOff } from '../components/icons'
import { SummaryFire } from '../components/FireArt'
import chordData from '../data/chords.json'
import { currentSong, learnedChords, patternFor, theoryCard } from '../engine/curriculum'
import { longDate, today } from '../lib/dates'
import { count, plural } from '../lib/words'
import { clearSession, markTheorySeen } from '../store/session'
import { updateSettings, useProgress } from '../store/progress'

export function Summary({ go }: { go: (route: string) => void }) {
  const progress = useProgress()
  const { session, settings, streak, streakBefore, lastSessionDate, learnedCount, patternLevel } = progress
  const quick = session?.minutes === 10

  useEffect(() => {
    if (!session) go('/')
  }, [session, go])

  // The quick session has no theory step, so its card lands here.
  useEffect(() => {
    if (quick) markTheorySeen()
  }, [quick])

  if (!session) return null

  const counted = lastSessionDate === session.date
  const back = counted && streakBefore > 0
  const learned = learnedChords(learnedCount)
  const chords = learned.slice(-3).join(' · ')
  const song = currentSong(progress.currentSong, learned)
  const card = theoryCard(progress, today())
  const newChord = session.newChord ? chordData[session.newChord as keyof typeof chordData] : null
  const tomorrow = newChord
    ? `A new chord: ${newChord.name} ${newChord.quality}.`
    : back
      ? `Same chords, a gentle restart: ${chords}.`
      : `Same chords, another night by the fire: ${chords}.`
  const logs = session.logged.length
  const stats = [
    ['Time played', `${session.minutes} min`],
    ['Chords', chords],
    ['Strum', patternFor(patternLevel).name],
    ['Song', `${song.title}, verse`],
  ]

  const done = () => {
    clearSession()
    go('/')
  }

  return (
    <main className="screen screen-home">
      <header className="home-bar">
        <Flame size={24} color="var(--ember-500)" />
        <span className="home-brand">Ember</span>
        <span className="home-rule" />
        <span className="home-date">{longDate()}</span>
        <span className="spacer" />
        <button
          className="btn btn-pill"
          aria-label="Toggle crackle sound"
          aria-pressed={settings.sound}
          onClick={() => updateSettings({ sound: !settings.sound })}
        >
          {settings.sound ? <Volume color="var(--ember-500)" /> : <VolumeOff color="var(--cream-500)" />}
          Crackle {settings.sound ? 'on' : 'off'}
        </button>
      </header>

      <div className="summary">
        <div className="home-fire">
          <div className="summary-fire-art">
            <SummaryFire back={back} />
          </div>
          <div className="home-streak summary-streak">
            <span className="home-streak-number tnum">{streak}</span>
            <span className="home-date">
              {back ? `night tonight · ${streakBefore} kept before` : plural(streak, 'night in a row', 'nights in a row')}
            </span>
            {counted && !back && <span className="summary-plus">+1 tonight</span>}
          </div>
        </div>
        <div className="summary-panel">
          <div className="summary-copy">
            <span className="kicker">{back ? 'Welcome back' : `Night ${streak}`} · {session.minutes} min</span>
            <h1 className="home-title">{back ? 'The fire’s still here.' : 'The fire’s lit.'}</h1>
            <p className="lede lede-left">
              {back
                ? 'The embers warmed back up as you played. Tomorrow adds the next log.'
                : quick
                  ? `${count(logs)} ${plural(logs, 'log', 'logs')} on tonight, and the theory card waits here.`
                  : `${count(logs)} ${plural(logs, 'log', 'logs')} on tonight. See you by the fire tomorrow.`}
            </p>
          </div>
          <div className="summary-stats">
            {stats.map(([name, value]) => (
              <div key={name} className="summary-stat">
                <span className="muted summary-stat-name">{name}</span>
                <span className="summary-stat-value tnum">{value}</span>
              </div>
            ))}
          </div>
          {quick && (
            <div className="summary-card">
              <div className="summary-card-notes">
                {card.notes.slice(0, 3).map((note, i) => <span key={i} className="summary-card-note">{note}</span>)}
              </div>
              <div className="summary-card-text">
                <span className="debug-label">Theory card of the day</span>
                <span className="summary-card-title">{card.title}</span>
              </div>
            </div>
          )}
          <div className="summary-tomorrow">
            <span className="debug-label">Tomorrow</span>
            <span className="summary-tomorrow-text">{tomorrow}</span>
          </div>
          <div className="summary-actions">
            <button className="btn btn-primary summary-done" onClick={done}>
              Done
              <ArrowRight size={24} color="var(--ember-500)" />
            </button>
            <button
              className="btn btn-secondary summary-more"
              onClick={() => {
                clearSession()
                go('/session/chords')
              }}
            >
              Practice a bit more
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
