import { TIMING } from '../config/thresholds'

const LOOKAHEAD_S = 0.1
const TICK_MS = 25
const START_DELAY_S = 0.15
export const SLOTS_PER_BAR = 8

// Look-ahead scheduler on the audio clock: timers only decide when to schedule, never when things sound.
export class Metronome {
  private next = 0
  private index = 0
  private eighth: number
  private timer = 0

  constructor(
    private context: AudioContext,
    private options: { bpm: number; volume: number; onSlot: (index: number, time: number, eighthS: number) => void },
  ) {
    this.eighth = 30 / options.bpm
  }

  start() {
    this.next = this.context.currentTime + START_DELAY_S
    this.index = 0
    this.tick()
  }

  stop() {
    clearTimeout(this.timer)
  }

  setBpm(bpm: number) {
    this.eighth = 30 / bpm
  }

  private tick = () => {
    while (this.next < this.context.currentTime + LOOKAHEAD_S) {
      if (this.index % 2 === 0) this.click(this.next, this.index % SLOTS_PER_BAR === 0)
      this.options.onSlot(this.index, this.next, this.eighth)
      this.next += this.eighth
      this.index += 1
    }
    this.timer = window.setTimeout(this.tick, TICK_MS)
  }

  private click(time: number, accent: boolean) {
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.frequency.value = accent ? TIMING.accentHz : TIMING.clickHz
    gain.gain.setValueAtTime(this.options.volume, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + TIMING.clickSeconds)
    oscillator.connect(gain).connect(this.context.destination)
    oscillator.start(time)
    oscillator.stop(time + TIMING.clickSeconds)
  }
}
