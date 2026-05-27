import type { DecodeResult } from '../lib/types'

type SpectrogramViewProps = {
  result: DecodeResult | null
}

export function SpectrogramView({ result }: SpectrogramViewProps) {
  const spectrum = result?.spectrum ?? []
  const waveform = result?.waveform ?? []

  return (
    <section className="panel scope-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Osciloscopio</p>
          <h3>Espectro y forma de onda</h3>
        </div>
      </div>
      <div className="scope-grid">
        <svg className="waveform" viewBox="0 0 240 100" role="img" aria-label="Forma de onda simplificada">
          <rect width="240" height="100" rx="4" />
          <path d={waveformPath(waveform)} />
          <line x1="0" y1="50" x2="240" y2="50" />
        </svg>
        <div className="spectrum" aria-label="Espectro de frecuencia">
          {spectrum.length ? (
            spectrum.map((point) => (
              <span
                key={point.frequencyHz}
                className={result && Math.abs(point.frequencyHz - result.toneHz) < 18 ? 'is-selected' : ''}
                style={{ height: `${Math.max(4, point.energy * 100)}%` }}
                title={`${point.frequencyHz.toFixed(0)} Hz`}
              />
            ))
          ) : (
            <div className="empty-slot">Sin espectro</div>
          )}
        </div>
      </div>
    </section>
  )
}

function waveformPath(values: number[]): string {
  if (values.length === 0) {
    return ''
  }

  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 240
      const y = 50 - value * 42
      const lowerY = 50 + value * 42
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} L ${x.toFixed(2)} ${lowerY.toFixed(2)}`
    })
    .join(' ')
}
