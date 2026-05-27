import type { AnalysisSettings, DecodeAlternative, DecodeResult, EnvelopePoint, Segment } from '../types'
import { decodeMorse } from '../morse/decodeMorse'
import { classifyDurations } from '../morse/classifyDurations'
import { validateMorse } from '../morse/validateMorse'
import { energyEnvelope } from './energyEnvelope'
import { frequencyAnalysis } from './frequencyAnalysis'
import { normalize } from './normalize'
import { segmentation } from './segmentation'
import { thresholdEnvelope } from './thresholding'
import { toMono } from './toMono'
import { toneCandidateDetection } from './toneCandidateDetection'

export async function analyzeMorseAudio(
  channels: Float32Array[],
  sampleRate: number,
  settings: AnalysisSettings,
): Promise<DecodeResult> {
  const warnings: string[] = []
  const maxSamples = Math.floor(settings.maxAnalysisSeconds * sampleRate)
  const mono = normalize(toMono(channels).slice(0, maxSamples))

  if (channels[0]?.length > maxSamples) {
    warnings.push(`análisis limitado a los primeros ${settings.maxAnalysisSeconds} segundos`)
  }

  const spectral = frequencyAnalysis(mono, sampleRate, settings)
  const candidates = toneCandidateDetection(spectral.peaks, mono, sampleRate, settings)
  const best = candidates[0]

  if (!best) {
    return {
      toneHz: 0,
      confidence: 0,
      morse: '',
      text: '',
      segments: [],
      warnings: ['no se detectó un tono Morse candidato'],
      candidates: [],
      unitMs: 0,
      invalidSymbols: [],
      envelope: [],
      spectrum: spectral.spectrum,
      waveform: makeWaveformPreview(mono),
      alternatives: [],
    }
  }

  if (best.totalScore < 0.38) {
    warnings.push('tono candidato débil')
  }
  if (best.onOffClarityScore < 0.45) {
    warnings.push('patrón ON/OFF poco claro')
  }
  if (best.repetitionScore < 0.35) {
    warnings.push('pocas repeticiones del tono')
  }

  const rawEnvelope = energyEnvelope(mono, sampleRate, best.frequencyHz)
  const decodePasses = sensitivitySweep(settings.sensitivity).map((sensitivity) =>
    decodeWithSensitivity(rawEnvelope, sensitivity, settings),
  )
  const chosenPass = decodePasses.sort((a, b) => b.score - a.score)[0]
  const envelope = chosenPass.envelope
  const segments = chosenPass.segments
  const classification = chosenPass.classification
  const decoded = chosenPass.decoded
  const validation = chosenPass.validation
  const invalidSymbols = Array.from(new Set([...decoded.invalidSymbols, ...validation.invalidSymbols]))

  if (invalidSymbols.length > 0) {
    warnings.push('muchos símbolos inválidos')
  }
  if (hasInconsistentSpacing(segments, classification.unitMs)) {
    warnings.push('espaciado inconsistente')
  }
  const finalSegment = segments.at(-1)
  if (finalSegment?.type === 'on' && finalSegment.durationMs < classification.unitMs * 0.7) {
    warnings.push('signo final incompleto')
  }
  if (detectPossibleReverb(segments, classification.unitMs)) {
    warnings.push('posible audio con eco/reverb')
  }

  const confidence = Math.round(
    Math.min(
      1,
      best.totalScore * 0.64 +
        validation.validityScore * 0.18 +
        best.onOffClarityScore * 0.08 +
        chosenPass.languageScore * 0.1,
    ) * 100,
  )

  return {
    toneHz: best.frequencyHz,
    confidence,
    morse: classification.morse,
    text: decoded.text,
    segments,
    warnings: Array.from(new Set(warnings)),
    candidates,
    unitMs: classification.unitMs,
    invalidSymbols,
    envelope,
    spectrum: spectral.spectrum,
    waveform: makeWaveformPreview(mono),
    alternatives: makeAlternatives(decodePasses, chosenPass),
  }
}

