import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { AnalysisSummary } from './components/AnalysisSummary'
import { AudioPlayer } from './components/AudioPlayer'
import { DebugPanel } from './components/DebugPanel'
import { FileUploader } from './components/FileUploader'
import { MicrophoneRecorder } from './components/MicrophoneRecorder'
import { MorseCheatsheet } from './components/MorseCheatsheet'
import { MorseTextDecoder } from './components/MorseTextDecoder'
import { MorseWriter } from './components/MorseWriter'
import { MorseTimeline } from './components/MorseTimeline'
import { ResultPanel } from './components/ResultPanel'
import { SpectrogramView } from './components/SpectrogramView'
import { analyzeMorseAudio } from './lib/audio/analyzeMorseAudio'
import { decodeAudioFile } from './lib/audio/decodeAudioFile'
import type { AnalysisSettings, DecodeResult } from './lib/types'
import { DEFAULT_SETTINGS } from './lib/types'

type LoadedAudio = {
  channels: Float32Array[]
  sampleRate: number
  fileName: string
  audioUrl: string | null
}

type AppMode = 'learn' | 'reader' | 'writer'

export default function App() {
  const [settings, setSettings] = useState<AnalysisSettings>(DEFAULT_SETTINGS)
  const [loadedAudio, setLoadedAudio] = useState<LoadedAudio | null>(null)
  const [result, setResult] = useState<DecodeResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [mode, setMode] = useState<AppMode>('reader')
  const [status, setStatus] = useState('Carga, graba o pega una transmisión Morse para activar el receptor.')

  const canAnalyze = Boolean(loadedAudio) && !isAnalyzing

  async function analyze(audio: LoadedAudio, nextSettings = settings) {
    setIsAnalyzing(true)
    setStatus('Calibrando válvulas, FFT y umbrales...')

    await new Promise((resolve) => window.setTimeout(resolve, 30))

    try {
      const nextResult = await analyzeMorseAudio(audio.channels, audio.sampleRate, nextSettings)
      setResult(nextResult)
      setStatus(
        nextResult.text
          ? `Mensaje detectado con ${nextResult.confidence}% de confianza.`
          : 'Análisis completo, pero no apareció texto confiable.',
      )
    } catch (error) {
      setResult(null)
      setStatus(error instanceof Error ? error.message : 'No se pudo analizar el audio.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handleFileSelected(file: File) {
    setStatus('Decodificando archivo con Web Audio API...')
    setResult(null)

    try {
      const decoded = await decodeAudioFile(file)
      const audioUrl = URL.createObjectURL(file)
      const audio = {
        channels: decoded.channels,
        sampleRate: decoded.sampleRate,
        fileName: `${file.name} · ${decoded.duration.toFixed(1)} s`,
        audioUrl,
      }

      setLoadedAudio((previous) => {
        if (previous?.audioUrl) {
          URL.revokeObjectURL(previous.audioUrl)
        }
        return audio
      })
      await analyze(audio)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Formato de audio no reconocido.')
    }
  }

  async function handleRecordingReady(blob: Blob) {
    const extension = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm'
    const recording = new File([blob], `grabacion-microfono.${extension}`, {
      type: blob.type || 'audio/webm',
    })

    setStatus('Decodificando grabación del micrófono...')
    setResult(null)

    try {
      const decoded = await decodeAudioFile(recording)
      const audioUrl = URL.createObjectURL(blob)
      const audio = {
        channels: decoded.channels,
        sampleRate: decoded.sampleRate,
        fileName: `Micrófono · ${decoded.duration.toFixed(1)} s`,
        audioUrl,
      }

      setLoadedAudio((previous) => {
        if (previous?.audioUrl) {
          URL.revokeObjectURL(previous.audioUrl)
        }
        return audio
      })
      await analyze(audio)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo decodificar la grabación.')
    }
  }

  async function handleLoadExample() {
    const example = createExampleAudio()
    setLoadedAudio((previous) => {
      if (previous?.audioUrl) {
        URL.revokeObjectURL(previous.audioUrl)
      }
      return example
    })
    setResult(null)
    await analyze(example)
  }

  function updateSetting<K extends keyof AnalysisSettings>(key: K, value: AnalysisSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const needleStyle = useMemo(
    () => ({ transform: `rotate(${((result?.confidence ?? 0) / 100) * 106 - 53}deg)` }),
    [result?.confidence],
  )

  return (
    <main
      className={`app-shell mode-${mode}`}
      style={{ '--mode-index': modeIndex(mode) } as CSSProperties & Record<'--mode-index', number>}
    >
      <nav className="mode-switch" aria-label="Mesa de operación">
        <button
          className={mode === 'learn' ? 'is-active' : ''}
          type="button"
          onClick={() => setMode('learn')}
        >
          Guía
        </button>
        <button
          className={mode === 'reader' ? 'is-active' : ''}
          type="button"
          onClick={() => setMode('reader')}
        >
          Decodificar
        </button>
        <button
          className={mode === 'writer' ? 'is-active' : ''}
          type="button"
          onClick={() => setMode('writer')}
        >
          Codificar
        </button>
      </nav>
      <header className="hero-console">
        <div className="brand-plate">
          <span className="rivet" />
          <div>
            <p>{modeTitle(mode)}</p>
            <h1>codigomorse.link</h1>
          </div>
          <span className="rivet" />
        </div>
        {mode === 'reader' ? (
          <div className="hero-console__body">
            <div className="input-rack">
              <FileUploader onFileSelected={handleFileSelected} disabled={isAnalyzing} />
              <MicrophoneRecorder
                onRecordingReady={handleRecordingReady}
                onStatusChange={setStatus}
                disabled={isAnalyzing}
              />
              <MorseTextDecoder />
            </div>
            <div className="analog-gauge">
              <div className="analog-gauge__face">
                <span>0</span>
                <span>50</span>
                <span>100</span>
                <div className="analog-gauge__needle" style={needleStyle} />
              </div>
              <p>Confianza de lectura</p>
            </div>
          </div>
        ) : null}
      </header>

      <section className="machine-stage" aria-live="polite">
        <div className="machine-track">
          <div className="machine-face face-learn" aria-hidden={mode !== 'learn'}>
            <MorseCheatsheet />
          </div>
          <div className="machine-face face-reader" aria-hidden={mode !== 'reader'}>
            <section className="control-bench">
              <div className="status-lamp">
                <span className={isAnalyzing ? 'is-hot' : result ? 'is-ready' : ''} />
                <p>{status}</p>
              </div>
              <div className="auto-panel">
                <div>
                  <p className="eyebrow">Modo automático</p>
                  <strong>Sube, graba o pega una transmisión; la máquina ajusta el resto</strong>
                </div>
                <button
                  className="machine-button secondary compact"
                  type="button"
                  onClick={() => setShowAdvanced((visible) => !visible)}
                >
                  {showAdvanced ? 'Ocultar ajuste' : 'Ajuste fino'}
                </button>
              </div>
              <button
                className="machine-button reanalyze"
                type="button"
                disabled={!canAnalyze}
                onClick={() => loadedAudio && analyze(loadedAudio)}
              >
                Reanalyze
              </button>
            </section>

            {showAdvanced ? (
              <section className="advanced-bench">
                <div className="advanced-bench__intro">
                  <p className="eyebrow">Ajuste fino</p>
                  <span>Úsalo solo si el automático confunde ruido, tonos débiles o espaciado Morse irregular.</span>
                </div>
                <div className="knob-row">
                  <Knob
                    label="Frecuencia mínima"
                    value={settings.minFrequency}
                    min={120}
                    max={1200}
                    step={10}
                    suffix="Hz"
                    onChange={(value) => updateSetting('minFrequency', value)}
                  />
                  <Knob
                    label="Frecuencia máxima"
                    value={settings.maxFrequency}
                    min={600}
                    max={3200}
                    step={10}
                    suffix="Hz"
                    onChange={(value) => updateSetting('maxFrequency', value)}
                  />
                  <Knob
                    label="Sensibilidad"
                    value={settings.sensitivity}
                    min={0.05}
                    max={1}
                    step={0.01}
                    suffix=""
                    onChange={(value) => updateSetting('sensitivity', value)}
                  />
                  <Knob
                    label="Raya desde"
                    value={settings.dashRatio}
                    min={1.7}
                    max={3.2}
                    step={0.05}
                    suffix="x"
                    onChange={(value) => updateSetting('dashRatio', value)}
                  />
                  <Knob
                    label="Pausa palabra"
                    value={settings.wordGapRatio}
                    min={4.2}
                    max={8.5}
                    step={0.1}
                    suffix="x"
                    onChange={(value) => updateSetting('wordGapRatio', value)}
                  />
                </div>
              </section>
            ) : null}

            <section className={`instrument-deck ${!result && !isAnalyzing ? 'is-off' : ''}`}>
              <AnalysisSummary result={result} isAnalyzing={isAnalyzing} />

              <div className="dashboard">
                <ResultPanel result={result} />
                <AudioPlayer audioUrl={loadedAudio?.audioUrl ?? null} fileName={loadedAudio?.fileName ?? ''} />
                <div className="mini-widgets">
                  <MorseTimeline result={result} />
                  <SpectrogramView result={result} />
                </div>
                <section className="panel debug-toggle-panel">
                  <button
                    className="machine-button secondary compact"
                    type="button"
                    onClick={() => setShowDebug((open) => !open)}
                  >
                    {showDebug ? 'Ocultar debug' : 'Mostrar debug'}
                  </button>
                  {showDebug ? <DebugPanel result={result} /> : null}
                </section>
              </div>
            </section>
          </div>
          <div className="machine-face face-writer" aria-hidden={mode !== 'writer'}>
            <MorseWriter />
          </div>
        </div>
      </section>
    </main>
  )
}

function modeTitle(mode: AppMode): string {
  if (mode === 'learn') {
    return 'Guía de Código Morse'
  }
  if (mode === 'writer') {
    return 'Codificar código Morse'
  }
  return 'Decodificar código Morse'
}

function modeIndex(mode: AppMode): number {
  if (mode === 'learn') {
    return 0
  }
  if (mode === 'writer') {
    return 2
  }
  return 1
}

function Knob({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix: string
  onChange: (value: number) => void
}) {
  const rotation = ((value - min) / (max - min)) * 270 - 135

  return (
    <label className="knob">
      <span>{label}</span>
      <div className="knob__dial" style={{ transform: `rotate(${rotation}deg)` }} />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <strong>
        {Number.isInteger(value) ? value : value.toFixed(2)}
        {suffix}
      </strong>
    </label>
  )
}

function createExampleAudio(): LoadedAudio {
  const sampleRate = 44100
  const unitMs = 85
  const frequency = 705
  const textMorse = '... --- ... / - . ... -'
  const samples: number[] = []

  const appendTone = (durationMs: number) => {
    const count = Math.round((sampleRate * durationMs) / 1000)
    for (let i = 0; i < count; i += 1) {
      const fade = Math.min(1, i / 120, (count - i) / 120)
      const noise = (Math.random() * 2 - 1) * 0.035
      samples.push(Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.72 * fade + noise)
    }
  }

  const appendSilence = (durationMs: number) => {
    const count = Math.round((sampleRate * durationMs) / 1000)
    for (let i = 0; i < count; i += 1) {
      samples.push((Math.random() * 2 - 1) * 0.025)
    }
  }

  const words = textMorse.split(' / ')
  words.forEach((word, wordIndex) => {
    const letters = word.split(' ')
    letters.forEach((letter, letterIndex) => {
      ;[...letter].forEach((mark, markIndex) => {
        appendTone(mark === '.' ? unitMs : unitMs * 3)
        if (markIndex < letter.length - 1) {
          appendSilence(unitMs)
        }
      })
      if (letterIndex < letters.length - 1) {
        appendSilence(unitMs * 3)
      }
    })
    if (wordIndex < words.length - 1) {
      appendSilence(unitMs * 7)
    }
  })

  const channel = Float32Array.from(samples)
  const wavBlob = new Blob([encodeWav(channel, sampleRate)], { type: 'audio/wav' })

  return {
    channels: [channel],
    sampleRate,
    fileName: 'Prueba interna · SOS TEST',
    audioUrl: URL.createObjectURL(wavBlob),
  }
}

function encodeWav(signal: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + signal.length * 2)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + signal.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, signal.length * 2, true)

  let offset = 44
  for (let i = 0; i < signal.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, signal[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  return buffer
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i))
  }
}
