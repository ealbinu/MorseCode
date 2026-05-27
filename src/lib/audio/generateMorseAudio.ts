import lamejs from '@breezystack/lamejs'
import { encodeTextToMorse } from '../morse/encodeTextToMorse'

export type MorseAudioOptions = {
  frequencyHz: number
  unitMs: number
  volume: number
  waveType: MorseWaveType
}

export type MorseWaveType = 'sine' | 'square' | 'triangle' | 'sawtooth'

export type GeneratedMorseAudio = {
  morse: string
  unsupported: string[]
  mp3Blob: Blob
  duration: number
}

export function generateMorseAudio(text: string, options: MorseAudioOptions): GeneratedMorseAudio {
  const sampleRate = 44100
  const { morse, unsupported } = encodeTextToMorse(text)
  const signal = synthesizeMorse(morse, sampleRate, options)
  const mp3Blob = encodeMp3(signal, sampleRate)

  return {
    morse,
    unsupported,
    mp3Blob,
    duration: signal.length / sampleRate,
  }
}

function synthesizeMorse(morse: string, sampleRate: number, options: MorseAudioOptions): Float32Array {
  const samples: number[] = []
  const unitMs = options.unitMs

  const appendTone = (durationMs: number) => {
    const count = Math.round((sampleRate * durationMs) / 1000)
    for (let i = 0; i < count; i += 1) {
      const fade = Math.min(1, i / 180, (count - i) / 180)
      samples.push(oscillatorSample(options.waveType, options.frequencyHz, i, sampleRate) * options.volume * fade)
    }
  }

  const appendSilence = (durationMs: number) => {
    const count = Math.round((sampleRate * durationMs) / 1000)
    for (let i = 0; i < count; i += 1) {
      samples.push(0)
    }
  }

  const words = morse.split(' / ').filter(Boolean)
  words.forEach((word, wordIndex) => {
    const letters = word.split(' ').filter(Boolean)
    letters.forEach((letter, letterIndex) => {
      Array.from(letter).forEach((mark, markIndex) => {
        appendTone(mark === '.' ? unitMs : unitMs * 3)
        if (markIndex < letter.length - 1) {
          appendSilence(unitMs)
        }
      })
      if (letterIndex < letters.length - 1) {
        appendSilence(unitMs * 3)
      }
    })
    if (wordIndex < words.length - 1) {
      appendSilence(unitMs * 7)
    }
  })

  return Float32Array.from(samples)
}

function oscillatorSample(type: MorseWaveType, frequencyHz: number, index: number, sampleRate: number): number {
  const phase = (frequencyHz * index) / sampleRate
  const normalized = phase - Math.floor(phase)

  switch (type) {
    case 'square':
      return normalized < 0.5 ? 1 : -1
    case 'triangle':
      return 1 - 4 * Math.abs(normalized - 0.5)
    case 'sawtooth':
      return 2 * normalized - 1
    case 'sine':
    default:
      return Math.sin(2 * Math.PI * phase)
  }
}

function encodeMp3(signal: Float32Array, sampleRate: number): Blob {
  const encoder = new lamejs.Mp3Encoder(1, sampleRate, 128)
  const blockSize = 1152
  const chunks: BlobPart[] = []

  for (let start = 0; start < signal.length; start += blockSize) {
    const block = signal.subarray(start, start + blockSize)
    const pcm = new Int16Array(block.length)
    for (let i = 0; i < block.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, block[i]))
      pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    }
    const mp3Buffer = encoder.encodeBuffer(pcm)
    if (mp3Buffer.length > 0) {
      chunks.push(toBlobPart(mp3Buffer))
    }
  }

  const finalBuffer = encoder.flush()
  if (finalBuffer.length > 0) {
    chunks.push(toBlobPart(finalBuffer))
  }

  return new Blob(chunks, { type: 'audio/mpeg' })
}

function toBlobPart(buffer: Uint8Array): BlobPart {
  const copy = new Uint8Array(buffer.byteLength)
  copy.set(buffer)
  return copy.buffer
}
