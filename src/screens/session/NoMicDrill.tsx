import { useState } from 'react'
import { ChordDiagram } from '../../components/ChordDiagram'
import { MicOff } from '../../components/icons'

const SELF_CHECKS = 3

export function NoMicDrill({ chord }: {
  chord: { name: string; quality: string; frets: number[]; fingers: number[] }
}) {
  const [count, setCount] = useState(0)

  return (
    <div className="nomic">
      <div className="nomic-diagram">
        <ChordDiagram frets={chord.frets} fingers={chord.fingers} label={`${chord.name} ${chord.quality} chord diagram`} />
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
        {/* Enabled once ChordDrill exists to go back to (M3). */}
        <button className="btn btn-plain" disabled>Turn listening on</button>
      </div>
    </div>
  )
}
