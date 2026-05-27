export function toMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) {
    return new Float32Array()
  }

  if (channels.length === 1) {
    return new Float32Array(channels[0])
  }

  const length = channels[0].length
  const mono = new Float32Array(length)

  for (let i = 0; i < length; i += 1) {
    let sum = 0
    for (let channel = 0; channel < channels.length; channel += 1) {
      sum += channels[channel][i] ?? 0
    }
    mono[i] = sum / channels.length
  }

  return mono
}
