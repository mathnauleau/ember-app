import { useRef, useState } from 'react'
import { chordPitchClasses, NOTES } from '../audio/chord'
import { centsBetween, median, nearestStringIndex, rmsToDb, STRINGS } from '../audio/pitch'
import type { Onset } from '../audio/strumTiming'
import { useChordCheck } from '../audio/useChordCheck'
import { useMetronome } from '../audio/useMetronome'
import { useMic } from '../audio/useMic'
import { BackBar } from '../components/ui'
import chords from '../data/chords.json'
import type { Thresholds } from '../config/thresholds'
import { updateThresholds, useProgress } from '../store/progress'

const SLIDERS: {
  key: keyof Thresholds
  label: string
  min: number
  max: number
  step: number
  show: (v: number) => string
}[] = [
  { key: 'floor', label: 'Silent below', min: -80, max: -30, step: 1, show: (v) => `${v} dB` },
  { key: 'noisy', label: 'Noisy floor above', min: -50, max: -10, step: 1, show: (v) => `${v} dB` },
  { key: 'close', label: 'Close enough', min: 0.5, max: 0.95, step: 0.01, show: (v) => v.toFixed(2) },
  { key: 'margin', label: 'Win margin', min: 0, max: 0.3, step: 0.01, show: (v) => v.toFixed(2) },
  { key: 'onTime', label: 'On time within', min: 20, max: 150, step: 5, show: (v) => `±${v} ms` },
]

const STATE_LABEL = {
  idle: 'Mic off',
  starting: 'Starting',
  measuring: 'Measuring floor',
  silent: 'Silent',
  listening: 'Listening',
  noisy: 'Noisy',
  stalled: 'No sound, tap to retry',
}

const SCORED = Object.fromEntries((['Em', 'Am', 'G', 'C'] as const).map((n) => [n, chords[n]]))
const GRID_SLOTS = 16
const DEBUG_BPM = 72

