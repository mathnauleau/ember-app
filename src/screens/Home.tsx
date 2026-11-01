import { useEffect, useState } from 'react'
import { ArrowRight, Flame, Gear, Volume, VolumeOff } from '../components/icons'
import { HomeFire } from '../components/FireArt'
import { fireLevel, isBroken, missedDays } from '../engine/streak'
import { canResume, currentStep, minutesLeft, PLANS, restartSession, type SessionMinutes } from '../engine/session'
import { longDate, nextDay, today, weekdayOf } from '../lib/dates'
import { count, plural } from '../lib/words'
import { beginSession, clearSession, dismissResumePrompt, isResumePromptDismissed, resumeWith } from '../store/session'
import { updateSettings, useProgress } from '../store/progress'
import { ResumeDialog } from './session/ResumeDialog'

function tonight(streak: number, last: string | null, date: string) {
  if (last === null) {
    return {
      kicker: 'Welcome',
      title: 'Let’s light your first fire.',
      body: 'A few quiet minutes with your guitar. Every step you finish adds a log.',
      streakText: 'nights so far',
    }
  }
  if (last === date) {
    return {
      kicker: `Night ${streak}`,
      title: 'The fire’s burning well.',
      body: 'Tonight’s logs are on. Come back tomorrow, or play a little more.',
      streakText: plural(streak, 'night in a row', 'nights in a row'),
    }
  }
  if (isBroken(last, date)) {
    return {
      kicker: 'Welcome back',
      title: 'The fire’s waiting.',
      body: 'The embers stayed warm while you were away. One session brings the flame back.',
      streakText: `${plural(streak, 'night kept', 'nights kept')} · resting since ${weekdayOf(nextDay(last))}`,
    }
  }
  if (missedDays(last, date) === 1) {
    return {
      kicker: `Night ${streak + 1}`,
      title: 'The fire’s burning low.',
      body: 'One night off is fine. Add tonight’s logs and it comes back.',
      streakText: plural(streak, 'night in a row', 'nights in a row'),
    }
  }
  return {
    kicker: `Night ${streak + 1}`,
    title: 'The fire’s burning well.',
    body: `${count(streak)} ${plural(streak, 'night', 'nights')} in a row. Add tonight’s logs and keep it warm.`,
    streakText: plural(streak, 'night in a row', 'nights in a row'),
  }
}

export function Home({ go }: { go: (route: string) => void }) {
  const { settings, session, streak, lastSessionDate } = useProgress()
  const [minutes, setMinutes] = useState<SessionMinutes>(settings.defaultMinutes)
  const date = today()
  const copy = tonight(streak, lastSessionDate, date)

  // A session left over from another night, or one already finished, can't be picked up.
  const tonights = session && session.date === date ? session : null
  const resumable = tonights && canResume(tonights) ? tonights : null
  const stale = session !== null && (!tonights || tonights.index >= PLANS[tonights.minutes].length)
  const shownMinutes = resumable?.minutes ?? minutes
  const plan = PLANS[shownMinutes]
  const [prompting, setPrompting] = useState(() => !isResumePromptDismissed())
  useEffect(() => {
    if (stale) clearSession()
  }, [stale])

  const start = () => {
    beginSession(minutes)
    go('/session')
  }

  // Stays on Home: the logs are kept, and the next Start begins from the top.
  const startFresh = () => {
    if (resumable) resumeWith(restartSession(resumable))
  }

  return (
    <main className={resumable && prompting ? 'screen screen-home dimmed' : 'screen screen-home'}>
      <header className="home-bar">
        <Flame size={24} color="var(--ember-500)" />
        <span className="home-brand">Ember</span>
        <span className="home-rule" />
        <span className="home-date">{longDate()}</span>
        <span className="spacer" />
        <button className="btn btn-icon" aria-label="Settings" onClick={() => go('/settings')}>
          <Gear />
        </button>
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

      <div className="home-main">
        <div className="home-fire">
          <div className="home-fire-art">
            <HomeFire level={fireLevel(lastSessionDate, date)} />
          </div>
          <div className="home-streak">
            <span className="home-streak-number tnum">{streak}</span>
            <span className="home-date">{copy.streakText}</span>
          </div>
        </div>
        <div className="home-tonight">
          <div className="home-copy">
            <span className="kicker">{copy.kicker}</span>
            <h1 className="home-title">{copy.title}</h1>
            <p className="lede lede-lg lede-left">{copy.body}</p>
          </div>
          {!resumable && (
            <div className="seg" role="radiogroup" aria-label="Session length">
              {([[15, 'Full'], [10, 'Quick']] as const).map(([value, label]) => (
                <button key={value} className="seg-opt seg-length" role="radio" aria-checked={minutes === value} onClick={() => setMinutes(value)}>
                  {value} min <span className="seg-note">{label}</span>
                </button>
              ))}
            </div>
          )}
          {resumable ? (
            <div className="home-resume">
              <button className="btn btn-primary home-start" onClick={() => go('/session')}>
                <span>Resume at {currentStep(resumable)?.name}</span>
                <ArrowRight size={26} color="var(--ember-500)" />
              </button>
              <button className="btn btn-plain" onClick={startFresh}>Start fresh</button>
            </div>
          ) : (
            <button className="btn btn-primary home-start" onClick={start}>
              <span>{lastSessionDate === date ? 'Play again' : 'Start tonight’s session'}</span>
              <ArrowRight size={26} color="var(--ember-500)" />
            </button>
          )}
        </div>
      </div>

      <footer className="home-logs">
        <div className="home-logs-head">
          <span className="debug-label">Tonight’s logs</span>
          <span className="muted tnum">{shownMinutes} min · {plan.length} logs</span>
        </div>
        <div className="home-log-row">
          {plan.map((step, i) => (
            <div key={step.id} className="home-log">
              <span className="home-log-number tnum">{String(i + 1).padStart(2, '0')}</span>
              <span className="home-log-name">{step.name}</span>
              <span className="home-log-minutes tnum">{step.minutes} min</span>
            </div>
          ))}
        </div>
      </footer>

      {resumable && prompting && (
        <ResumeDialog
          session={resumable}
          minutesLeft={minutesLeft(resumable)}
          onResume={() => go('/session')}
          onFresh={startFresh}
          onLater={() => {
            dismissResumePrompt()
            setPrompting(false)
          }}
        />
      )}
    </main>
  )
}
