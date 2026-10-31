const HEIGHT = 112
const MID = HEIGHT / 2
const TICKS = Array.from({ length: 21 }, (_, i) => i * 5 - 50).filter((c) => c !== 0)

// Position along the scale: 0 is the centre, +-50 cents sit 44px inside each edge.
const along = (cents: number) => `calc(50% + ${cents / 50} * (50% - 44px))`

export function Gauge({ cents, mode }: { cents: number; mode: 'nosig' | 'live' | 'intune' }) {
  const clamped = Math.max(-50, Math.min(50, cents))
  const away = Math.abs(clamped)
  const near = (50 - away) / 50
  const glowWidth = 60 + away * 5
  const glowHeight = 60 + away * 1.4
  const inTune = mode === 'intune'

  return (
    <div className="gauge" aria-hidden="true">
      {TICKS.map((c) => {
        const tall = c % 25 === 0 ? 30 : c % 10 === 0 ? 20 : 10
        return (
          <span
            key={c}
            className={mode === 'nosig' ? 'gauge-tick off' : 'gauge-tick'}
            style={{ left: along(c), top: MID - tall / 2, height: tall }}
          />
        )
      })}
      <span className="gauge-sign left">♭</span>
      <span className="gauge-sign right">♯</span>
      {inTune && <span className="gauge-halo" />}
      <span className={`gauge-centre ${mode}`} />
      {mode !== 'nosig' && (
        <>
          <span
            className="gauge-band"
            style={{
              left: clamped < 0 ? along(clamped) : '50%',
              width: `calc(${away / 50} * (50% - 44px))`,
            }}
          />
          <span
            className="gauge-glow"
            style={{
              left: `calc(${along(clamped)} - ${glowWidth / 2}px)`,
              top: MID - glowHeight / 2,
              width: glowWidth,
              height: glowHeight,
              background: `radial-gradient(ellipse, rgba(240,130,60,${0.2 + near * 0.55}) 0%, rgba(240,130,60,0) 70%)`,
            }}
          />
          <span
            className={inTune ? 'gauge-needle intune' : 'gauge-needle'}
            style={{
              left: `calc(${along(clamped)} - 4px)`,
              boxShadow: `0 0 ${8 + near * 14}px ${near * 4}px rgba(240,140,60,${0.35 + near * 0.5})`,
            }}
          />
        </>
      )}
    </div>
  )
}
