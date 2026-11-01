import { useState, type ReactNode } from 'react'
import { ArrowRight, Check, Close, SkipForward, Volume, VolumeOff } from '../components/icons'
import { Dialog, Logs } from '../components/ui'
import type { LogState } from '../engine/session'
import { updateSettings, useProgress } from '../store/progress'

export function SessionShell(props: {
  step: string
  stepNumber: number
  totalSteps: number
  phase: string
  time?: string // left out for steps with no time limit
  timeMuted?: boolean
  logs: LogState[]
  skipLabel?: string
  nextLabel: string
  nextIcon?: 'arrow' | 'check'
  background?: 'centered' | 'drill'
  onPauseChange?: (paused: boolean) => void
  onLeave: () => void
  onSkip: () => void
  onNext: () => void
  children: ReactNode
}) {
  const { sound } = useProgress().settings
  const [paused, setPaused] = useState(false)

  const pause = (next: boolean) => {
    setPaused(next)
    props.onPauseChange?.(next)
  }

  return (
    <main className={props.background ? `screen screen-${props.background}` : 'screen'}>
      <header className="topbar">
        <button className="btn btn-icon" aria-label="Pause session" onClick={() => pause(true)}>
          <Close />
        </button>
        <div className="shell-step">
          <span className="topbar-title">{props.step}</span>
          <span className="shell-phase tnum">Step {props.stepNumber} of {props.totalSteps} · {props.phase}</span>
        </div>
        <Logs states={props.logs} />
        {props.time && (
          <div className="shell-time">
            <span className={props.timeMuted ? 'shell-clock muted-ink tnum' : 'shell-clock tnum'}>{props.time}</span>
            <span className="shell-phase">left in this step</span>
          </div>
        )}
      </header>

      {props.children}

      <footer className="bottombar">
        <button className="btn btn-secondary" onClick={props.onSkip}>
          <SkipForward size={20} />
          {props.skipLabel ?? 'Skip'}
        </button>
        <span className="spacer" />
        <button
          className="btn btn-pill"
          aria-label="Toggle crackle sound"
          aria-pressed={sound}
          onClick={() => updateSettings({ sound: !sound })}
        >
          {sound ? <Volume color="var(--ember-500)" /> : <VolumeOff color="var(--cream-500)" />}
          Crackle {sound ? 'on' : 'off'}
        </button>
        <button className="btn btn-primary compact" onClick={props.onNext}>
          <span>{props.nextLabel}</span>
          {props.nextIcon === 'check' ? <Check color="var(--ember-500)" /> : <ArrowRight color="var(--ember-500)" />}
        </button>
      </footer>

      {paused && (
        <Dialog label="Pause the fire?" narrow>
          <h2 className="dialog-title">Pause the fire?</h2>
          <p className="dialog-body">Tonight's logs are kept. You can pick up from {props.step} whenever you like.</p>
          <div className="dialog-actions dialog-actions-gap">
            <button className="btn btn-primary medium" onClick={() => pause(false)}>Keep playing</button>
            <button className="btn btn-secondary" onClick={props.onLeave}>Pause for now</button>
          </div>
        </Dialog>
      )}
    </main>
  )
}
