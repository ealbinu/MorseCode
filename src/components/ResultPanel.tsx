import type { DecodeResult } from '../lib/types'

type ResultPanelProps = {
  result: DecodeResult | null
}

export function ResultPanel({ result }: ResultPanelProps) {
  return (
    <section className="panel result-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Cinta decodificada</p>
          <h3>Resultado</h3>
        </div>
      </div>
      <div className="decoded-text">{result?.text || '—'}</div>
      <div className="morse-text">{result?.morse || 'Sin símbolos detectados'}</div>
      {result?.warnings.length ? (
        <div className="warning-list">
          {result.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      ) : null}
      {result?.alternatives.length ? (
        <div className="alternatives">
          <p>Lecturas alternativas</p>
          {result.alternatives.map((alternative) => (
            <button
              key={`${alternative.text}-${alternative.sensitivity}`}
              type="button"
              title={`${alternative.morse} · sensibilidad ${alternative.sensitivity} · unidad ${alternative.unitMs.toFixed(0)} ms`}
            >
              <strong>{alternative.text}</strong>
              <span>{alternative.confidence}%</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
