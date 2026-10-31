import { Gear, Volume } from '../components/icons'
import { longDate } from '../lib/dates'
import { saveSession, updateSettings, useProgress } from '../store/progress'
import { PREVIEW_SESSION } from './session/SessionPreview'
import { ResumeDialog } from './session/ResumeDialog'

// Placeholder until the real Home (M4): header, Settings entry, and links to the edge states.
export function Home({ go }: { go: (route: string) => void }) {
  const { settings, session } = useProgress()

  return (
    <main className={session ? 'screen screen-home dimmed' : 'screen screen-home'}>
      <header className="home-bar">
        <span className="home-brand">Ember</span>
        <span className="home-rule" />
        <span className="home-date">{longDate()}</span>
        <span className="spacer" />
        <button
          className="btn btn-pill"
          aria-pressed={settings.sound}
          onClick={() => updateSettings({ sound: !settings.sound })}
        >
          <Volume color="var(--ember-500)" />
          Crackle {settings.sound ? 'on' : 'off'}
        </button>
        <button className="btn btn-icon" aria-label="Settings" onClick={() => go('/settings')}>
          <Gear />
        </button>
      </header>

      <div className="home-body">
        <div className="home-glow" />
        <div className="home-copy">
          <h1 className="title-display">The fire's burning well.</h1>
          <button className="btn btn-primary" onClick={() => go('/session/tune')}>Start tuning</button>
          <div className="home-links">
            <button className="btn btn-pill" onClick={() => go('/session/time-up')}>Timer ran out</button>
            <button className="btn btn-pill" onClick={() => go('/session/no-mic')}>Without listening</button>
            <button className="btn btn-pill" onClick={() => saveSession(PREVIEW_SESSION)}>Resume prompt</button>
          </div>
        </div>
      </div>

      {session && (
        <ResumeDialog
          session={session}
          onResume={() => {
            saveSession(null)
            go('/session/no-mic')
          }}
          onFresh={() => saveSession(null)}
        />
      )}
    </main>
  )
}
