import { Fragment } from 'react'
import type { StrumPattern, StrumPhase } from '../audio/useStrum'
import type { Verdict } from '../audio/strumTiming'
import { ArrowDown, ArrowUp, Guitar, Headphones, Minus, Pause, Play, Plus } from '../components/icons'

const COUNTS = ['1', '&', '2', '&', '3', '&', '4', '&']
const LEVELS = 5

const FEEDBACK: Record<Verdict | 'thin', { kicker: string; title: string; sub: string; dot: number }> = {
  on: { kicker: 'Last bar', title: 'On time', sub: 'Right with the click.', dot: 32 },
  early: { kicker: 'Last bar', title: 'A bit early', sub: 'Let the beat come to you.', dot: 14 },
  late: { kicker: 'Last bar', title: 'A bit late', sub: 'Start the strum a hair sooner.', dot: 50 },
  thin: { kicker: 'Last bar', title: 'Keep strumming', sub: 'A few more strums and the fire can follow you.', dot: 32 },
}

function panel(props: StrumProps) {
  if (props.micStalled) {
    return { kicker: 'Mic', title: "The mic isn't sending any sound", sub: 'Tap anywhere to wake it.', dot: 32, tone: 'idle' }
  }
  if (props.paused) {
    return { kicker: 'Paused', title: 'Resting on the beat', sub: 'Tap play when you’re ready.', dot: 32, tone: 'idle resting' }
  }
  if (props.phase === 'listen') {
    return {
      kicker: `Listen · bar ${props.listenBar} of 2`,
      title: 'Hear it first',
      sub: 'Hands off the strings. Your turn comes after two bars.',
      dot: 32,
      tone: 'idle',
    }
  }
  if (!props.feedback) {
    return { kicker: 'Your turn', title: 'Play along', sub: 'Feedback comes after each bar.', dot: 32, tone: 'idle' }
  }
  return { ...FEEDBACK[props.feedback], tone: props.feedback === 'on' ? 'on' : props.feedback === 'thin' ? 'idle' : 'off' }
}

type StrumProps = {
  pattern: StrumPattern
  phase: StrumPhase
  onPhase: (phase: StrumPhase) => void
  position: number
  bpm: number
  onBpmStep: (delta: number) => void
  paused: boolean
  onTogglePause: () => void
  onTap: () => void
  feedback: Verdict | 'thin' | null
  listenBar: number
  micStalled: boolean
}

export function Strum(props: StrumProps) {
  const { pattern, phase, onPhase, position, bpm, onBpmStep, paused, onTogglePause, onTap } = props
  const info = panel(props)
  const options: { value: StrumPhase; label: string; icon: typeof Guitar }[] = [
    { value: 'listen', label: '1 · Listen', icon: Headphones },
    { value: 'play', label: '2 · Play', icon: Guitar },
  ]

  return (
    <div className="strum">
      <div className="strum-head">
        <div className="strum-title">
          <span className="strum-name">{pattern.name}</span>
          <div className="strum-level">
            <span className="strum-dots" aria-label={`Difficulty ${pattern.level} of ${LEVELS}`}>
              {Array.from({ length: LEVELS }, (_, i) => (
                <span key={i} className={i < pattern.level ? 'dot on' : 'dot'} />
              ))}
            </span>
            <span className="strum-level-label">{pattern.level} of {LEVELS}</span>
          </div>
        </div>
        <div className="seg" role="radiogroup" aria-label="Phase">
          {options.map(({ value, label, icon: Icon }) => (
            <button key={value} className="seg-opt seg-icon" role="radio" aria-checked={phase === value} onClick={() => phase !== value && onPhase(value)}>
              <Icon size={20} color={phase === value ? 'var(--ember-500)' : 'var(--cream-500)'} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="strum-grid-wrap">
        <div className="strum-grid">
          {pattern.slots.map((stroke, i) => {
            const on = i === position
            const state = on ? (paused ? 'resting' : stroke === '_' ? 'now rest' : 'now') : ''
            const color = on && !paused ? 'var(--ember-300)' : 'var(--cream-100)'
            return (
              <Fragment key={i}>
                <div className="strum-slot-col">
                  <div className={`strum-slot ${state}`}>
                    {stroke === 'D' && <ArrowDown size={60} color={color} weight={1.8} />}
                    {stroke === 'U' && <ArrowUp size={60} color={color} weight={1.8} />}
                    {stroke === '_' && <span className="strum-rest" aria-label="rest" />}
                  </div>
                  <span className={`strum-count tnum ${on ? 'now' : i % 2 ? 'off' : ''}`}>{COUNTS[i]}</span>
                </div>
              </Fragment>
            )
          })}
        </div>
        <div className="strum-rail">
          <div className="strum-rail-line" />
          <div className={paused ? 'strum-ember resting' : 'strum-ember'} style={{ left: `${((position + 0.5) / 8) * 100}%` }} />
        </div>
      </div>

      <div className="strum-foot">
        <div className="strum-controls">
          <button className="btn btn-icon square" aria-label="Slower" onClick={() => onBpmStep(-2)}><Minus color="var(--cream-100)" /></button>
          <div className="strum-bpm">
            <span className="strum-bpm-value tnum">{bpm}</span>
            <span className="strum-bpm-label">bpm</span>
          </div>
          <button className="btn btn-icon square" aria-label="Faster" onClick={() => onBpmStep(2)}><Plus color="var(--cream-100)" /></button>
          <span className="strum-rule" />
          <button className="btn btn-icon play" aria-label={paused ? 'Start metronome' : 'Pause metronome'} onClick={onTogglePause}>
            {paused ? <Play size={24} color="var(--cream-100)" /> : <Pause size={24} color="var(--cream-100)" />}
          </button>
          <button className="btn btn-pill strum-tap" onClick={onTap}>Tap tempo</button>
        </div>
        <div className={`strum-feedback ${info.tone}`}>
          <div className="strum-meter" aria-hidden="true">
            <span className="strum-meter-line" />
            <span className={info.tone.startsWith('idle') ? 'strum-meter-dot idle' : 'strum-meter-dot'} style={{ left: info.dot }} />
          </div>
          <div className="strum-feedback-text">
            <span className="debug-label">{info.kicker}</span>
            <span className="strum-feedback-title">{info.title}</span>
            <span className="strum-feedback-sub">{info.sub}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
