import type { AudioData } from '../types'

export async function decodeAudioFile(file: File): Promise<AudioData> {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  const audioContext = new AudioContextClass()

  try {
    const buffer = await file.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(buffer.slice(0))
    const channels: Float32Array[] = []

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
      channels.push(new Float32Array(audioBuffer.getChannelData(channel)))
    }

    return {
      sampleRate: audioBuffer.sampleRate,
      channels,
      duration: audioBuffer.duration,
    }
  } finally {
    await audioContext.close()
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
