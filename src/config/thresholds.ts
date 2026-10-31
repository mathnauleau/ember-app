// Every tunable threshold lives here. The Debug sliders persist overrides of these five.
export type Thresholds = {
  floor: number // dB, silent below
  noisy: number // dB, noisy floor above
  close: number // cosine score, close enough
  margin: number // cosine lead over the next best chord
  onTime: number // ms, either side of the beat
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  floor: -66,
  noisy: -34,
  close: 0.78,
  margin: 0.08,
  onTime: 70,
}

export const PITCH = {
  fftSize: 4096,
  readingMs: 33, // about 30 readings/s
  minClarity: 0.9,
  smoothing: 5, // readings in the median
  lowClarityReadings: 15, // about 0.5 s of sound with no clear pitch means noisy
  floorMeasureMs: 1000,
  silentRatio: 2, // silent = RMS under twice the measured floor
  floorAdapt: 0.1, // how fast the floor drops when the room is quieter than first measured
  stalledMs: 3000, // this long without audio counts as a stalled mic
}

export const ONSET = {
  hopSize: 128, // samples per energy frame, about 2.7 ms at 48 kHz
  riseRatio: 4, // energy must jump this far above the recent average
  minEnergy: 1e-7, // ignores tiny rises in a silent room
  refractoryMs: 50, // one strum, one onset
  baselineMs: 150, // how long the recent average remembers
}

export const TIMING = {
  minMatched: 4, // fewer matched strums in a bar means no feedback
  clickLeakMs: 20, // window around a click's arrival where an onset may be the click itself
  clickLeakRatio: 0.5, // inside it, an onset must be this loud relative to off-click strums
  clickHz: 1000,
  accentHz: 1500,
  clickSeconds: 0.03,
}

export const CHORD = {
  fftSize: 16384,
  everyReadings: 3, // about 10 chroma frames/s
  minHz: 80,
  maxHz: 2000,
  rangeDb: 45, // spectral peaks this far below the loudest still count
  bassWeight: 2,
  holdSeconds: 2,
  holdDecayPerSecond: 0.25, // fraction of the hold lost each second away from the chord
  retryAfterMs: 500, // sounding this long without matching means try again
  retryLingerMs: 2500, // the prompt stays this long after the sound stops
  idleAfterMs: 8000, // no sound for this long is the quiet "take your time" state
  stableChangeMs: 300, // a change counts once the new chord holds this long
}
