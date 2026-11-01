import type { ReactNode } from 'react'
import type { LogState } from '../engine/session'
import { ChevronLeft } from './icons'

export function BackBar({ label, title, onBack, children }: {
  label: string
  title: string
  onBack: () => void
  children?: ReactNode
}) {
  return (
    <header className="topbar">
      <button className="btn btn-icon" aria-label={label} onClick={onBack}>
        <ChevronLeft />
      </button>
      <span className="topbar-title">{title}</span>
      {children}
    </header>
  )
}

export function Switch({ checked, label, onChange }: {
  checked: boolean
  label: string
  onChange: (next: boolean) => void
}) {
  return (
    <button
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-track">
        <span className="switch-knob" />
      </span>
    </button>
  )
}

export function Segmented<T extends string | number>({ label, value, options, onChange }: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (next: T) => void
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          className="seg-opt"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Logs({ states }: { states: LogState[] }) {
  return (
    <div className="logs" aria-hidden="true">
      {states.map((state, i) => (
        <span key={i} className={`log ${state}`} />
      ))}
    </div>
  )
}

export function Dialog({ label, narrow, children }: { label: string; narrow?: boolean; children: ReactNode }) {
  return (
    <div className="scrim">
      <div className={narrow ? 'dialog dialog-narrow' : 'dialog'} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  )
}
