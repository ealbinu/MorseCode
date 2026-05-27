import type { AnalysisSettings, SpectrumPeak, ToneCandidate } from '../types'
import { classifyDurations } from '../morse/classifyDurations'
import { validateMorse } from '../morse/validateMorse'
import { energyEnvelope } from './energyEnvelope'
import { thresholdEnvelope } from './thresholding'
import { segmentation } from './segmentation'

type GroupedCandidate = {
  frequencyHz: number
  energies: number[]
  frameIndices: Set<number>
  frequencies: number[]
}

export function toneCandidateDetection(
  peaks: SpectrumPeak[],
  signal: Float32Array,
  sampleRate: number,
  settings: AnalysisSettings,
): ToneCandidate[] {
  const groups = groupPeaks(peaks)
  if (groups.length === 0) {
    return []
  }

  const maxAvgEnergy = Math.max(...groups.map((group) => average(group.energies)), 1e-12)
  const maxOccurrence = Math.max(...groups.map((group) => group.frameIndices.size), 1)

  return groups
    .sort((a, b) => average(b.energies) * b.frameIndices.size - average(a.energies) * a.frameIndices.size)
    .slice(0, 14)
    .map((group) => scoreCandidate(group, signal, sampleRate, settings, maxAvgEnergy, maxOccurrence))
    .sort((a, b) => b.totalScore - a.totalScore)
}

function groupPeaks(peaks: SpectrumPeak[]): GroupedCandidate[] {
  const groups = new Map<number, GroupedCandidate>()

  for (const peak of peaks) {
    const bucketFrequency = Math.round(peak.frequencyHz / 25) * 25
    const group = groups.get(bucketFrequency) ?? {
      frequencyHz: bucketFrequency,
      energies: [],
      frameIndices: new Set<number>(),
      frequencies: [],
    }

    group.energies.push(peak.energy)
    group.frameIndices.add(peak.frameIndex)
    group.frequencies.push(peak.frequencyHz)
    groups.set(bucketFrequency, group)
  }

  return Array.from(groups.values()).filter((group) => group.frameIndices.size >= 3)
}

function scoreCandidate(
  group: GroupedCandidate,
  signal: Float32Array,
  sampleRate: number,
  settings: AnalysisSettings,
  maxAvgEnergy: number,
  maxOccurrence: number,
): ToneCandidate {
  const avgEnergy = average(group.energies)
  const weightedFrequency =
    group.frequencies.reduce((sum, frequency, index) => sum + frequency * group.energies[index], 0) /
    Math.max(1e-12, group.energies.reduce((sum, energy) => sum + energy, 0))
  const frequencySpread = standardDeviation(group.frequencies)
  const energyScore = saturate(Math.log10(1 + avgEnergy) / Math.log10(1 + maxAvgEnergy))
  const repetitionScore = saturate(Math.sqrt(group.frameIndices.size / maxOccurrence))
  const stabilityScore = saturate(1 - frequencySpread / 55)

  const envelope = thresholdEnvelope(energyEnvelope(signal, sampleRate, weightedFrequency), settings.sensitivity)
  const segments = segmentation(envelope)
  const onSegments = segments.filter((segment) => segment.type === 'on')
  const offSegments = segments.filter((segment) => segment.type === 'off')
  const onFraction = onSegments.reduce((sum, segment) => sum + segment.durationMs, 0) /
    Math.max(1, segments.reduce((sum, segment) => sum + segment.durationMs, 0))
  const transitionScore = saturate(onSegments.length / 8)
  const dutyScore = onFraction > 0.03 && onFraction < 0.72 ? 1 : onFraction < 0.03 ? onFraction / 0.03 : (1 - onFraction) / 0.28
  const offVariety = uniqueDurationBands(offSegments.map((segment) => segment.durationMs))
  const onOffClarityScore = saturate(transitionScore * 0.45 + dutyScore * 0.35 + offVariety * 0.2)
  const classification = classifyDurations(segments, settings.dashRatio, settings.wordGapRatio)
  const validation = validateMorse(classification.morse)
  const morseValidityScore = validation.totalSymbols < 2 ? 0.15 * validation.validityScore : validation.validityScore
  const totalScore =
    energyScore * 0.25 +
    repetitionScore * 0.25 +
    stabilityScore * 0.2 +
    onOffClarityScore * 0.2 +
    morseValidityScore * 0.1

  return {
    frequencyHz: weightedFrequency,
    avgEnergy,
    occurrenceCount: group.frameIndices.size,
    stabilityScore,
    repetitionScore,
    onOffClarityScore,
    morseValidityScore,
    totalScore: saturate(totalScore),
  }
}

function uniqueDurationBands(durations: number[]): number {
  if (durations.length < 2) {
    return 0.1
  }

  const bands = new Set(durations.map((duration) => Math.round(Math.log2(Math.max(20, duration) / 20))))
  return saturate(bands.size / 4)
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) {
    return 0
  }
  const avg = average(values)
  const variance = average(values.map((value) => (value - avg) ** 2))
  return Math.sqrt(variance)
}

function saturate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(1, Math.max(0, value))
}
