import type { EnvelopePoint } from '../types'

export function thresholdEnvelope(points: EnvelopePoint[], sensitivity: number): EnvelopePoint[] {
  if (points.length === 0) {
    return []
  }

  const energies = points.map((point) => point.energy).sort((a, b) => a - b)
  const noise = percentile(energies, 0.28)
  const high = percentile(energies, 0.92)
  const spread = Math.max(0.02, high - noise)
  const threshold = clamp(noise + spread * (0.72 - sensitivity * 0.42), 0.015, 0.82)
  const releaseThreshold = threshold * 0.68
  let isOn = false

  return points.map((point) => {
    if (isOn) {
      isOn = point.energy > releaseThreshold
    } else {
      isOn = point.energy > threshold
    }

    return {
      ...point,
      threshold,
      isOn,
    }
  })
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) {
    return 0
  }
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * fraction)))
  return sorted[index]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
