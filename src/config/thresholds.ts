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