type DecodePass = {
  sensitivity: number
  envelope: EnvelopePoint[]
  segments: Segment[]
  classification: ReturnType<typeof classifyDurations>
  decoded: ReturnType<typeof decodeMorse>
  validation: ReturnType<typeof validateMorse>
  languageScore: number
  fragmentationScore: number
  spacingScore: number
  score: number
}

function sensitivitySweep(baseSensitivity: number): number[] {
  const values = [-0.18, -0.09, 0, 0.09, 0.18, 0.28].map((offset) =>
    Math.min(1, Math.max(0.05, baseSensitivity + offset)),
  )
  return Array.from(new Set(values.map((value) => Number(value.toFixed(2)))))
}

function decodeWithSensitivity(
  rawEnvelope: EnvelopePoint[],
  sensitivity: number,
  settings: AnalysisSettings,
): DecodePass {
  const envelope = thresholdEnvelope(rawEnvelope, sensitivity)
  const segments = segmentation(envelope)
  const classification = classifyDurations(segments, settings.dashRatio, settings.wordGapRatio)
  const decoded = decodeMorse(classification.morse)
  const validation = validateMorse(classification.morse)
  const languageScore = scoreLanguage(decoded.text)
  const fragmentationScore = scoreFragmentation(decoded.text, classification.morse)
  const spacingScore = scoreSpacing(segments, classification.unitMs)
  const score =
    validation.validityScore * 0.18 +
    languageScore * 0.34 +
    fragmentationScore * 0.22 +
    spacingScore * 0.14 +
    scoreSymbolShape(classification.morse) * 0.08 +
    scoreSegmentCount(segments) * 0.04

  return {
    sensitivity,
    envelope,
    segments,
    classification,
    decoded,
    validation,
    languageScore,
    fragmentationScore,
    spacingScore,
    score,
  }
}

function makeAlternatives(passes: DecodePass[], chosen: DecodePass): DecodeAlternative[] {
  const seen = new Set<string>([chosen.decoded.text])
  return passes
    .filter((pass) => pass.decoded.text && pass.score > 0.34)
    .sort((a, b) => b.score - a.score)
    .filter((pass) => {
      if (seen.has(pass.decoded.text)) {
        return false
      }
      seen.add(pass.decoded.text)
      return true
    })
    .slice(0, 4)
    .map((pass) => ({
      text: pass.decoded.text,
      morse: pass.classification.morse,
      confidence: Math.round(pass.score * 100),
      sensitivity: pass.sensitivity,
      unitMs: pass.classification.unitMs,
    }))
}

