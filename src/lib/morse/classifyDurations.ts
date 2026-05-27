import type { DurationClassification, Segment } from '../types'

export function classifyDurations(
  segments: Segment[],
  dashRatio = 2.2,
  wordGapRatio = 5.5,
): DurationClassification {
  const timing = estimateTiming(segments, dashRatio, wordGapRatio)
  const unitMs = timing.unitMs
  const letterSymbols: string[] = []
  const words: string[][] = [[]]
  let currentLetter = ''

  const flushLetter = () => {
    if (currentLetter.length > 0) {
      letterSymbols.push(currentLetter)
      words[words.length - 1].push(currentLetter)
      currentLetter = ''
    }
  }

  const flushWord = () => {
    flushLetter()
    if (words[words.length - 1].length > 0) {
      words.push([])
    }
  }

  for (const segment of segments) {
    const units = unitMs > 0 ? segment.durationMs / unitMs : 0
    if (segment.type === 'on') {
      currentLetter += segment.durationMs >= timing.dashThresholdMs ? '-' : '.'
      continue
    }

    if (segment.durationMs >= timing.wordGapThresholdMs) {
      flushWord()
    } else if (segment.durationMs >= timing.letterGapThresholdMs) {
      flushLetter()
    }
  }

  flushLetter()

  const morse = words
    .filter((word) => word.length > 0)
    .map((word) => word.join(' '))
    .join(' / ')

  return {
    unitMs,
    morse,
    invalidSymbols: [],
    letterSymbols,
  }
}

type TimingModel = {
  unitMs: number
  dashThresholdMs: number
  letterGapThresholdMs: number
  wordGapThresholdMs: number
}

function estimateTiming(segments: Segment[], dashRatio: number, wordGapRatio: number): TimingModel {
  const relevant = trimEdgeSilence(segments)
  const onDurations = relevant
    .filter((segment) => segment.type === 'on')
    .map((segment) => segment.durationMs)
    .filter((duration) => duration >= 20)
    .sort((a, b) => a - b)
  const offDurations = relevant
    .filter((segment) => segment.type === 'off')
    .map((segment) => segment.durationMs)
    .filter((duration) => duration >= 20)
    .sort((a, b) => a - b)

  if (onDurations.length === 0) {
    return {
      unitMs: 80,
      dashThresholdMs: 80 * dashRatio,
      letterGapThresholdMs: 80 * dashRatio,
      wordGapThresholdMs: 80 * wordGapRatio,
    }
  }

  const candidates = candidateUnits(onDurations, offDurations)
  const unitMs =
    candidates.length === 0
      ? fallbackUnit(onDurations)
      : candidates
          .map((unit) => ({
            unit,
            score: scoreUnit(unit, onDurations, offDurations),
          }))
          .sort((a, b) => a.score - b.score)[0]?.unit ?? fallbackUnit(onDurations)

  const dashThresholdMs = estimateDashThreshold(onDurations, unitMs, dashRatio)
  const gapThresholds = estimateGapThresholds(offDurations, unitMs, dashRatio, wordGapRatio)

  return {
    unitMs,
    dashThresholdMs,
    letterGapThresholdMs: gapThresholds.letterGapThresholdMs,
    wordGapThresholdMs: gapThresholds.wordGapThresholdMs,
  }
}

function trimEdgeSilence(segments: Segment[]): Segment[] {
  let start = 0
  let end = segments.length

  while (segments[start]?.type === 'off') {
    start += 1
  }
  while (segments[end - 1]?.type === 'off') {
    end -= 1
  }

  return segments.slice(start, end)
}

function candidateUnits(onDurations: number[], offDurations: number[]): number[] {
  const candidates = new Set<number>()

  for (const duration of onDurations) {
    candidates.add(duration)
    candidates.add(duration / 3)
  }

  for (const duration of offDurations) {
    candidates.add(duration)
    candidates.add(duration / 3)
    candidates.add(duration / 7)
  }

  const shortestUseful = percentile([...onDurations, ...offDurations].sort((a, b) => a - b), 0.15)
  for (let unit = 25; unit <= 420; unit += 5) {
    if (unit >= shortestUseful * 0.45 && unit <= shortestUseful * 3.5) {
      candidates.add(unit)
    }
  }

  return Array.from(candidates)
    .filter((unit) => Number.isFinite(unit) && unit >= 18 && unit <= 900)
    .sort((a, b) => a - b)
}

function scoreUnit(unit: number, onDurations: number[], offDurations: number[]): number {
  const onScore = meanBestError(onDurations, unit, [1, 3])
  const offScore = meanBestError(offDurations, unit, [1, 3, 7])
  const shortOffs = offDurations.filter((duration) => duration / unit < 2.2).length
  const offBalance = offDurations.length > 0 ? 1 - shortOffs / offDurations.length : 0.2

  return onScore * 0.58 + offScore * 0.36 + Math.max(0, offBalance) * 0.06
}

