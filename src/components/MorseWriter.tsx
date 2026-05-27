import { useEffect, useMemo, useRef, useState } from 'react'
import { generateMorseAudio } from '../lib/audio/generateMorseAudio'
import type { MorseWaveType } from '../lib/audio/generateMorseAudio'
import { encodeTextToMorse } from '../lib/morse/encodeTextToMorse'
import { MorseLightOutput } from './MorseLightOutput'
import { MorseVibrationOutput } from './MorseVibrationOutput'
import { VintageAudioPlayer } from './VintageAudioPlayer'

export function MorseWriter() {
  const [text, setText] = useState('SOS')
  const [frequencyHz, setFrequencyHz] = useState(750)
  const [unitMs, setUnitMs] = useState(90)
  const [waveType, setWaveType] = useState<MorseWaveType>('sine')
  const [audioUrl, setAudioUrl] = useState('')
  const [downloadName, setDownloadName] = useState('')
  const [status, setStatus] = useState('Escribe un mensaje para codificarlo como tono Morse.')
  const audioUrlRef = useRef('')
  const debounceRef = useRef<number | null>(null)

  const preview = useMemo(() => encodeTextToMorse(text), [text])

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    if (!text.trim()) {
      setStatus('No hay texto para transmitir.')
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
        audioUrlRef.current = ''
        setAudioUrl('')
      }
      return
    }

    setStatus('Preparando transmisión...')
    debounceRef.current = window.setTimeout(() => {
      try {
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current)
        }
        const generated = generateMorseAudio(text, {
          frequencyHz,
          unitMs,
          volume: 0.72,
          waveType,
        })
        const nextUrl = URL.createObjectURL(generated.mp3Blob)

        audioUrlRef.current = nextUrl
        setAudioUrl(nextUrl)
        setDownloadName(`morse-${Date.now()}.mp3`)
        setStatus(`Audio generado: ${generated.duration.toFixed(1)} segundos.`)
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'No se pudo generar el audio.')
      }
    }, 450)
  }, [text, frequencyHz, unitMs, waveType])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
    }
  }, [])

  return (
    <section className="writer-console">
      <div className="writer-panel">
        <p className="eyebrow">Zona derecha · Codificador</p>
        <h2>Codificar mensaje</h2>
        <textarea value={text} onChange={(event) => setText(event.currentTarget.value)} />
        <div className="writer-controls">
          <label>
            Tono
            <input
              type="range"
              min={400}
              max={1200}
              step={10}
              value={frequencyHz}
              onChange={(event) => setFrequencyHz(Number(event.currentTarget.value))}
            />
            <span>{frequencyHz}Hz</span>
          </label>
          <label>
            Velocidad
            <input
              type="range"
              min={45}
              max={180}
              step={5}
              value={unitMs}
              onChange={(event) => setUnitMs(Number(event.currentTarget.value))}
            />
            <span>{unitMs}ms</span>
          </label>
          <label className="wave-selector">
            Onda
            <select value={waveType} onChange={(event) => setWaveType(event.currentTarget.value as MorseWaveType)}>
              <option value="sine">Senoidal</option>
              <option value="square">Cuadrada</option>
              <option value="triangle">Triangular</option>
              <option value="sawtooth">Sierra</option>
            </select>
            <span>{waveLabel(waveType)}</span>
          </label>
        </div>
      </div>

      <div className="writer-side">
        <div className="paper-tape">
          <p className="eyebrow">Cinta Morse</p>
          <strong>{preview.morse || '—'}</strong>
          {preview.unsupported.length ? <span>Caracteres omitidos: {preview.unsupported.join(', ')}</span> : null}
        </div>
        <div className="writer-player">
          <VintageAudioPlayer src={audioUrl} title="Transmisión generada" emptyText="El audio generado aparecerá aquí" />
          <p>{status}</p>
          {audioUrl ? (
            <a className="machine-button secondary writer-download" href={audioUrl} download={downloadName}>
              Descargar MP3
            </a>
          ) : null}
        </div>
        <MorseLightOutput morse={preview.morse} unitMs={unitMs} />
        <MorseVibrationOutput morse={preview.morse} unitMs={unitMs} />
      </div>
    </section>
  )
}

function waveLabel(type: MorseWaveType): string {
  const labels: Record<MorseWaveType, string> = {
    sine: 'suave',
    square: 'radio áspera',
    triangle: 'limpia',
    sawtooth: 'brillante',
  }
  return labels[type]
}
