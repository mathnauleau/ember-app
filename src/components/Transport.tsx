import { Minus, Pause, Play, Plus } from './icons'

// BPM and play/pause, shared by Warm-up and Song.
export function Transport({ bpm, paused, onStep, onToggle }: {
  bpm: number
  paused: boolean
  onStep: (delta: number) => void
  onToggle: () => void
}) {
  return (
    <div className="strum-controls">
      <button className="btn btn-icon square" aria-label="Slower" onClick={() => onStep(-2)}><Minus color="var(--cream-100)" /></button>
      <div className="strum-bpm">
        <span className="strum-bpm-value tnum">{bpm}</span>
        <span className="strum-bpm-label">bpm</span>
      </div>
      <button className="btn btn-icon square" aria-label="Faster" onClick={() => onStep(2)}><Plus color="var(--cream-100)" /></button>
      <span className="strum-rule" />
      <button className="btn btn-icon play" aria-label={paused ? 'Start metronome' : 'Pause metronome'} onClick={onToggle}>
        {paused ? <Play size={24} color="var(--cream-100)" /> : <Pause size={24} color="var(--cream-100)" />}
      </button>
    </div>
  )
}
