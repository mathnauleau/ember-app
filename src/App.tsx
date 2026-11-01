import { useMemo, useState, useSyncExternalStore } from 'react'
import { Calibration } from './screens/Calibration'
import { Debug } from './screens/Debug'
import { Home } from './screens/Home'
import { Settings } from './screens/Settings'
import { singleStep } from './screens/session/context'
import { SessionRunner } from './screens/session/SessionRunner'
import { Summary } from './screens/Summary'
import { ChordStep } from './screens/session/ChordStep'
import { StrumStep } from './screens/session/StrumStep'
import { SongStep } from './screens/session/SongStep'
import { TheoryStep } from './screens/session/TheoryStep'
import { TuneStep } from './screens/session/TuneStep'
import { WarmupStep } from './screens/session/WarmupStep'
import type { StepId } from './engine/session'

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

const readRoute = () => window.location.hash.slice(1) || '/'
const go = (route: string) => {
  window.location.hash = route
}

// The /session/<step> routes run one step alone, for practice and tests: nothing is recorded.
function SingleStep({ id, query, go }: { id: StepId; query?: string; go: (route: string) => void }) {
  const [noMic, setNoMic] = useState(false)
  const context = useMemo(() => singleStep(id, go, noMic, setNoMic), [id, go, noMic])
  switch (id) {
    case 'tune':
      return <TuneStep context={context} />
    case 'warmup':
      return <WarmupStep context={context} />
    case 'chords':
      return <ChordStep context={context} pair={query?.split(',')} />
    case 'strum':
      return <StrumStep context={context} patternId={query} />
    case 'song':
      return <SongStep context={context} songId={query} />
    case 'theory':
      return <TheoryStep context={context} />
  }
}

export function App() {
  const [route, query] = useSyncExternalStore(subscribe, readRoute).split('?')

  switch (route) {
    case '/settings':
      return <Settings go={go} />
    case '/calibration':
      return <Calibration go={go} />
    case '/debug':
      return <Debug go={go} />
    case '/session':
      return <SessionRunner go={go} />
    case '/summary':
      return <Summary go={go} />
    default:
      if (route.startsWith('/session/')) return <SingleStep key={route} id={route.slice(9) as StepId} query={query} go={go} />
      return <Home go={go} />
  }
}
