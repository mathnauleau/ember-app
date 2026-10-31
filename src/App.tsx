import { useSyncExternalStore } from 'react'
import { Calibration } from './screens/Calibration'
import { Debug } from './screens/Debug'
import { Home } from './screens/Home'
import { Settings } from './screens/Settings'
import { SessionPreview } from './screens/session/SessionPreview'
import { ChordStep } from './screens/session/ChordStep'
import { StrumStep } from './screens/session/StrumStep'
import { TuneStep } from './screens/session/TuneStep'

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

const readRoute = () => window.location.hash.slice(1) || '/'
const go = (route: string) => {
  window.location.hash = route
}

export function App() {
  const [route, chords] = useSyncExternalStore(subscribe, readRoute).split('?')

  switch (route) {
    case '/settings':
      return <Settings go={go} />
    case '/calibration':
      return <Calibration go={go} />
    case '/debug':
      return <Debug go={go} />
    case '/session/tune':
      return <TuneStep go={go} />
    case '/session/chords':
      return <ChordStep go={go} pair={chords?.split(',')} />
    case '/session/strum':
      return <StrumStep go={go} />
    case '/session/time-up':
      return <SessionPreview key={route} start="time-up" go={go} />
    case '/session/no-mic':
      return <SessionPreview key={route} start="no-mic" go={go} />
    default:
      return <Home go={go} />
  }
}
