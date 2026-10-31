import type { CSSProperties } from 'react'

// CSS sketch from the design, a placeholder until real illustration assets exist.
const SCALE = 300 / 380
const FLAME_WIDTH = 150 * SCALE
const FLAME_HEIGHT = 210 * SCALE
const LOG_WIDTH = 220 * SCALE

const FLAMES: [number, number, string, string][] = [
  [1, 1, 'linear-gradient(0deg,#c2410c 0%,#e8823a 40%,rgba(232,130,58,0) 100%)', 'cf-sway 3s ease-in-out infinite'],
  [0.72, 0.8, 'linear-gradient(0deg,#f08a3c 0%,#f7b259 55%,rgba(247,178,89,0) 100%)', 'cf-sway 2.2s ease-in-out infinite reverse'],
  [0.42, 0.52, 'linear-gradient(0deg,#ffd58a 0%,#ffeccc 55%,rgba(255,236,204,0) 100%)', 'cf-flicker 1.6s ease-in-out infinite'],
]
const SPARKS: [number, number][] = [[-24, 3], [16, 3], [-4, 2], [30, 2]]

const base: CSSProperties = { position: 'absolute', left: '50%' }

export function Fire() {
  return (
    <div style={{ position: 'relative', width: '100%', height: 300 }} aria-hidden="true">
      <div
        style={{
          ...base,
          bottom: 0,
          width: 460,
          height: 460,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 72%, rgba(240,130,60,.32) 0%, rgba(240,130,60,0) 58%)',
          animation: 'cf-breathe 4.5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          ...base,
          bottom: 0,
          width: 520,
          height: 520,
          marginLeft: -260,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 70%, rgba(255,190,110,.3), rgba(255,190,110,0) 50%)',
          animation: 'cf-flare 3.6s ease-out infinite',
        }}
      />
      {[-12, 12].map((rotate) => (
        <div
          key={rotate}
          style={{
            ...base,
            bottom: 30,
            width: LOG_WIDTH,
            height: 24,
            marginLeft: -LOG_WIDTH / 2,
            transform: `rotate(${rotate}deg)`,
            borderRadius: 12,
            background: 'linear-gradient(180deg,#71492c,#3d2616)',
            boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.25)',
          }}
        />
      ))}
      <div
        style={{
          ...base,
          bottom: 58,
          width: FLAME_WIDTH,
          height: FLAME_HEIGHT,
          marginLeft: -FLAME_WIDTH / 2,
          transformOrigin: '50% 100%',
          animation: 'cf-flicker 2.4s ease-in-out infinite',
        }}
      >
        {FLAMES.map(([w, h, background, animation]) => (
          <div
            key={animation}
            style={{
              ...base,
              bottom: 0,
              width: FLAME_WIDTH * w,
              height: FLAME_HEIGHT * h,
              marginLeft: -(FLAME_WIDTH * w) / 2,
              borderRadius: '50% 50% 50% 50% / 64% 64% 36% 36%',
              background,
              filter: 'blur(2px)',
              mixBlendMode: 'screen',
              transformOrigin: '50% 100%',
              animation,
            }}
          />
        ))}
      </div>
      <div
        style={{
          ...base,
          bottom: 62,
          width: 160,
          height: 24,
          marginLeft: -80,
          borderRadius: 12,
          background: 'linear-gradient(180deg,#8a5a36,#4a2e1b)',
          boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.25)',
          animation: 'cf-drop 3.6s cubic-bezier(.5,0,.75,1) infinite',
        }}
      />
      {SPARKS.map(([x, size], i) => (
        <div
          key={x}
          style={{
            ...base,
            bottom: 170,
            marginLeft: x,
            width: size,
            height: size,
            borderRadius: '50%',
            background: '#ffb36b',
            boxShadow: '0 0 6px 2px rgba(255,150,70,.6)',
            opacity: 0,
            animation: `cf-rise ${2.6 + i * 0.4}s linear ${i * 0.7}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
