// Every tunable threshold lives here. Debug overrides are persisted in the store.
export type Thresholds = {
  floor: number // dB, silent below
  noisy: number // dB, noisy floor above
  close: number // cosine score, close enough
  margin: number // cosine lead over the next best chord
  onTime: number // ms, either side of the beat
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  floor: -52,
  noisy: -34,
  close: 0.78,
  margin: 0.08,
  onTime: 70,
}
