import type { CSSProperties } from 'react'
import type { FireLevel } from '../engine/streak'

// CSS sketches from the design, placeholders until real illustration assets exist.
const LAYERS: [number, number, string, string][] = [
  [1, 1, 'linear-gradient(0deg,#c2410c 0%,#e8823a 40%,rgba(232,130,58,0) 100%)', 'cf-sway 3s ease-in-out infinite'],
  [0.72, 0.8, 'linear-gradient(0deg,#f08a3c 0%,#f7b259 55%,rgba(247,178,89,0) 100%)', 'cf-sway 2.2s ease-in-out infinite reverse'],
  [0.42, 0.52, 'linear-gradient(0deg,#ffd58a 0%,#ffeccc 55%,rgba(255,236,204,0) 100%)', 'cf-flicker 1.6s ease-in-out infinite'],
]
const FRESH_END = 'radial-gradient(circle,#dcae7c 0 16%,#a87445 18% 38%,#cf9b64 40% 58%,#8a5a33 60%)'
const CHARRED_END = 'radial-gradient(circle,#ff8a3d 0 20%,#5a2a14 45%,#221a17 70%)'
const FRESH = 'linear-gradient(180deg,#71492c,#3d2616)'
const CHARRED = 'linear-gradient(180deg,#2b2321,#15110f)'
const SHADE = 'inset 0 -3px 0 rgba(0,0,0,.25)'
const left: CSSProperties = { position: 'absolute', left: '50%' }

