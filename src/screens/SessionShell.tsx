import type { ReactNode } from 'react'
import { ArrowRight, Close, SkipForward, Volume } from '../components/icons'
import { Logs } from '../components/ui'
import { updateSettings, useProgress } from '../store/progress'

export function SessionShell(props: {
  step: string
  stepNumber: number
  totalSteps: number
  phase: string
  time: string
  timeMuted?: boolean
  logsDone: number
  logsLit: number
  nextLabel: string
  onPause: () => void
  onSkip: () => void
  onNext: () => void
  children: ReactNode
}) {
  const { sound } = useProgress().settings
  return (
    <main className="screen">
      <header className="topbar">
        <button className="btn btn-icon" aria-label="Pause session" onClick={props.onPause}>
          <Close />
        </button>
        <div className="shell-step">
          <span className="topbar-title">{props.step}</span>
          <span className="shell-phase">Step {props.stepNumber} of {props.totalSteps} · {props.phase}</span>
        </div>
        <Logs total={props.totalSteps} done={props.logsDone} lit={props.logsLit} />
        <div className="shell-time">
          <span className={props.timeMuted ? 'shell-clock muted-ink tnum' : 'shell-clock tnum'}>{props.time}</span>
          <span className="shell-phase">left in this step</span>
        </div>
      </header>

      {props.children}

      <footer className="bottombar">
        <button className="btn btn-secondary" onClick={props.onSkip}>
          <SkipForward size={20} />
          Skip
        </button>
        <span className="spacer" />
        <button className="btn btn-pill" aria-pressed={sound} onClick={() => updateSettings({ sound: !sound })}>
          <Volume color="var(--ember-500)" />
          Crackle {sound ? 'on' : 'off'}
        </button>
        <button className="btn btn-primary compact" onClick={props.onNext}>
          <span>{props.nextLabel}</span>
          <ArrowRight color="var(--ember-500)" />
        </button>
      </footer>
    </main>
  )
}
