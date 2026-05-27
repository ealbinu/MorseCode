import type { DecodeResult } from '../lib/types'

type AnalysisSummaryProps = {
  result: DecodeResult | null
  isAnalyzing: boolean
}

export function AnalysisSummary({ result, isAnalyzing }: AnalysisSummaryProps) {
  const confidence = result?.confidence ?? 0

  return (
    <section className="summary-grid">
      <Meter label="Tono" value={result?.toneHz ? `${result.toneHz.toFixed(1)} Hz` : '--'} />
      <Meter label="Confianza" value={isAnalyzing ? '...' : `${confidence}%`} />
      <Meter label="Unidad" value={result?.unitMs ? `${result.unitMs.toFixed(0)} ms` : '--'} />
      <Meter label="Segmentos" value={result ? String(result.segments.length) : '--'} />
    </section>
  )
}

function Meter({ label, value }: { label: string; value: string }) {
  return (
    <div className="meter">
      <div className="meter__glass">
        <span>{value}</span>
      </div>
      <p>{label}</p>
    </div>
  )
}
