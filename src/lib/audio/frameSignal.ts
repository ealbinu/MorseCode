import type { Frame } from '../types'

export function frameSignal(
  signal: Float32Array,
  sampleRate: number,
  windowMs = 30,
  hopMs = 10,
): Frame[] {
  const windowSize = Math.max(1, Math.round((sampleRate * windowMs) / 1000))
  const hopSize = Math.max(1, Math.round((sampleRate * hopMs) / 1000))
  const frames: Frame[] = []

  for (let start = 0, index = 0; start + windowSize <= signal.length; start += hopSize, index += 1) {
    let sumSquares = 0
    for (let i = 0; i < windowSize; i += 1) {
      const value = signal[start + i]
      sumSquares += value * value
    }
    frames.push({
      index,
      startSample: start,
      startTime: start / sampleRate,
      rms: Math.sqrt(sumSquares / windowSize),
    })
  }

  return frames
}
