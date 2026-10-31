import { ONSET } from '../config/thresholds'

export type DetectedOnset = { frame: number; strength: number }

// High-passed energy envelope. Runs inside the AudioWorklet and in tests.
export class OnsetDetector {
  private previous = 0
  private energy = 0
  private filled = 0
  private baseline = 0
  private lastOnset = -Infinity
  private warmupFrames: number
  private readonly refractory: number
  private readonly smoothing: number

  constructor(sampleRate: number) {
    this.refractory = (ONSET.refractoryMs / 1000) * sampleRate
    this.smoothing = 1 - Math.exp(-ONSET.hopSize / ((ONSET.baselineMs / 1000) * sampleRate))
    // The baseline starts at zero, so background noise would otherwise read as a jump.
    this.warmupFrames = Math.ceil(((ONSET.baselineMs / 1000) * sampleRate) / ONSET.hopSize)
  }

  process(samples: Float32Array, startFrame: number) {
    const onsets: DetectedOnset[] = []
    for (let i = 0; i < samples.length; i++) {
      const high = samples[i] - this.previous
      this.previous = samples[i]
      this.energy += high * high
      if (++this.filled < ONSET.hopSize) continue

      const frameEnergy = this.energy / ONSET.hopSize
      const frame = startFrame + i - ONSET.hopSize + 1
      if (this.warmupFrames > 0) {
        this.warmupFrames -= 1
      } else if (
        frameEnergy > this.baseline * ONSET.riseRatio &&
        frameEnergy > ONSET.minEnergy &&
        frame - this.lastOnset >= this.refractory
      ) {
        onsets.push({ frame, strength: frameEnergy })
        this.lastOnset = frame
      }
      this.baseline += (frameEnergy - this.baseline) * this.smoothing
      this.energy = 0
      this.filled = 0
    }
    return onsets
  }
}