function estimateDashThreshold(onDurations: number[], unitMs: number, dashRatio: number): number {
  const fallback = unitMs * dashRatio
  if (onDurations.length < 3) {
    return fallback
  }

  const split = strongestDurationBoundary(onDurations)
  if (!split || split.ratio < 1.65) {
    return fallback
  }

  const boundary = geometricMean(split.left, split.right)
  return clamp(boundary, unitMs * 1.55, unitMs * 3.15)
}

function estimateGapThresholds(
  offDurations: number[],
  unitMs: number,
  letterRatio: number,
  wordRatio: number,
): { letterGapThresholdMs: number; wordGapThresholdMs: number } {
  const fallbackLetter = unitMs * letterRatio
  const fallbackWord = unitMs * wordRatio
  const sorted = offDurations.filter((duration) => duration >= 20).sort((a, b) => a - b)

  if (sorted.length < 3) {
    return {
      letterGapThresholdMs: fallbackLetter,
      wordGapThresholdMs: fallbackWord,
    }
  }

  const boundaries = durationBoundaries(sorted)
  const letterBoundary = boundaries[0]
  const wordBoundary = boundaries[1]
  const letterGapThresholdMs =
    letterBoundary && letterBoundary.ratio >= 1.28
      ? geometricMean(letterBoundary.left, letterBoundary.right)
      : fallbackLetter
  const wordGapThresholdMs =
    wordBoundary && wordBoundary.ratio >= 1.35
      ? geometricMean(wordBoundary.left, wordBoundary.right)
      : Math.max(fallbackWord, letterGapThresholdMs * 1.85)

  return {
    letterGapThresholdMs: clamp(letterGapThresholdMs, unitMs * 1.45, unitMs * 4.3),
    wordGapThresholdMs: clamp(wordGapThresholdMs, letterGapThresholdMs * 1.28, unitMs * 11),
  }
}

function strongestDurationBoundary(durations: number[]): { left: number; right: number; ratio: number } | null {
  return durationBoundaries(durations)[0] ?? null
}

function durationBoundaries(durations: number[]): Array<{ left: number; right: number; ratio: number; index: number }> {
  const sorted = [...durations].filter((duration) => duration > 0).sort((a, b) => a - b)
  const boundaries: Array<{ left: number; right: number; ratio: number; index: number }> = []

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const left = sorted[i]
    const right = sorted[i + 1]
    const ratio = right / Math.max(1, left)
    if (ratio > 1.12) {
      boundaries.push({ left, right, ratio, index: i })
    }
  }

  return boundaries
    .sort((a, b) => b.ratio - a.ratio)
    .filter((boundary, index, all) => all.findIndex((item) => Math.abs(item.index - boundary.index) <= 1) === index)
    .slice(0, 2)
    .sort((a, b) => a.index - b.index)
}

function geometricMean(a: number, b: number): number {
  return Math.sqrt(Math.max(1, a) * Math.max(1, b))
}

function meanBestError(durations: number[], unit: number, targets: number[]): number {
  if (durations.length === 0) {
    return 0.35
  }

  const trimmed = trimOutliers(durations)
  const errors = trimmed.map((duration) => {
    const units = duration / unit
    const bestTarget = targets.reduce((best, target) => {
      const error = Math.abs(Math.log2(Math.max(0.05, units) / target))
      return error < best.error ? { target, error } : best
    }, { target: targets[0], error: Number.POSITIVE_INFINITY })

    const absoluteError = Math.abs(units - bestTarget.target) / Math.max(1, bestTarget.target)
    return bestTarget.error * 0.7 + absoluteError * 0.3
  })

  return errors.reduce((sum, error) => sum + error, 0) / errors.length
}

function trimOutliers(values: number[]): number[] {
  if (values.length < 8) {
    return values
  }

  const sorted = [...values].sort((a, b) => a - b)
  const start = Math.floor(sorted.length * 0.08)
  const end = Math.ceil(sorted.length * 0.94)
  return sorted.slice(start, end)
}

function fallbackUnit(onDurations: number[]): number {
  const plausibleDots = onDurations.slice(0, Math.max(1, Math.ceil(onDurations.length * 0.45)))
  return Math.max(35, median(plausibleDots))
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) {
    return 80
  }
  const index = Math.min(values.length - 1, Math.max(0, Math.round((values.length - 1) * fraction)))
  return values[index]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 80
  }
  const middle = Math.floor(values.length / 2)
  if (values.length % 2 === 1) {
    return values[middle]
  }
  return (values[middle - 1] + values[middle]) / 2
}
