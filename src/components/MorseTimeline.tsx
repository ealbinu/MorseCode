import type { DecodeResult } from '../lib/types'

type MorseTimelineProps = {
  result: DecodeResult | null
}

export function MorseTimeline({ result }: MorseTimelineProps) {
  const totalMs = result?.segments.at(-1)?.endTime ? result.segments.at(-1)!.endTime * 1000 : 0

  return (
    <section className="panel timeline-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Registrador ON/OFF</p>
          <h3>Línea de tiempo</h3>
        </div>
      </div>
      <div className="timeline">
        {result && totalMs > 0 ? (
          result.segments.map((segment, index) => {
            const width = Math.max(0.7, (segment.durationMs / totalMs) * 100)
            const symbol =
              segment.type === 'on'
                ? segment.durationMs >= result.unitMs * 2.2
                  ? '-'
                  : '.'
                : ''

            return (
              <span
                className={`timeline__segment ${segment.type}`}
                key={`${segment.startTime}-${index}`}
                style={{ width: `${width}%` }}
                title={`${segment.type.toUpperCase()} ${segment.durationMs.toFixed(0)} ms`}
              >
                {symbol}
              </span>
            )
          })
        ) : (
          <div className="empty-slot">La cinta aparecerá después del análisis</div>
        )}
      </div>
    </section>
  )
}
