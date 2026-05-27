import type { EnvelopePoint } from '../types'

export function energyEnvelope(
  signal: Float32Array,
  sampleRate: number,
  frequencyHz: number,
  windowMs = 20,
  hopMs = 10,
): EnvelopePoint[] {
  const windowSize = Math.max(1, Math.round((sampleRate * windowMs) / 1000))
  const hopSize = Math.max(1, Math.round((sampleRate * hopMs) / 1000))
  const raw: EnvelopePoint[] = []
  const coefficient = 2 * Math.cos((2 * Math.PI * frequencyHz) / sampleRate)

  for (let start = 0; start + windowSize <= signal.length; start += hopSize) {
    let q0 = 0
    let q1 = 0
    let q2 = 0

    for (let i = 0; i < windowSize; i += 1) {
      q0 = coefficient * q1 - q2 + signal[start + i]
      q2 = q1
      q1 = q0
    }

    const power = q1 * q1 + q2 * q2 - coefficient * q1 * q2
    raw.push({
      time: start / sampleRate,
      energy: power / windowSize,
      threshold: 0,
      isOn: false,
    })
  }

  return smoothAndNormalize(raw)
}

function smoothAndNormalize(points: EnvelopePoint[]): EnvelopePoint[] {
  if (points.length === 0) {
    return points
  }

  const smoothed = points.map((point, index) => {
    let sum = 0
    let count = 0
    for (let offset = -2; offset <= 2; offset += 1) {
      const neighbor = points[index + offset]
      if (neighbor) {
        sum += neighbor.energy
        count += 1
      }
    }
    return { ...point, energy: sum / count }
  })

  const maxEnergy = Math.max(...smoothed.map((point) => point.energy), 1e-12)
  return smoothed.map((point) => ({
    ...point,
    energy: point.energy / maxEnergy,
  }))
}
