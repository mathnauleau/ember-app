const CREAM = 'var(--cream-100)'

export function ChordDiagram({ frets, fingers, scale, dim }: { frets: number[]; fingers: number[]; scale: number; dim?: boolean }) {
  const stringGap = 42 * scale
  const fretGap = 56 * scale
  const width = stringGap * 5
  const height = fretGap * 4
  const padX = 24 * scale
  const top = 44 * scale
  const markY = top - 22 * scale
  const cross = 7 * scale

  return (
    <svg width={width + padX * 2} height={top + height + 14 * scale} className={dim ? 'neck dim' : 'neck'}>
      {[1, 2, 3, 4].map((i) => (
        <line key={i} x1={padX} x2={padX + width} y1={top + i * fretGap} y2={top + i * fretGap} stroke="rgba(244,233,216,.3)" strokeWidth={1.5} />
      ))}
      {frets.map((_, i) => (
        <line key={i} x1={padX + i * stringGap} x2={padX + i * stringGap} y1={top} y2={top + height} stroke="rgba(244,233,216,.6)" strokeWidth={(2.6 - i * 0.3) * scale} />
      ))}
      <rect x={padX - 2} y={top - 4 * scale} width={width + 4} height={6 * scale} rx={2} fill={CREAM} />
      {frets.map((fret, i) => {
        const x = padX + i * stringGap
        if (fret === 0) {
          return <circle key={i} cx={x} cy={markY} r={8 * scale} fill="none" stroke="var(--cream-300)" strokeWidth={1.6} />
        }
        if (fret < 0) {
          return (
            <path
              key={i}
              d={`M${x - cross} ${markY - cross}L${x + cross} ${markY + cross}M${x + cross} ${markY - cross}L${x - cross} ${markY + cross}`}
              stroke="var(--cream-500)"
              strokeWidth={1.6}
            />
          )
        }
        const y = top + (fret - 0.5) * fretGap
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={17 * scale} fill={CREAM} />
            <text x={x} y={y} fill="var(--night-900)" fontSize={18 * scale} fontFamily="var(--font-body)" fontWeight={600} textAnchor="middle" dominantBaseline="central">
              {fingers[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
