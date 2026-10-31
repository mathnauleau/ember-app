import { useEffect, useRef, useState } from 'react'
import { micErrorMessage, startMic, type Snapshot } from './mic'
import { nearestString } from './pitch'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const fixed = (value: number, digits: number) => value.toFixed(digits)
const millis = (seconds: number | undefined) =>
  seconds === undefined ? 'not available' : `${fixed(seconds * 1000, 1)} ms`
const signedCents = (cents: number) => `${cents >= 0 ? '+' : '−'}${fixed(Math.abs(cents), 1)}¢`

function Stat({ name, value }: { name: string; value: string }) {
  return (
    <div className="stat">
      <dt>{name}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stop = useRef<(() => void) | null>(null)

  useEffect(() => () => stop.current?.(), [])

  const start = async () => {
    setStarting(true)
    setError(null)
    try {
      stop.current = await startMic(setSnapshot, () => {
        stop.current?.()
        stop.current = null
        setSnapshot(null)
        setError('The mic stopped. Tap to start it again.')
      })
    } catch (e) {
      setError(micErrorMessage(e))
    }
    setStarting(false)
  }

  if (!snapshot) {
    return (
      <main className="start">
        <button onClick={start} disabled={starting}>{starting ? 'Starting…' : 'Tap to start'}</button>
        {error && <p className="error" role="alert">{error}</p>}
      </main>
    )
  }

  const string = snapshot.smoothedHz === null ? null : nearestString(snapshot.smoothedHz)

  return (
    <main className="readout">
      <p className={`label ${snapshot.label}`}>{snapshot.label}</p>
      <p className="hz">{snapshot.smoothedHz === null ? '—' : `${fixed(snapshot.smoothedHz, 2)} Hz`}</p>
      <p className="string">{string ? `${string.name} ${signedCents(string.cents)}` : '—'}</p>
      <dl>
        <Stat name="Raw" value={`${fixed(snapshot.rawHz, 2)} Hz`} />
        <Stat name="Clarity" value={fixed(snapshot.clarity, 3)} />
        <Stat name="RMS" value={fixed(snapshot.rms, 4)} />
        <Stat name="Noise floor" value={snapshot.noiseFloor === null ? 'measuring…' : fixed(snapshot.noiseFloor, 4)} />
        <Stat name="Octave jumps" value={String(snapshot.octaveJumps)} />
        <Stat name="AudioContext" value={snapshot.contextState} />
        <Stat name="Sample rate" value={`${snapshot.sampleRate} Hz`} />
        <Stat name="Base latency" value={millis(snapshot.baseLatency)} />
        <Stat name="Output latency" value={millis(snapshot.outputLatency)} />
        <Stat name="Running as" value={isStandalone() ? 'home-screen app' : 'browser'} />
      </dl>
    </main>
  )
}
