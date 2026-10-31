import { CALIBRATION_BEATS, useCalibration, type Calibration as State } from '../audio/useCalibration'
import { BackBar } from '../components/ui'
import { today } from '../lib/dates'
import { updateSettings } from '../store/progress'

function copy(state: State) {
  switch (state.phase) {
    case 'idle':
      return {
        kicker: 'One-time setup',
        title: 'Strum along for 8 beats.',
        body: 'This tells Ember how long sound takes to travel through the iPad, so timing feedback stays fair. Headphones help.',
      }
    case 'running':
      return {
        kicker: `Beat ${state.beat + 1} of ${CALIBRATION_BEATS}`,
        title: 'Strum on every click.',
        body: 'Any chord, or muted strings. Just keep with the beat.',
      }
    case 'failed':
      return {
        kicker: 'Nearly',
        title: "The fire didn't catch enough strums.",
        body: 'Move closer to the iPad and strum firmly on each click.',
      }
    case 'done':
      return {
        kicker: 'Done',
        title: `Your strums land ${state.offsetMs} ms after the click.`,
        body: 'Ember will allow for that gap, so "on time" means on time for you.',
      }
  }
}

function beatClass(state: State, i: number) {
  if (state.phase === 'done') return 'beat past'
  if (state.phase !== 'running') return 'beat'
  if (i < state.beat) return 'beat past'
  if (i > state.beat) return 'beat'
  return state.flash ? 'beat now flash' : 'beat now'
}

export function Calibration({ go }: { go: (route: string) => void }) {
  const { state, start, reset, error, waiting } = useCalibration()
  const { kicker, title, body } = copy(state)

  const save = () => {
    if (state.phase !== 'done') return
    updateSettings({ latencyOffsetMs: state.offsetMs, latencyOffsetSetOn: today() })
    go('/settings')
  }

  return (
    <main className="screen screen-centered">
      <BackBar label="Back to Settings" title="Strum timing" onBack={() => go('/settings')} />
      <div className="stage">
        <span className="kicker">{kicker}</span>
        <h1 className="title-display">{title}</h1>
        <p className="lede">{body}</p>
        {error && <p className="perm-error" role="alert">{error}</p>}
        <div className="beats" aria-hidden="true">
          {Array.from({ length: CALIBRATION_BEATS }, (_, i) => (
            <span key={i} className={`${beatClass(state, i)} tnum`}>{i + 1}</span>
          ))}
        </div>
        {state.phase === 'idle' && (
          <button className="btn btn-primary cal-start" disabled={waiting} onClick={start}>Start the click</button>
        )}
        {state.phase === 'failed' && (
          <button className="btn btn-primary cal-start" onClick={reset}>Try again</button>
        )}
        {state.phase === 'done' && (
          <div className="cal-actions">
            <button className="btn btn-primary cal-save" onClick={save}>Save offset</button>
            <button className="btn btn-secondary cal-retry" onClick={start}>Try again</button>
          </div>
        )}
      </div>
    </main>
  )
}
