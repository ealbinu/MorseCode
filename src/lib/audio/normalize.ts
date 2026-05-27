export function normalize(signal: Float32Array): Float32Array {
  let peak = 0
  for (let i = 0; i < signal.length; i += 1) {
    peak = Math.max(peak, Math.abs(signal[i]))
  }

  if (peak < 1e-8) {
    return new Float32Array(signal)
  }

  const normalized = new Float32Array(signal.length)
  for (let i = 0; i < signal.length; i += 1) {
    normalized[i] = signal[i] / peak
  }
  return normalized
}
