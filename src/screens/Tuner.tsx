import type { MicStatus } from '../audio/mic'
import { STRINGS } from '../audio/pitch'
import { Gauge } from '../components/Gauge'
import { Lock, Mic } from '../components/icons'

export type TunerProps = {
  active: number
  cents: number
  signal: boolean
  inTune: boolean
  done: number[]
  micStatus: MicStatus
  lock: number | null
  onLock: (string: number | null) => void
}

function statusOf({ signal, inTune, cents, micStatus }: TunerProps) {
  if (micStatus === 'stalled') return "The mic isn't sending any sound"
  if (micStatus === 'measuring') return 'Stay quiet for a moment'
  if (!signal) return micStatus === 'noisy' ? "It's a little loud in here" : 'Pluck a string'
  if (inTune) return 'In tune'
  return cents < 0 ? 'A little flat · tighten slowly' : 'A little sharp · loosen slowly'
}

function centsLabel({ signal, cents, micStatus }: TunerProps) {
  if (micStatus === 'stalled') return 'Tap anywhere to wake it'
  if (micStatus === 'measuring') return 'Hearing the room'
  if (!signal) return 'Any one is fine'
  return `${cents >= 0 ? '+' : '−'}${Math.abs(Math.round(cents))} cents`
}

export function Tuner(props: TunerProps) {
  const { active, signal, inTune, done, micStatus, lock, onLock, cents } = props
  const string = STRINGS[active]
  const locked = lock !== null
  const noteState = !signal ? 'off' : inTune ? 'intune' : ''

  return (
    <div className="tuner">
      <div className="tuner-chips">
        <span className={locked ? 'chip chip-ember' : 'chip chip-mode'}>
          {locked && <Lock size={15} color="currentColor" />}
          <span>{locked ? `Locked to ${STRINGS[lock].note} · tap again for auto` : 'Auto-detect'}</span>
        </span>
        <span className="chip chip-quiet">
          <Mic size={15} color="currentColor" />
          {micStatus === 'noisy' ? 'Busy room' : 'Mic on'}
        </span>
      </div>

      <div className="tuner-reading">
        <div className="tuner-note-row">
          <span
            className={`tuner-note ${noteState}`}
            style={signal && !inTune ? { textShadow: `0 0 ${Math.max(0, 30 - Math.abs(cents))}px rgba(240,140,60,.35)` } : undefined}
          >
            {string.note}
          </span>
          <span className="tuner-octave tnum">{string.octave}</span>
        </div>
        <div className="tuner-status-row">
          <span className={`tuner-status ${inTune ? 'intune' : signal ? '' : 'off'}`}>{statusOf(props)}</span>
          <span className="tuner-cents tnum">{centsLabel(props)}</span>
        </div>
      </div>

      <div className="tuner-gauge">
        <Gauge cents={cents} mode={!signal ? 'nosig' : inTune ? 'intune' : 'live'} />
      </div>

      <div className="strings" role="group" aria-label="Strings">
        {STRINGS.map((s, i) => {
          const isActive = i === active
          const isDone = done.includes(i)
          const burning = isDone || (isActive && inTune)
          return (
            <button
              key={i}
              className={`string ${isActive ? (inTune ? 'active intune' : 'active') : isDone ? 'done' : ''}`}
              aria-label={`${s.note} string, ${s.sub}`}
              aria-pressed={lock === i}
              onClick={() => onLock(lock === i ? null : i)}
            >
              <span className={`string-log ${burning ? 'burning' : isActive ? 'lit' : ''}`} />
              <span className="string-note">{s.note}</span>
              <span className="string-sub">
                {lock === i && <Lock size={13} color="var(--ember-500)" weight={1.8} />}
                {s.sub}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
