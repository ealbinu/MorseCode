import type { DecodeResult } from '../lib/types'

type DebugPanelProps = {
  result: DecodeResult | null
}

export function DebugPanel({ result }: DebugPanelProps) {
  return (
    <section className="panel debug-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Panel de servicio</p>
          <h3>Debug</h3>
        </div>
      </div>
      {result ? (
        <div className="debug-grid">
          <div>
            <strong>Frecuencia elegida</strong>
            <span>{result.toneHz.toFixed(2)} Hz</span>
          </div>
          <div>
            <strong>Duración base</strong>
            <span>{result.unitMs.toFixed(1)} ms</span>
          </div>
          <div>
            <strong>Símbolos inválidos</strong>
            <span>{result.invalidSymbols.length ? result.invalidSymbols.join(', ') : 'ninguno'}</span>
          </div>
          <div>
            <strong>Segmentos</strong>
            <span>{result.segments.length}</span>
          </div>
        </div>
      ) : (
        <div className="empty-slot">Esperando diagnóstico</div>
      )}
      <div className="candidate-table">
        <div className="candidate-table__head">
          <span>Hz</span>
          <span>Energía</span>
          <span>Rep.</span>
          <span>Est.</span>
          <span>ON/OFF</span>
          <span>Score</span>
        </div>
        {(result?.candidates ?? []).slice(0, 10).map((candidate) => (
          <div className="candidate-table__row" key={candidate.frequencyHz}>
            <span>{candidate.frequencyHz.toFixed(1)}</span>
            <span>{formatScore(candidate.avgEnergy)}</span>
            <span>{candidate.repetitionScore.toFixed(2)}</span>
            <span>{candidate.stabilityScore.toFixed(2)}</span>
            <span>{candidate.onOffClarityScore.toFixed(2)}</span>
            <span>{candidate.totalScore.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function formatScore(value: number): string {
  if (value >= 1000) {
    return value.toExponential(1)
  }
  return value.toFixed(2)
}