function Flame({ width, height, bottom, outer }: { width: number; height: number; bottom: number; outer: CSSProperties }) {
  return (
    <div style={{ ...left, bottom, width, height, marginLeft: -width / 2, transformOrigin: '50% 100%', ...outer }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 100%', animation: 'cf-flicker 2.4s ease-in-out infinite' }}>
        {LAYERS.map(([w, h, background, animation]) => (
          <div
            key={animation}
            style={{
              ...left,
              bottom: 0,
              width: width * w,
              height: height * h,
              marginLeft: -(width * w) / 2,
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
    </div>
  )
}

function Log({ width, height, rotate, x, bottom, charred, animate }: {
  width: number
  height: number
  rotate: number
  x: number
  bottom: number
  charred?: boolean
  animate?: string
}) {
  return (
    <div
      style={{
        ...left,
        bottom,
        width,
        height,
        marginLeft: -width / 2 + x,
        transform: `rotate(${rotate}deg)`,
        borderRadius: height / 2,
        background: charred ? CHARRED : FRESH,
        boxShadow: charred ? `0 0 14px rgba(255,110,40,.22), ${SHADE}` : SHADE,
      }}
    >
      <div
        style={{
          position: 'absolute',
          [rotate < 0 ? 'left' : 'right']: 2,
          top: 2,
          width: height - 4,
          height: height - 4,
          borderRadius: '50%',
          background: charred ? CHARRED_END : FRESH_END,
          animation: animate,
        }}
      />
    </div>
  )
}

function Glow({ size, bottom, alpha }: { size: number; bottom: number; alpha: number }) {
  return (
    <div
      style={{
        ...left,
        bottom,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 50% 72%, rgba(240,130,60,${alpha}) 0%, rgba(240,130,60,0) 58%)`,
        animation: 'cf-breathe 4.5s ease-in-out infinite',
        pointerEvents: 'none',
      }}
    />
  )
}

function Shadow({ width, height, bottom }: { width: number; height: number; bottom: number }) {
  return <div style={{ ...left, bottom, width, height, marginLeft: -width / 2, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,.55), rgba(0,0,0,0) 70%)' }} />
}

function Sparks({ list, bottom, delay = 0, rise }: { list: [number, number][]; bottom: number; delay?: number; rise: string }) {
  return list.map(([x, size], i) => (
    <div
      key={i}
      style={{
        ...left,
        bottom,
        marginLeft: x,
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#ffb36b',
        boxShadow: '0 0 6px 2px rgba(255,150,70,.6)',
        opacity: 0,
        animation: `${rise} ${2.6 + i * 0.4}s linear ${delay + i * 0.7}s infinite`,
      }}
    />
  ))
}

function Embers({ list, base, animate }: { list: [number, number, number][]; base: number; animate: (i: number) => string }) {
  return list.map(([x, y, size], i) => (
    <div
      key={i}
      style={{
        ...left,
        bottom: base + y,
        marginLeft: x,
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#ff8a3d',
        boxShadow: '0 0 10px 3px rgba(255,120,40,.55)',
        animation: animate(i),
      }}
    />
  ))
}

const HOME_LOGS: Record<FireLevel, [number, number, number, number][]> = {
  full: [[300, -14, 0, 0], [300, 14, 0, 0], [250, -5, -12, 26], [230, 7, 16, 48], [200, -9, -4, 68]],
  dim: [[290, -12, 0, 0], [290, 12, 0, 0], [230, -3, 4, 24]],
  first: [[150, -12, 0, 0], [150, 12, 0, 0]],
  embers: [[290, -12, 0, 0], [290, 12, 0, 0], [230, -3, 4, 24]],
}
const FLAME_SCALE: Record<FireLevel, number> = { full: 1, dim: 0.4, first: 0.4, embers: 0 }
const GLOW: Record<FireLevel, number> = { full: 0.4, dim: 0.2, first: 0.2, embers: 0.16 }
const HOME_EMBERS: [number, number, number][] = [[-70, 40, 9], [-30, 30, 7], [10, 44, 11], [48, 32, 8], [86, 46, 7], [-100, 52, 6], [30, 60, 6], [-12, 66, 8], [64, 58, 5]]

export function HomeFire({ level }: { level: FireLevel }) {
  const scale = FLAME_SCALE[level]
  const charred = level === 'embers'
  const logHeight = level === 'first' ? 20 : 30

  return (
    <div className="fire-art" style={{ height: 'var(--fire-height)' }} aria-hidden="true">
      <Glow size={540} bottom={10} alpha={GLOW[level]} />
      <Shadow width={380} height={44} bottom={24} />
      {HOME_LOGS[level].map(([width, rotate, x, y], i) => (
        <Log
          key={i}
          width={width}
          height={logHeight}
          rotate={rotate}
          x={x}
          bottom={44 + y}
          charred={charred}
          animate={charred ? `cf-pulse ${2.4 + i * 0.5}s ease-in-out infinite` : undefined}
        />
      ))}
      {charred && <Embers list={HOME_EMBERS} base={44} animate={(i) => `cf-pulse ${2.2 + (i % 4) * 0.6}s ease-in-out ${i * 0.35}s infinite`} />}
      {scale > 0 && (
        <Flame
          width={240 * scale}
          height={320 * scale}
          bottom={level === 'full' ? 78 : 54}
          outer={{}}
        />
      )}
      {level === 'full' && <Sparks list={[[-30, 3], [20, 4], [-6, 3], [40, 2], [-50, 3], [8, 2]]} bottom={260} rise="cf-rise-high" />}
    </div>
  )
}

const SUMMARY_EMBERS: [number, number, number][] = [[-70, 40, 9], [-30, 30, 7], [10, 44, 11], [48, 32, 8], [86, 46, 7], [-12, 60, 8]]

// The log drops in and the flame grows once, when the screen opens.
export function SummaryFire({ back }: { back: boolean }) {
  const logs: [number, number, number, number][] = back
    ? [[270, -12, 0, 0], [270, 12, 0, 0], [220, -3, 4, 24]]
    : [[290, -14, 0, 0], [290, 14, 0, 0], [240, -5, -12, 26], [220, 7, 16, 48]]
  const scale = back ? 0.72 : 1

  return (
    <div className="fire-art" style={{ height: 360 }} aria-hidden="true">
      <Glow size={520} bottom={0} alpha={0.4} />
      <Shadow width={360} height={40} bottom={22} />
      {logs.map(([width, rotate, x, y], i) => (
        <Log key={i} width={width * 0.95} height={28} rotate={rotate} x={x} bottom={40 + y * 0.95} />
      ))}
      {back && <Embers list={SUMMARY_EMBERS} base={40} animate={(i) => `cf-fade 2s ease-in ${1.6 + i * 0.1}s both`} />}
      <Flame
        width={230 * scale}
        height={310 * scale}
        bottom={back ? 70 : 92}
        outer={{ animation: `cf-grow ${back ? 3.2 : 2.4}s cubic-bezier(.2,.7,.3,1) 1.1s both` }}
      />
      <div
        style={{
          ...left,
          bottom: back ? 72 : 96,
          width: 200,
          height: 28,
          marginLeft: -100,
          borderRadius: 14,
          background: 'linear-gradient(180deg,#8a5a36,#4a2e1b)',
          boxShadow: SHADE,
          animation: 'cf-drop1 1.3s cubic-bezier(.5,0,.75,1) .1s both',
        }}
      >
        <div style={{ position: 'absolute', right: 2, top: 2, width: 24, height: 24, borderRadius: '50%', background: FRESH_END }} />
      </div>
      {!back && <Sparks list={[[-30, 3], [20, 4], [-6, 3], [40, 2], [-50, 3]]} bottom={270} delay={3} rise="cf-rise-high" />}
    </div>
  )
}
