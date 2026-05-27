export type ToneCandidate = {
  frequencyHz: number
  avgEnergy: number
  occurrenceCount: number
  stabilityScore: number
  repetitionScore: number
  onOffClarityScore: number
  morseValidityScore: number
  totalScore: number
}

export type Segment = {
  type: 'on' | 'off'
  startTime: number
  endTime: number
  durationMs: number
}

export type DecodeResult = {
  toneHz: number
  confidence: number
  morse: string
  text: string
  segments: Segment[]
  warnings: string[]
  candidates: ToneCandidate[]
  unitMs: number
  invalidSymbols: string[]
  envelope: EnvelopePoint[]
  spectrum: SpectrumPoint[]
  waveform: number[]
  alternatives: DecodeAlternative[]
}

export type DecodeAlternative = {
  text: string
  morse: string
  confidence: number
  sensitivity: number
  unitMs: number
}

export type AudioData = {
  sampleRate: number
  channels: Float32Array[]
  duration: number
}

export type AnalysisSettings = {
  minFrequency: number
  maxFrequency: number
  sensitivity: number
  dashRatio: number
  wordGapRatio: number
  maxAnalysisSeconds: number
}

export type Frame = {
  index: number
  startSample: number
  startTime: number
  rms: number
}

export type SpectrumPeak = {
  frameIndex: number
  time: number
  frequencyHz: number
  energy: number
}

export type SpectrumPoint = {
  frequencyHz: number
  energy: number
}

export type EnvelopePoint = {
  time: number
  energy: number
  threshold: number
  isOn: boolean
}

export type DurationClassification = {
  unitMs: number
  morse: string
  invalidSymbols: string[]
  letterSymbols: string[]
}

export const DEFAULT_SETTINGS: AnalysisSettings = {
  minFrequency: 300,
  maxFrequency: 2000,
  sensitivity: 0.52,
  dashRatio: 2.2,
  wordGapRatio: 5.5,
  maxAnalysisSeconds: 120,
}
