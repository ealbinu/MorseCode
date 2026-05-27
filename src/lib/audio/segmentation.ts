import type { EnvelopePoint, Segment } from '../types'

export function segmentation(points: EnvelopePoint[], hopMs = 10): Segment[] {
  if (points.length === 0) {
    return []
  }

  const segments: Segment[] = []
  let currentType: Segment['type'] = points[0].isOn ? 'on' : 'off'
  let startTime = points[0].time

  for (let i = 1; i < points.length; i += 1) {
    const pointType: Segment['type'] = points[i].isOn ? 'on' : 'off'
    if (pointType !== currentType) {
      segments.push(makeSegment(currentType, startTime, points[i].time))
      currentType = pointType
      startTime = points[i].time
    }
  }

  const lastTime = points[points.length - 1].time + hopMs / 1000
  segments.push(makeSegment(currentType, startTime, lastTime))

  return cleanupSegments(segments)
}

function cleanupSegments(segments: Segment[]): Segment[] {
  const withoutClicks = segments.filter((segment, index) => {
    if (segment.type === 'on' && segment.durationMs < 18) {
      return false
    }
    if (index === 0 && segment.type === 'off') {
      return segment.durationMs > 80
    }
    if (index === segments.length - 1 && segment.type === 'off') {
      return segment.durationMs > 80
    }
    return true
  })

  return mergeShortGaps(mergeAdjacent(withoutClicks))
}

function mergeShortGaps(segments: Segment[]): Segment[] {
  const merged: Segment[] = []

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i]
    const previous = merged[merged.length - 1]
    const next = segments[i + 1]

    if (
      segment.type === 'off' &&
      segment.durationMs < 25 &&
      previous?.type === 'on' &&
      next?.type === 'on'
    ) {
      const expanded = makeSegment('on', previous.startTime, next.endTime)
      merged[merged.length - 1] = expanded
      i += 1
      continue
    }

    merged.push(segment)
  }

  return mergeAdjacent(merged)
}

function mergeAdjacent(segments: Segment[]): Segment[] {
  const merged: Segment[] = []
  for (const segment of segments) {
    const previous = merged[merged.length - 1]
    if (previous && previous.type === segment.type) {
      merged[merged.length - 1] = makeSegment(previous.type, previous.startTime, segment.endTime)
    } else {
      merged.push(segment)
    }
  }
  return merged
}

function makeSegment(type: Segment['type'], startTime: number, endTime: number): Segment {
  return {
    type,
    startTime,
    endTime,
    durationMs: Math.max(0, (endTime - startTime) * 1000),
  }
}
