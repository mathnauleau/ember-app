import type { Warmup as Exercise, WalkStep } from '../engine/curriculum'
import { Fretboard, type FretDot } from '../components/Fretboard'
import { Transport } from '../components/Transport'

const STRING_NAMES = ['high e', 'B', 'G', 'D', 'A', 'low E']

function dotsFor(walk: WalkStep[], position: number): FretDot[] {
  const current = walk[position]
  const walked = walk.slice(0, position).filter((s) => s.string !== current.string)
  const onString = walk.filter((s) => s.string === current.string)
  const here = onString.indexOf(current)
  return [
    ...walked.map((s) => ({ s: s.string, f: s.fret, kind: 'ghost' })),
    ...onString.map((s, i) => ({ s: s.string, f: s.fret, label: s.finger, kind: i < here ? 'done' : i === here ? 'next' : 'todo' })),
  ]
}

export function Warmup({ exercise, exerciseNumber, walk, position, bpm, paused, onBpmStep, onTogglePause }: {
  exercise: Exercise
  exerciseNumber: number
  walk: WalkStep[]
  position: number
  bpm: number
  paused: boolean
  onBpmStep: (delta: number) => void
  onTogglePause: () => void
}) {
  const step = walk[position]
  return (
    <div className="warmup">
      <div className="warmup-head">
        <div className="warmup-title">
          <span className="kicker">Warm-up · exercise {exerciseNumber} of 2</span>
          <span className="warmup-name">{exercise.name}</span>
          <span className="lede lede-lg lede-left">{exercise.sub}</span>
        </div>
        <div className="warmup-next">
          <span className="debug-label">Next finger</span>
          <span className={paused ? 'warmup-finger off tnum' : 'warmup-finger tnum'}>{step.finger}</span>
          <span className="home-date">fret {step.fret} · {STRING_NAMES[step.string]} string</span>
        </div>
      </div>
      <div className="warmup-board">
        <Fretboard width={1000} frets={5} dots={dotsFor(walk, position)} />
      </div>
      <div className="warmup-foot">
        <Transport bpm={bpm} paused={paused} onStep={onBpmStep} onToggle={onTogglePause} />
        <div className="warmup-note">
          {paused
            ? <span className="warmup-resting">Paused. Shake your hand out if it helps.</span>
            : <span className="drill-hint-text small soft">One finger per fret, one note per click. No mic, just play.</span>}
        </div>
      </div>
    </div>
  )
}
