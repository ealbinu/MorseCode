import { useMemo, useState } from 'react'
import { decodeMorse } from '../lib/morse/decodeMorse'

type MorseTextDecoderProps = {
  title?: string
  eyebrow?: string
  description?: string
  initialValue?: string
  className?: string
}

export function MorseTextDecoder({
  title = 'Pegar transmisión',
  eyebrow = 'Opción 3',
  description = 'Usa puntos, rayas, espacios y / para separar palabras.',
  initialValue = '... --- ...',
  className = '',
}: MorseTextDecoderProps) {
  const [morse, setMorse] = useState(initialValue)
  const decoded = useMemo(() => decodeMorse(normalizeMorseInput(morse)), [morse])

  return (
    <section className={`text-decoder-panel ${className}`}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <textarea
        value={morse}
        spellCheck={false}
        onChange={(event) => setMorse(event.currentTarget.value)}
        aria-label="Código Morse en texto"
      />
      <div className="decoded-chip">
        <span>Mensaje</span>
        <strong>{decoded.text || '—'}</strong>
      </div>
      {decoded.invalidSymbols.length ? (
        <p className="text-decoder-warning">Símbolos no reconocidos: {decoded.invalidSymbols.join(', ')}</p>
      ) : null}
    </section>
  )
}

function normalizeMorseInput(value: string): string {
  return value
    .replace(/[–—−]/g, '-')
    .replace(/[·•]/g, '.')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
