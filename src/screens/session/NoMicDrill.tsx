import { useState } from 'react'
import { ChordRing } from '../../components/ChordRing'
import { MicOff } from '../../components/icons'

const SELF_CHECKS = 3

export function NoMicDrill({ chord, onListen }: {
  chord: { name: string; quality: string; frets: number[]; fingers: number[] }
  onListen: () => void
}) {
  const [count, setCount] = useState(0)

  return (
    <div className="nomic">
      <div className="nomic-diagram">
        <ChordRing mode="plain" size={460} scale={1.15} frets={chord.frets} fingers={chord.fingers} label={`${chord.name} ${chord.quality} chord diagram`} />
      </div>
      <div className="nomic-panel">
        <div className="nomic-head">
          <span className="kicker">Phase 1 · Hold the shape</span>
          <span className="chip">
            <MicOff size={16} color="currentColor" />
            Not listening
          </span>
        </div>
        <div className="chord-name">
          <span className="chord-letter">{chord.name}</span>
          <span className="chord-quality">{chord.quality}</span>
        </div>
        <h2 className="title-state">Your ears are the judge tonight.</h2>
        <p className="lede lede-left">Strum, listen, and tap "Sounds right" when every string rings.</p>
        <button
          className="btn btn-primary medium"
          disabled={count >= SELF_CHECKS}
          onClick={() => setCount(count + 1)}
        >
          Sounds right · {count} of {SELF_CHECKS}
        </button>
        <button className="btn btn-plain" onClick={onListen}>Turn listening on</button>
      </div>
    </div>
  )
}
