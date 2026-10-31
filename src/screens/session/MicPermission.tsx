import { Mic } from '../../components/icons'

// The design's inline permission layout (Session 1b), shown on the first mic step of a session.
export function MicPermission({ error, starting, onAllow, onWithout }: {
  error: string | null
  starting: boolean
  onAllow: () => void
  onWithout: () => void
}) {
  return (
    <div className="nomic">
      <div className="nomic-diagram">
        <div className="perm-ring">
          <Mic size={96} color="var(--cream-500)" weight={1} />
        </div>
      </div>
      <div className="nomic-panel">
        <span className="kicker">Before we tune</span>
        <h2 className="title-state">Can the fire listen?</h2>
        <p className="dialog-body">Ember uses the mic to hear your guitar, right here on the iPad. Nothing is recorded or saved.</p>
        {error && <p className="perm-error" role="alert">{error}</p>}
        <button className="btn btn-primary medium" disabled={starting} onClick={onAllow}>
          <Mic color="var(--ember-500)" />
          {error ? 'Try again' : 'Allow microphone'}
        </button>
        <button className="btn btn-plain" onClick={onWithout}>Practice without listening</button>
      </div>
    </div>
  )
}
