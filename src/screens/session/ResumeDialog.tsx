import { Dialog, Logs } from '../../components/ui'
import type { SavedSession } from '../../store/progress'

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six']
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

export function ResumeDialog({ session, onResume, onFresh }: {
  session: SavedSession
  onResume: () => void
  onFresh: () => void
}) {
  const { logsDone, nextStep, minutesLeft, totalSteps } = session
  const logs = `${WORDS[logsDone] ?? logsDone} ${logsDone === 1 ? 'log' : 'logs'}`
  const are = logsDone === 1 ? 'is' : 'are'

  return (
    <Dialog label="Pick up where you left off?">
      <span className="kicker">Tonight's session</span>
      <h2 className="dialog-title">Pick up where you left off?</h2>
      <Logs total={totalSteps} done={logsDone} lit={1} />
      <p className="dialog-body">
        {capitalize(logs)} {are} already on. Next up is {nextStep}, with about {minutesLeft} minutes to go.
      </p>
      <div className="dialog-actions">
        <button className="btn btn-primary medium" onClick={onResume}>Resume at {nextStep}</button>
        <button className="btn btn-secondary" onClick={onFresh}>
          {logsDone > 0 ? `Start fresh, keep the ${logs}` : 'Start fresh'}
        </button>
      </div>
    </Dialog>
  )
}
