import { useEffect, useRef, useState } from 'react'

type MicrophoneRecorderProps = {
  onRecordingReady: (blob: Blob) => void
  onStatusChange?: (status: string) => void
  disabled?: boolean
}

export function MicrophoneRecorder({ onRecordingReady, onStatusChange, disabled }: MicrophoneRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const animationRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<number | null>(null)
  const shouldAnalyzeRef = useRef(false)

  useEffect(() => {
    return () => {
      stopMeter()
      stopStream()
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [])

  function stopMeter() {
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close()
      audioContextRef.current = null
    }
    setLevel(0)
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  async function startRecording() {
    setError('')

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('este navegador no permite grabar micrófono')
      onStatusChange?.('Este navegador no permite grabar micrófono.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      const mimeType = preferredMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      chunksRef.current = []
      shouldAnalyzeRef.current = true
      streamRef.current = stream
      recorderRef.current = recorder
      setElapsedSeconds(0)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const shouldAnalyze = shouldAnalyzeRef.current && blob.size > 0
        chunksRef.current = []
        recorderRef.current = null
        stopMeter()
        stopStream()
        setIsRecording(false)
        if (timerRef.current) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }
        if (!shouldAnalyze) {
          setElapsedSeconds(0)
        }
        if (shouldAnalyze) {
          onRecordingReady(blob)
        }
      }

      recorder.start(250)
      setIsRecording(true)
      onStatusChange?.('Grabando desde el micrófono local...')
      startMeter(stream)
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((seconds) => seconds + 1)
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'no se pudo acceder al micrófono')
      onStatusChange?.('No se pudo acceder al micrófono.')
      stopMeter()
      stopStream()
      setIsRecording(false)
      setElapsedSeconds(0)
    }
  }

  function stopRecording() {
    shouldAnalyzeRef.current = true
    onStatusChange?.('Grabación detenida, preparando análisis...')
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }

  function cancelRecording() {
    shouldAnalyzeRef.current = false
    onStatusChange?.('Grabación cancelada.')
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    } else {
      stopMeter()
      stopStream()
      setIsRecording(false)
    }
  }

  function startMeter(stream: MediaStream) {
    const context = new AudioContext()
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()

    analyser.fftSize = 1024
    const data = new Uint8Array(analyser.fftSize)
    source.connect(analyser)
    audioContextRef.current = context

    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i += 1) {
        const centered = (data[i] - 128) / 128
        sum += centered * centered
      }
      setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4.5))
      animationRef.current = window.requestAnimationFrame(tick)
    }
    tick()
  }

  return (
    <section className={`mic-panel ${isRecording ? 'is-recording' : ''}`}>
      <div className="choice-card__icon mic-panel__horn" aria-hidden="true">
        <span />
      </div>
      <div className="mic-panel__body">
        <p className="eyebrow">Opción 2</p>
        <h2>Capturar micrófono</h2>
        <p>{isRecording ? 'Escuchando señal Morse...' : 'Captura el tono en vivo'}</p>
        <div className="mic-meter" aria-label="Nivel de entrada">
          <span style={{ width: `${Math.max(4, level * 100)}%` }} />
        </div>
        <div className="mic-panel__actions">
          {isRecording ? (
            <>
              <button className="machine-button danger" type="button" onClick={stopRecording}>
                Detener y analizar
              </button>
              <button className="machine-button secondary" type="button" onClick={cancelRecording}>
                Cancelar
              </button>
            </>
          ) : (
            <button className="machine-button" type="button" disabled={disabled} onClick={startRecording}>
              Capturar micrófono
            </button>
          )}
          <span className="recording-time">{formatTime(elapsedSeconds)}</span>
        </div>
        {error ? <p className="mic-error">{error}</p> : null}
      </div>
    </section>
  )
}

function preferredMimeType(): string {
  const options = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4']
  return options.find((option) => MediaRecorder.isTypeSupported(option)) ?? ''
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