function scoreLanguage(text: string): number {
  if (!text) {
    return 0
  }

  const normalized = text.toUpperCase().replace(/�/g, '#')
  const validChars = normalized.replace(/[^A-Z0-9 .,?/!:@_-]/g, '').length / normalized.length
  const replacementPenalty = normalized.includes('#') ? 0.35 : 0
  const words = normalized
    .replace(/[.,?/!:@_-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const commonWords = new Set([
    'A',
    'ALLA',
    'DE',
    'EL',
    'EN',
    'ES',
    'ESTA',
    'HOLA',
    'LA',
    'OK',
    'QUE',
    'SI',
    'SOS',
    'TEST',
    'TODO',
    'Y',
  ])
  const normalizedWords = words.map(removeAccents)
  const knownWordScore =
    normalizedWords.length === 0
      ? 0
      : normalizedWords.filter((word) => commonWords.has(word)).length / normalizedWords.length
  const vowelScore =
    normalizedWords.length === 0
      ? 0
      : normalizedWords.filter((word) => word.length <= 2 || /[AEIOU]/.test(word)).length / normalizedWords.length
  const consonantRunPenalty = normalizedWords.some((word) => /[BCDFGHJKLMNPQRSTVWXYZ]{5,}/.test(word)) ? 0.18 : 0
  const weirdShortWords = normalizedWords.filter((word) => word.length === 1 && !['A', 'I', 'Y'].includes(word)).length
  const shortWordPenalty = normalizedWords.length === 0 ? 0 : Math.min(0.35, weirdShortWords / normalizedWords.length)

  return Math.min(
    1,
    Math.max(
      0,
      validChars * 0.16 +
        knownWordScore * 0.48 +
        vowelScore * 0.28 +
        scorePunctuation(text) * 0.08 -
        replacementPenalty -
        consonantRunPenalty -
        shortWordPenalty,
    ),
  )
}

function removeAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function scoreSpacing(segments: Segment[], unitMs: number): number {
  if (unitMs <= 0) {
    return 0
  }

  const offSegments = segments.filter((segment) => segment.type === 'off')
  if (offSegments.length === 0) {
    return 0.2
  }

  const ambiguous = offSegments.filter((segment) => {
    const units = segment.durationMs / unitMs
    return (units > 1.45 && units < 2.1) || (units > 3.8 && units < 5.2)
  }).length

  return 1 - ambiguous / offSegments.length
}

function scoreFragmentation(text: string, morse: string): number {
  const symbols = morse
    .split(/\s+|\/+/)
    .map((symbol) => symbol.trim())
    .filter(Boolean)

  if (symbols.length === 0) {
    return 0
  }

  const singleSymbolRatio = symbols.filter((symbol) => symbol.length === 1).length / symbols.length
  const averageSymbolLength = symbols.reduce((sum, symbol) => sum + symbol.length, 0) / symbols.length
  const singleSymbolScore = 1 - clamp((singleSymbolRatio - 0.33) / 0.42, 0, 1)
  const averageLengthScore = clamp((averageSymbolLength - 1.15) / 1.15, 0, 1)

  const words = text
    .toUpperCase()
    .replace(/[.,?/!:@_-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(removeAccents)
  const badSingleLetterWords = words.filter((word) => word.length === 1 && !['A', 'I', 'Y'].includes(word)).length
  const singleWordScore = words.length === 0 ? 0.5 : 1 - clamp(badSingleLetterWords / Math.max(1, words.length), 0, 1)

  return clamp(singleSymbolScore * 0.46 + averageLengthScore * 0.34 + singleWordScore * 0.2, 0, 1)
}

function scorePunctuation(text: string): number {
  const punctuation = text.match(/[.?]/g)?.length ?? 0
  return punctuation > 0 ? 1 : 0
}

function scoreSymbolShape(morse: string): number {
  const symbols = morse
    .split(/\s+|\/+/)
    .map((symbol) => symbol.trim())
    .filter(Boolean)
  if (symbols.length === 0) {
    return 0
  }
  const plausible = symbols.filter((symbol) => symbol.length <= 6).length
  return plausible / symbols.length
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function scoreSegmentCount(segments: Segment[]): number {
  const onCount = segments.filter((segment) => segment.type === 'on').length
  if (onCount === 0) {
    return 0
  }
  return Math.min(1, onCount / 12)
}

function makeWaveformPreview(signal: Float32Array, points = 240): number[] {
  if (signal.length === 0) {
    return []
  }

  const bucketSize = Math.max(1, Math.floor(signal.length / points))
  const preview: number[] = []
  for (let start = 0; start < signal.length; start += bucketSize) {
    let peak = 0
    for (let i = start; i < Math.min(signal.length, start + bucketSize); i += 1) {
      peak = Math.max(peak, Math.abs(signal[i]))
    }
    preview.push(peak)
  }
  return preview.slice(0, points)
}

function hasInconsistentSpacing(segments: DecodeResult['segments'], unitMs: number): boolean {
  if (unitMs <= 0) {
    return false
  }

  const normalizedOff = segments
    .filter((segment) => segment.type === 'off' && segment.durationMs > unitMs * 0.6)
    .map((segment) => segment.durationMs / unitMs)

  if (normalizedOff.length < 4) {
    return false
  }

  const uncertain = normalizedOff.filter(
    (units) => (units > 1.35 && units < 2.1) || (units > 3.8 && units < 5.2),
  )
  return uncertain.length / normalizedOff.length > 0.32
}

function detectPossibleReverb(segments: DecodeResult['segments'], unitMs: number): boolean {
  if (unitMs <= 0) {
    return false
  }

  const tinyOffGaps = segments.filter(
    (segment) => segment.type === 'off' && segment.durationMs > 25 && segment.durationMs < unitMs * 0.55,
  ).length

  return tinyOffGaps >= 4
}
