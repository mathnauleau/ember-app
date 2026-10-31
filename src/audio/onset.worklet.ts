import { OnsetDetector } from './onsetDetector'

declare const currentFrame: number
declare const sampleRate: number
declare class AudioWorkletProcessor {
  readonly port: MessagePort
}
declare function registerProcessor(name: string, processor: unknown): void

class OnsetProcessor extends AudioWorkletProcessor {
  private detector = new OnsetDetector(sampleRate)

  process(inputs: Float32Array[][]) {
    const samples = inputs[0]?.[0]
    if (samples) {
      for (const { frame, strength } of this.detector.process(samples, currentFrame)) {
        this.port.postMessage({ time: frame / sampleRate, strength })
      }
    }
    return true
  }
}

registerProcessor('onset', OnsetProcessor)