const dbToX = (db: number) => `${Math.max(0, Math.min(100, ((db + 80) / 80) * 100))}%`
const signed = (v: number, digits = 0) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}`
const dbLabel = (rms: number) => (rms > 0 ? `${signed(rmsToDb(rms))} dB` : '— dB')

export function Debug({ go }: { go: (route: string) => void }) {
  const { settings, thresholds: th } = useProgress()
  const onsets = useRef<Onset[]>([])
  const { reading: mic, error, start } = useMic({ chroma: true, onOnset: (onset) => onsets.current.push(onset) })
  const click = useMetronome({ bpm: DEBUG_BPM })
  const [target, setTarget] = useState('Em')
  const check = useChordCheck(mic, { target, chords: SCORED })
  const targetNotes = chordPitchClasses(SCORED[target].frets)
  const chroma = mic.chroma ?? new Array<number>(12).fill(0)

  // Last two bars of the click, with each onset placed against its nearest slot.
  const grid = click.slots.current.slice(-GRID_SLOTS)
  const eighthS = 30 / DEBUG_BPM
  const compensationS = mic.latencyMs / 1000 + (settings.latencyOffsetMs ?? 0) / 1000
  const shown = !grid.length
    ? []
    : onsets.current
        .map((o) => {
          const time = o.time - compensationS
          const nearest = grid.reduce((a, b) => (Math.abs(b.time - time) < Math.abs(a.time - time) ? b : a))
          return { time, offsetMs: (time - nearest.time) * 1000, x: ((time - grid[0].time + eighthS / 2) / (GRID_SLOTS * eighthS)) * 100 }
        })
        .filter((o) => o.x >= 0 && o.x <= 100)

  const micOff = mic.status === 'idle'
  const string = mic.hz === null ? null : STRINGS[nearestStringIndex(mic.hz)]

  return (
    <main className="screen screen-flat">
      <BackBar label="Back" title="Debug" onBack={() => go('/settings')}>
        <span className="chip chip-ember">{STATE_LABEL[mic.status]}</span>
        {micOff && <button className="btn btn-pill" onClick={start}>Start mic</button>}
        {!micOff && (
          <button className="btn btn-pill" onClick={click.running ? click.stop : click.start}>
            {click.running ? 'Stop click' : 'Start click'}
          </button>
        )}
        <span className="spacer" />
        <span className="muted tnum">
          {mic.sampleRate ? `${mic.contextState} · ${mic.trackState} · ${mic.sampleRate / 1000} kHz · ${mic.latencyMs.toFixed(0)} ms · ` : ''}
          offset {settings.latencyOffsetMs ?? 0} ms
        </span>
      </BackBar>

      <div className="debug">
        <div className="debug-readouts">
          <section className="debug-block">
            <div className="debug-head">
              <span className="debug-label">Input level</span>
              <span className="tnum">{mic.status !== 'idle' && mic.rms === 0 ? 'digital silence' : dbLabel(mic.rms)}</span>
            </div>
            <div className="meter">
              <div className="meter-fill" style={{ width: dbToX(rmsToDb(mic.rms)) }} />
              <div className="meter-floor" style={{ left: dbToX(th.floor) }} />
              <div className="meter-noisy" style={{ left: dbToX(th.noisy) }} />
            </div>
            <div className="meter-key">
              <span>│ floor {signed(th.floor)} dB</span>
              <span>┆ noisy threshold</span>
              <span className="spacer" />
              <span className="tnum">room {mic.floorRms === null ? '—' : mic.floorRms === 0 ? 'digital silence' : dbLabel(mic.floorRms)} · jumps {mic.octaveJumps}</span>
            </div>
          </section>

          <section className="debug-pitch ruled">
            <span className="debug-label debug-pitch-label">Pitch</span>
            <span className="debug-hz tnum">{mic.hz === null ? '—' : mic.hz.toFixed(2)}</span>
            <span className="debug-unit">Hz → {string ? string.note + string.octave : '—'}</span>
            <span className="debug-cents tnum">
              {mic.hz !== null && string ? `${signed(centsBetween(mic.hz, string.hz), 1)}¢` : ''}
            </span>
            <span className="muted tnum">clarity {mic.clarity.toFixed(2)}</span>
          </section>

          {error && <p className="debug-error" role="alert">{error}</p>}

          <section className="debug-block ruled">
            <span className="debug-label">Chroma · target {target}</span>
            <div className="chroma">
              {chroma.map((v, i) => (
                <div key={i} className={targetNotes.includes(i) ? 'chroma-bar on' : 'chroma-bar'} style={{ height: `${v * 100}%` }} />
              ))}
            </div>
            <div className="chroma-notes">
              {NOTES.map((n, i) => (
                <span key={n} className={targetNotes.includes(i) ? 'on' : undefined}>{n}</span>
              ))}
            </div>
          </section>

          <section className="debug-block ruled">
            <div className="debug-head">
              <span className="debug-label">Onsets vs click · last 2 bars</span>
              <span className="tnum">{shown.length ? `median ${signed(median(shown.map((o) => o.offsetMs)))} ms` : 'no onsets yet'}</span>
            </div>
            <div className="onsets">
              {Array.from({ length: GRID_SLOTS }, (_, i) => (
                <span
                  key={i}
                  className={i % 2 ? 'onset-grid' : 'onset-grid beat-line'}
                  style={{ left: `${((i + 0.5) / GRID_SLOTS) * 100}%` }}
                />
              ))}
              {shown.map((o) => (
                <span
                  key={o.time}
                  className={`onset ${Math.abs(o.offsetMs) <= th.onTime ? 'on-time' : 'off-time'}`}
                  style={{ left: `${o.x}%` }}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="debug-controls">
          <span className="debug-label">Chord scores (cosine) · tap a chord to target it</span>
          {Object.keys(SCORED).map((name) => {
            const score = check.scores[name] ?? 0
            return (
              <button key={name} className={name === target ? 'score target' : 'score'} aria-pressed={name === target} onClick={() => setTarget(name)}>
                <span className="score-name">{name}</span>
                <div className="score-track">
                  <div className="score-fill" style={{ width: `${score * 100}%` }} />
                  <div className="score-mark" style={{ left: `${th.close * 100}%` }} />
                </div>
                <span className="score-value tnum">{score.toFixed(2)}</span>
              </button>
            )
          })}
          <span className="debug-note">
            Target margin over next best: <span className="tnum">{check.lead.toFixed(2)}</span> · hold {(check.hold * 2).toFixed(1)} s
          </span>

          <span className="debug-label ruled">Thresholds</span>
          {SLIDERS.map((s) => (
            <div key={s.key} className="slider">
              <span>{s.label}</span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={th[s.key]}
                aria-label={s.label}
                onChange={(e) => updateThresholds({ [s.key]: +e.target.value })}
              />
              <span className="slider-value tnum">{s.show(th[s.key])}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
