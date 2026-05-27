import type { AnalysisSettings, SpectrumPeak, SpectrumPoint } from '../types'

type FrequencyAnalysisResult = {
  peaks: SpectrumPeak[]
  spectrum: SpectrumPoint[]
}

const MAX_FFT_FRAMES = 4200

export function frequencyAnalysis(
  signal: Float32Array,
  sampleRate: number,
  settings: AnalysisSettings,
): FrequencyAnalysisResult {
  const windowSize = nextPowerOfTwo(Math.round(sampleRate * 0.035))
  const hopSize = Math.max(1, Math.round(sampleRate * 0.01))
  const frameCount = Math.max(0, Math.floor((signal.length - windowSize) / hopSize) + 1)
  const frameStep = Math.max(1, Math.ceil(frameCount / MAX_FFT_FRAMES))
  const hann = makeHannWindow(windowSize)
  const peaks: SpectrumPeak[] = []
  const spectrumBuckets = new Map<number, { frequencyHz: number; energy: number; count: number }>()
  const minBin = Math.max(1, Math.floor((settings.minFrequency * windowSize) / sampleRate))
  const maxBin = Math.min(Math.floor(windowSize / 2) - 1, Math.ceil((settings.maxFrequency * windowSize) / sampleRate))

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += frameStep) {
    const start = frameIndex * hopSize
    const real = new Float32Array(windowSize)
    const imag = new Float32Array(windowSize)

    for (let i = 0; i < windowSize; i += 1) {
      real[i] = (signal[start + i] || 0) * hann[i]
    }

    fft(real, imag)

    let frameMax = 0
    const magnitudes = new Float32Array(maxBin + 1)
    for (let bin = minBin; bin <= maxBin; bin += 1) {
      const energy = real[bin] * real[bin] + imag[bin] * imag[bin]
      magnitudes[bin] = energy
      frameMax = Math.max(frameMax, energy)

      const frequencyHz = (bin * sampleRate) / windowSize
      const bucketFrequency = Math.round(frequencyHz / 20) * 20
      const bucket = spectrumBuckets.get(bucketFrequency) ?? {
        frequencyHz: bucketFrequency,
        energy: 0,
        count: 0,
      }
      bucket.energy += energy
      bucket.count += 1
      spectrumBuckets.set(bucketFrequency, bucket)
    }

    if (frameMax <= 1e-12) {
      continue
    }

    const framePeaks: SpectrumPeak[] = []
    for (let bin = minBin + 1; bin < maxBin; bin += 1) {
      const energy = magnitudes[bin]
      if (energy < frameMax * 0.18) {
        continue
      }
      if (energy >= magnitudes[bin - 1] && energy >= magnitudes[bin + 1]) {
        framePeaks.push({
          frameIndex,
          time: start / sampleRate,
          frequencyHz: (bin * sampleRate) / windowSize,
          energy,
        })
      }
    }

    framePeaks
      .sort((a, b) => b.energy - a.energy)
      .slice(0, 4)
      .forEach((peak) => peaks.push(peak))
  }

  const maxSpectrumEnergy = Math.max(
    ...Array.from(spectrumBuckets.values()).map((bucket) => bucket.energy / Math.max(1, bucket.count)),
    1,
  )

  const spectrum = Array.from(spectrumBuckets.values())
    .map((bucket) => ({
      frequencyHz: bucket.frequencyHz,
      energy: (bucket.energy / Math.max(1, bucket.count)) / maxSpectrumEnergy,
    }))
    .sort((a, b) => a.frequencyHz - b.frequencyHz)

  return { peaks, spectrum }
}

function makeHannWindow(size: number): Float32Array {
  const window = new Float32Array(size)
  for (let i = 0; i < size; i += 1) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)))
  }
  return window
}

function nextPowerOfTwo(value: number): number {
  let power = 1
  while (power < value) {
    power *= 2
  }
  return power
}

function fft(real: Float32Array, imag: Float32Array): void {
  const n = real.length
  let j = 0

  for (let i = 1; i < n; i += 1) {
    let bit = n >> 1
    while ((j & bit) !== 0) {
      j ^= bit
      bit >>= 1
    }
    j ^= bit

    if (i < j) {
      const tempReal = real[i]
      const tempImag = imag[i]
      real[i] = real[j]
      imag[i] = imag[j]
      real[j] = tempReal
      imag[j] = tempImag
    }
  }

  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length
    const wLengthReal = Math.cos(angle)
    const wLengthImag = Math.sin(angle)

    for (let i = 0; i < n; i += length) {
      let wReal = 1
      let wImag = 0

      for (let k = 0; k < length / 2; k += 1) {
        const evenIndex = i + k
        const oddIndex = evenIndex + length / 2
        const oddReal = real[oddIndex] * wReal - imag[oddIndex] * wImag
        const oddImag = real[oddIndex] * wImag + imag[oddIndex] * wReal

        real[oddIndex] = real[evenIndex] - oddReal
        imag[oddIndex] = imag[evenIndex] - oddImag
        real[evenIndex] += oddReal
        imag[evenIndex] += oddImag

        const nextWReal = wReal * wLengthReal - wImag * wLengthImag
        wImag = wReal * wLengthImag + wImag * wLengthReal
        wReal = nextWReal
      }
    }
  }
}
