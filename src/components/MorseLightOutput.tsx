import { useEffect, useMemo, useRef, useState } from 'react'

type MorseLightOutputProps = {
  morse: string
  unitMs: number
}

type LightStep = {
  on: boolean
  durationMs: number
}

type LightMode = 'lamp' | 'flood'

export function MorseLightOutput({ morse, unitMs }: MorseLightOutputProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isOn, setIsOn] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [lightMode, setLightMode] = useState<LightMode>('lamp')
  const panelRef = useRef<HTMLDivElement | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const steps = useMemo(() => morseToLightSteps(morse, unitMs), [morse, unitMs])

  useEffect(() => {
    stop()
  }, [morse, unitMs])

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsPlaying(false)
        setIsOn(false)
        setStepIndex(0)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (!isPlaying || steps.length === 0) {
      return
    }

    const step = steps[stepIndex]
    setIsOn(step.on)
    timeoutRef.current = window.setTimeout(() => {
      if (stepIndex >= steps.length - 1) {
        setIsPlaying(false)
        setIsOn(false)
        setStepIndex(0)
      } else {
        setStepIndex((current) => current + 1)
      }
    }, step.durationMs)

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [isPlaying, stepIndex, steps])

  function togglePlay() {
    if (!morse) {
      return
    }
    if (isPlaying) {
      setIsPlaying(false)
      setIsOn(false)
    } else {
      setStepIndex(0)
      setIsPlaying(true)
    }
  }

  async function openFullscreen() {
    if (panelRef.current && !document.fullscreenElement) {
      await panelRef.current.requestFullscreen()
    }
  }

  function stop() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsPlaying(false)
    setIsOn(false)
    setStepIndex(0)
  }

  return (
    <section className="light-output">
      <div className="light-output__head">
        <div>
          <p className="eyebrow">Salida visual</p>
          <h3>Lámpara de señal</h3>
        </div>
      </div>
      <div className="light-output__controls">
        <div className="light-mode-toggle" aria-label="Modo de salida visual">
          <button
            className={lightMode === 'lamp' ? 'is-active' : ''}
            type="button"
            onClick={() => setLightMode('lamp')}
          >
            Lámpara
          </button>
          <button
            className={lightMode === 'flood' ? 'is-active' : ''}
            type="button"
            onClick={() => setLightMode('flood')}
          >
            Luz total
          </button>
        </div>
        <div className="light-output__actions">
          <button
            className="transport-button"
            type="button"
            disabled={!morse}
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pausar lámpara' : 'Reproducir lámpara'}
          >
            {isPlaying ? 'II' : '▶'}
          </button>
          <button className="machine-button secondary compact" type="button" disabled={!morse} onClick={openFullscreen}>
            Pantalla completa
          </button>
        </div>
      </div>
      <div ref={panelRef} className={`signal-lamp-stage is-${lightMode} ${isOn ? 'is-on' : ''}`}>
        {lightMode === 'lamp' ? (
          <div className="signal-lamp">
            <span />
          </div>
        ) : (
          <div className="signal-flood-panel" aria-hidden="true" />
        )}
        <p>{isPlaying ? 'Transmitiendo luz' : 'Lista para transmitir'}</p>
        <div className="fullscreen-light-controls">
          <button
            className="transport-button"
            type="button"
            disabled={!morse}
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pausar lámpara' : 'Reproducir lámpara'}
          >
            {isPlaying ? 'II' : '▶'}
          </button>
          {isPlaying ? (
            <button className="machine-button danger compact" type="button" onClick={stop}>
              Detener
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function morseToLightSteps(morse: string, unitMs: number): LightStep[] {
  const steps: LightStep[] = []
  const words = morse.split(' / ').filter(Boolean)

  words.forEach((word, wordIndex) => {
    const letters = word.split(' ').filter(Boolean)
    letters.forEach((letter, letterIndex) => {
      Array.from(letter).forEach((mark, markIndex) => {
        steps.push({ on: true, durationMs: mark === '-' ? unitMs * 3 : unitMs })
        if (markIndex < letter.length - 1) {
          steps.push({ on: false, durationMs: unitMs })
        }
      })
      if (letterIndex < letters.length - 1) {
        steps.push({ on: false, durationMs: unitMs * 3 })
      }
    })
    if (wordIndex < words.length - 1) {
      steps.push({ on: false, durationMs: unitMs * 7 })
    }
  })

  return steps
}
