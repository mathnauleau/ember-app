export type FretDot = { s: number; f: number; label?: string | number; kind: string }

const TOP = 30
const GAP = 34
const LEFT = 56
const NAMES = ['e', 'B', 'G', 'D', 'A', 'E']
const HEIGHT = TOP * 2 + GAP * 5

const FILL: Record<string, string> = {
  next: 'var(--ember-500)',
  note: 'var(--cream-100)',
  open: 'var(--night-900)',
  done: 'rgba(244,233,216,.12)',
  todo: 'var(--night-900)',
}
const STROKE: Record<string, string> = { todo: 'rgba(244,233,216,.5)', open: 'var(--ember-500)' }
const INK: Record<string, string> = { next: 'var(--night-900)', note: 'var(--night-900)', done: 'var(--cream-500)', open: 'var(--cream-100)', todo: 'var(--cream-100)' }

// One graphic, used twice: the spider walk and the theory cards.
export function Fretboard({ width, frets, dots }: { width: number; frets: number; dots: FretDot[] }) {
  const span = width - LEFT - 20
  const fretWidth = span / frets
  const fretX = (f: number) => LEFT + (f - 0.5) * fretWidth
  // Open-string markers sit where the names do, so the names step aside for them.
  const nameX = dots.some((d) => d.f === 0) ? 0 : 22

  return (
    <svg viewBox={`0 0 ${width} ${HEIGHT + 24}`} style={{ width: '100%', maxWidth: width, overflow: 'visible' }} aria-hidden="true">
      <rect x={LEFT} y={TOP - 14} width={span} height={GAP * 5 + 28} rx={4} fill="rgba(244,233,216,.025)" stroke="rgba(244,233,216,.12)" />
      {[3, 5].filter((f) => f <= frets).map((f) => (
        <circle key={f} cx={fretX(f)} cy={TOP + GAP * 2.5} r={6} fill="rgba(244,233,216,.1)" />
      ))}
      {Array.from({ length: frets }, (_, i) => (
        <line key={i} x1={LEFT + (i + 1) * fretWidth} x2={LEFT + (i + 1) * fretWidth} y1={TOP - 14} y2={TOP + GAP * 5 + 14} stroke="rgba(244,233,216,.26)" strokeWidth={1.5} />
      ))}
      <rect x={LEFT - 3} y={TOP - 14} width={6} height={GAP * 5 + 28} rx={2} fill="var(--cream-100)" />
      {NAMES.map((name, s) => {
        const y = TOP + s * GAP
        return (
          <g key={s}>
            <line x1={LEFT} x2={width - 20} y1={y} y2={y} stroke="rgba(244,233,216,.55)" strokeWidth={1 + s * 0.35} />
            <text x={nameX} y={y} fill="var(--cream-500)" fontSize={20} fontFamily="var(--font-display)" fontWeight={600} textAnchor="middle" dominantBaseline="central">{name}</text>
          </g>
        )
      })}
      {Array.from({ length: frets }, (_, i) => (
        <text key={i} x={fretX(i + 1)} y={HEIGHT + 14} fill="var(--cream-500)" fontSize={15} fontFamily="var(--font-body)" textAnchor="middle">{i + 1}</text>
      ))}
      {dots.map((d, i) => {
        const cx = d.f === 0 ? LEFT - 20 : fretX(d.f)
        const cy = TOP + d.s * GAP
        if (d.kind === 'ghost') return <circle key={i} cx={cx} cy={cy} r={5} fill="rgba(232,130,58,.35)" />
        const radius = d.f === 0 ? 15 : d.kind === 'next' ? 22 : 18
        return (
          <g key={i}>
            {d.kind === 'next' && (
              <>
                <circle cx={cx} cy={cy} r={30} fill="none" stroke="var(--ember-500)" strokeWidth={2} className="board-pulse" />
                <circle cx={cx} cy={cy} r={26} fill="rgba(240,130,60,.5)" className="ring-blur" />
              </>
            )}
            <circle cx={cx} cy={cy} r={radius} fill={FILL[d.kind]} stroke={STROKE[d.kind] ?? 'none'} strokeWidth={1.5} />
            <text x={cx} y={cy} fill={INK[d.kind]} fontSize={d.f === 0 ? 15 : 18} fontFamily="var(--font-body)" fontWeight={600} textAnchor="middle" dominantBaseline="central">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}
