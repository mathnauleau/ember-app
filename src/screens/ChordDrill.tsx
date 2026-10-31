import type { ChordMode } from '../audio/chord'
import { ArrowRight, Mic } from '../components/icons'
import { ChordRing } from '../components/ChordRing'

export type DrillChord = { name: string; quality: string; frets: number[]; fingers: number[] }

const HOLD_SECONDS = 2

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function hintFor(frets: number[]) {
  const muted = frets.filter((f) => f < 0).length
  if (muted === 0) return 'Strum all six strings'
  return muted === 1 ? 'Strum five strings, from the A down' : 'Strum four strings, from the D down'
}

function copyFor(mode: ChordMode, label: string, hold: number) {
  switch (mode) {
    case 'close':
      return { chip: 'Sounds right', title: 'That’s ringing. Hold it.', sub: `Hold 2s · ${(hold * HOLD_SECONDS).toFixed(1)} of 2 seconds` }
    case 'retry':
      return { chip: 'Listening', title: 'Nearly. Have another go.', sub: 'Press just behind the frets and let each string ring.' }
    case 'silent':
      return { chip: 'Listening', title: 'Take your time.', sub: 'Strum whenever you’re ready. The fire is listening.' }
    case 'noisy':
      return { chip: 'Busy room', title: 'It’s a little loud in here.', sub: 'Move closer to the iPad, or tap Next when it sounds right to you.' }
    default:
      return { chip: 'Listening', title: `Play ${label} when you’re ready.`, sub: 'Let it ring for two seconds.' }
  }
}

export function HoldPhase({ label, chord, mode, hold }: { label: string; chord: DrillChord; mode: ChordMode; hold: number }) {
  const copy = copyFor(mode, label, hold)
  const chipTone = mode === 'close' ? 'chip chip-warm' : mode === 'listening' ? 'chip chip-ember' : 'chip'

  return (
    <div className="nomic">
      <div className="nomic-diagram">
        <ChordRing mode={mode} hold={hold} size={460} scale={1.15} frets={chord.frets} fingers={chord.fingers} label={`${label} chord diagram`} />
      </div>
      <div className="nomic-panel drill-panel">
        <div className="nomic-head">
          <span className="kicker">Phase 1 · Hold the shape</span>
          <span className={chipTone}>
            <Mic size={16} color="currentColor" />
            {copy.chip}
          </span>
        </div>
        <div className="chord-name">
          <span className="chord-letter tight">{chord.name}</span>
          <span className="chord-quality">{chord.quality}</span>
        </div>
        <div className="drill-copy">
          <h2 className={mode === 'close' ? 'title-state warm' : 'title-state'}>{copy.title}</h2>
          <p className="lede lede-left tnum">{copy.sub}</p>
        </div>
        <div className="drill-hint">
          <span className="debug-label">Hint</span>
          <span className="drill-hint-text">{hintFor(chord.frets)}</span>
        </div>
      </div>
    </div>
  )
}

export function ChangePhase({ first, second, firstChord, secondChord, onSecond, close, beat, changes, drillLeft }: {
  first: string
  second: string
  firstChord: DrillChord
  secondChord: DrillChord
  onSecond: boolean
  close: boolean
  beat: number
  changes: number
  drillLeft: number
}) {
  const active = close ? 'close' : 'listening'
  return (
    <div className="changes">
      <div className="changes-rings">
        <div className="changes-chord">
          <ChordRing mode={onSecond ? 'dim' : active} hold={(beat + 1) / 4} size={300} scale={0.72} frets={firstChord.frets} fingers={firstChord.fingers} label={`${first} chord diagram`} />
          <span className={onSecond ? 'changes-name off' : 'changes-name'}>{first}</span>
        </div>
        <span className="changes-arrow"><ArrowRight size={40} color="var(--cream-500)" weight={1.4} /></span>
        <div className="changes-chord">
          <ChordRing mode={onSecond ? active : 'dim'} hold={(beat + 1) / 4} size={300} scale={0.72} frets={secondChord.frets} fingers={secondChord.fingers} label={`${second} chord diagram`} />
          <span className={onSecond ? 'changes-name' : 'changes-name off'}>{second}</span>
        </div>
      </div>
      <div className="changes-panel">
        <div className="changes-head">
          <span className="kicker">Phase 2 · Changes</span>
          <h2 className="title-state">{first} to {second}, on the beat.</h2>
        </div>
        <div className="changes-beats">
          <div className="changes-beat-row">
            {[0, 1, 2, 3].map((n) => (
              <span key={n} className={n === beat ? 'change-beat on tnum' : 'change-beat tnum'}>{n + 1}</span>
            ))}
          </div>
          <span className="muted">60 bpm · change on 1</span>
        </div>
        <div className="changes-stats">
          <div className="changes-stat">
            <span className="changes-number tnum">{changes}</span>
            <span className="muted">clean changes</span>
          </div>
          <div className="changes-stat">
            <span className="changes-number soft tnum">{clock(drillLeft)}</span>
            <span className="muted">left in this drill</span>
          </div>
        </div>
        <div className="drill-hint plain">
          <span className="debug-label">Hint</span>
          <span className="drill-hint-text small">Lift all fingers together, land the new shape on 1.</span>
        </div>
      </div>
    </div>
  )
}
