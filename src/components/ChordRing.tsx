import { ChordDiagram } from './ChordDiagram'

export type RingMode = 'listening' | 'close' | 'retry' | 'silent' | 'noisy' | 'dim' | 'plain'

const EMBER = 'var(--ember-500)'

// The ring only changes how warm it looks: never red or green.
export function ChordRing({ mode, hold = 0, size, scale, frets, fingers, label }: {
  mode: RingMode
  hold?: number
  size: number
  scale: number
  frets: number[]
  fingers: number[]
  label: string
}) {
  const centre = size / 2
  const outer = centre - 16
  const inner = outer - 22
  const around = 2 * Math.PI * inner
  const circle = { cx: centre, cy: centre, fill: 'none' }

  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="ring-svg" aria-hidden="true">
        {mode === 'plain' ? (
          <circle {...circle} r={outer} stroke="rgba(244,233,216,.16)" strokeWidth={1.5} />
        ) : (
          <circle {...circle} r={outer} stroke="rgba(244,233,216,.08)" strokeWidth={2} />
        )}
        {mode === 'listening' && (
          <>
            <circle {...circle} r={outer} stroke="rgba(232,130,58,.35)" strokeWidth={16} className="ring-pulse ring-blur" />
            <circle {...circle} r={outer} stroke={EMBER} strokeWidth={3} className="ring-pulse" />
          </>
        )}
        {mode === 'close' && (
          <>
            <circle cx={centre} cy={centre} r={outer} fill="rgba(232,130,58,.07)" />
            <circle {...circle} r={outer} stroke="rgba(240,140,60,.55)" strokeWidth={22} className="ring-glow" />
            <circle {...circle} r={outer} stroke={EMBER} strokeWidth={4} />
            <circle {...circle} r={inner} stroke="rgba(247,183,124,.16)" strokeWidth={8} />
            <circle
              {...circle}
              r={inner}
              stroke="var(--ember-300)"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${around * hold} ${around}`}
              transform={`rotate(-90 ${centre} ${centre})`}
              className="ring-arc"
            />
          </>
        )}
        {mode === 'retry' && <circle {...circle} r={outer} stroke="rgba(232,130,58,.32)" strokeWidth={2} />}
        {mode === 'silent' && (
          <circle {...circle} r={outer} stroke={EMBER} strokeWidth={2} strokeDasharray="2 12" strokeLinecap="round" className="ring-slow" />
        )}
        {mode === 'noisy' && (
          <g className="ring-spin" style={{ transformOrigin: `${centre}px ${centre}px` }}>
            <circle {...circle} r={outer} stroke="rgba(244,233,216,.35)" strokeWidth={2} strokeDasharray="30 16" />
          </g>
        )}
        {mode === 'dim' && <circle {...circle} r={outer} stroke="rgba(244,233,216,.14)" strokeWidth={1.5} />}
      </svg>
      <div className="ring-neck" style={{ marginTop: mode === 'plain' ? 0 : 8 * scale }}>
        <ChordDiagram frets={frets} fingers={fingers} scale={scale} dim={mode === 'dim'} />
      </div>
    </div>
  )
}
