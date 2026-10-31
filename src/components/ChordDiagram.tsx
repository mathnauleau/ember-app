const SCALE = 1.15
const STRING_GAP = 42 * SCALE
const FRET_GAP = 56 * SCALE
const WIDTH = STRING_GAP * 5
const HEIGHT = FRET_GAP * 4
const PAD_X = 24 * SCALE
const TOP = 44 * SCALE
const RING = 460

export function ChordDiagram({ frets, fingers, label }: { frets: number[]; fingers: number[]; label: string }) {
  return (
    <div className="diagram" role="img" aria-label={label}>
      <svg width={RING} height={RING} className="diagram-ring">
        <circle cx={RING / 2} cy={RING / 2} r={RING / 2 - 16} />
      </svg>
      <svg width={WIDTH + PAD_X * 2} height={TOP + HEIGHT + 14 * SCALE} className="diagram-neck">
        {[1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={PAD_X}
            x2={PAD_X + WIDTH}
            y1={TOP + i * FRET_GAP}
            y2={TOP + i * FRET_GAP}
            stroke="rgba(244,233,216,.3)"
            strokeWidth={1.5}
          />
        ))}
        {frets.map((_, i) => (
          <line
            key={i}
            x1={PAD_X + i * STRING_GAP}
            x2={PAD_X + i * STRING_GAP}
            y1={TOP}
            y2={TOP + HEIGHT}
            stroke="rgba(244,233,216,.6)"
            strokeWidth={(2.6 - i * 0.3) * SCALE}
          />
        ))}
        <rect x={PAD_X - 2} y={TOP - 4 * SCALE} width={WIDTH + 4} height={6 * SCALE} rx={2} fill="var(--cream-100)" />
        {frets.map((fret, i) => {
          const x = PAD_X + i * STRING_GAP
          if (fret === 0) {
            return (
              <circle
                key={i}
                cx={x}
                cy={TOP - 22 * SCALE}
                r={8 * SCALE}
                fill="none"
                stroke="var(--cream-300)"
                strokeWidth={1.6}
              />
            )
          }
          const y = TOP + (fret - 0.5) * FRET_GAP
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={17 * SCALE} fill="var(--cream-100)" />
              <text
                x={x}
                y={y}
                fill="var(--night-900)"
                fontSize={18 * SCALE}
                fontFamily="var(--font-body)"
                fontWeight={600}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {fingers[i]}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
