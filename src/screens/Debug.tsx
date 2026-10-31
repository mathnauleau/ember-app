import {
  GRID_SLOTS,
  LATENCY_MS,
  NOTES,
  PITCH_TARGET_NAME,
  SAMPLE_RATE_KHZ,
  TARGET_NAME,
  TARGET_PITCH_CLASSES,
  useDebugSignal,
} from '../audio/debugSignal'
import { BackBar } from '../components/ui'
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

const dbToX = (db: number) => `${Math.max(0, Math.min(100, ((db + 80) / 80) * 100))}%`
const signed = (v: number, digits = 0) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}`

export function Debug({ go }: { go: (route: string) => void }) {
  const { settings, thresholds: th } = useProgress()
  const sig = useDebugSignal()

  const state = sig.db < th.floor + 4 ? 'Silent' : sig.db > th.noisy + 10 ? 'Noisy' : 'Listening'
  const [best, ...rest] = sig.scores.map((s) => s.value)
  const margin = best - Math.max(...rest)
  const holding = best >= th.close && margin >= th.margin

  return (
    <main className="screen screen-flat">
      <BackBar label="Back" title="Debug" onBack={() => go('/settings')}>
        <span className="chip chip-ember">{state}</span>
        <span className="spacer" />
        <span className="muted tnum">
          {SAMPLE_RATE_KHZ} kHz · latency {LATENCY_MS} ms · offset {settings.latencyOffsetMs ?? 0} ms
        </span>
      </BackBar>

      <div className="debug">
        <div className="debug-readouts">
          <section className="debug-block">
            <div className="debug-head">
              <span className="debug-label">Input level</span>
              <span className="tnum">{sig.db.toFixed(0)} dB</span>
            </div>
            <div className="meter">
              <div className="meter-fill" style={{ width: dbToX(sig.db) }} />
              <div className="meter-floor" style={{ left: dbToX(th.floor) }} />
              <div className="meter-noisy" style={{ left: dbToX(th.noisy) }} />
            </div>
            <div className="meter-key">
              <span>│ floor {signed(th.floor)} dB</span>
              <span>┆ noisy threshold</span>
            </div>
          </section>

          <section className="debug-pitch ruled">
            <span className="debug-label debug-pitch-label">Pitch</span>
            <span className="debug-hz tnum">{sig.hz.toFixed(2)}</span>
            <span className="debug-unit">Hz → {PITCH_TARGET_NAME}</span>
            <span className="debug-cents tnum">{signed(sig.cents, 1)}¢</span>
            <span className="muted tnum">clarity {sig.clarity.toFixed(2)}</span>
          </section>

          <section className="debug-block ruled">
            <span className="debug-label">Chroma · target {TARGET_NAME}</span>
            <div className="chroma">
              {sig.chroma.map((v, i) => (
                <div
                  key={i}
                  className={TARGET_PITCH_CLASSES.includes(i) ? 'chroma-bar on' : 'chroma-bar'}
                  style={{ height: `${v * 100}%` }}
                />
              ))}
            </div>
            <div className="chroma-notes">
              {NOTES.map((n, i) => (
                <span key={n} className={TARGET_PITCH_CLASSES.includes(i) ? 'on' : undefined}>{n}</span>
              ))}
            </div>
          </section>

          <section className="debug-block ruled">
            <div className="debug-head">
              <span className="debug-label">Onsets vs click · last 2 bars</span>
              <span className="tnum">median {signed(sig.medianOffsetMs)} ms</span>
            </div>
            <div className="onsets">
              {Array.from({ length: GRID_SLOTS }, (_, i) => (
                <span
                  key={i}
                  className={i % 2 ? 'onset-grid' : 'onset-grid beat-line'}
                  style={{ left: `${((i + 0.5) / GRID_SLOTS) * 100}%` }}
                />
              ))}
              {sig.onsets.map((o) => (
                <span
                  key={o.slot}
                  className={`onset ${!o.heard ? 'pending' : Math.abs(o.offsetMs) <= th.onTime ? 'on-time' : 'off-time'}`}
                  style={{ left: `calc(${((o.slot + 0.5) / GRID_SLOTS) * 100}% + ${o.offsetMs / 10}px)` }}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="debug-controls">
          <span className="debug-label">Chord scores (cosine)</span>
          {sig.scores.map((s, i) => (
            <div key={s.name} className={i === 0 ? 'score target' : 'score'}>
              <span className="score-name">{s.name}</span>
              <div className="score-track">
                <div className="score-fill" style={{ width: `${s.value * 100}%` }} />
                <div className="score-mark" style={{ left: `${th.close * 100}%` }} />
              </div>
              <span className="score-value tnum">{s.value.toFixed(2)}</span>
            </div>
          ))}
          <span className="debug-note">
            Target margin over next best: <span className="tnum">{margin.toFixed(2)}</span> · hold{' '}
            {holding ? ((sig.t / 1000) % 2).toFixed(1) : '0.0'} s
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
