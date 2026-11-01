import { Dialog, Logs } from '../../components/ui'
import { currentStep, logStates, type Session } from '../../engine/session'
import { capitalized, plural, words } from '../../lib/words'

export function ResumeDialog({ session, minutesLeft, onResume, onFresh, onLater }: {
  session: Session
  minutesLeft: number
  onResume: () => void
  onFresh: () => void
  onLater: () => void
}) {
  const logs = session.logged.length
  const named = `${words(logs)} ${plural(logs, 'log', 'logs')}`
  const next = currentStep(session)?.name

  return (
    <Dialog label="Pick up where you left off?">
      <span className="kicker">Tonight's session</span>
      <h2 className="dialog-title">Pick up where you left off?</h2>
      <Logs states={logStates(session)} />
      <p className="dialog-body">
        {capitalized(named)} {logs === 1 ? 'is' : 'are'} already on. Next up is {next}, with about {minutesLeft} {plural(minutesLeft, 'minute', 'minutes')} to go.
      </p>
      <div className="dialog-actions">
        <button className="btn btn-primary medium" onClick={onResume}>Resume at {next}</button>
        <button className="btn btn-secondary" onClick={onFresh}>{logs > 0 ? `Start fresh, keep the ${named}` : 'Start fresh'}</button>
        <button className="btn btn-plain" onClick={onLater}>Not now</button>
      </div>
    </Dialog>
  )
}
