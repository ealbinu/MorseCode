import { useEffect, useRef, useState } from 'react'

type OperatorMetronomeProps = {
  unitMs?: number
  adjustable?: boolean
  title?: string
  description?: string
}

export function OperatorMetronome({
  unitMs,
  adjustable = false,
  title = 'Metrónomo de operador',
  description = 'Marca la unidad base para entrenar el ritmo Morse.',
}: OperatorMetronomeProps) {
  const [localUnitMs, setLocalUnitMs] = useState(unitMs ?? 120)
  const [isPlaying, setIsPlaying] = useState(false)
  const [tickIndex, setTickIndex] = useState(0)
  const intervalRef = useRef<number | null>(null)
  const counterRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const activeUnitMs = unitMs ?? localUnitMs

  useEffect(() => {
    if (unitMs) {
      setLocalUnitMs(unitMs)
    }
  }, [unitMs])

  useEffect(() => {
    if (!isPlaying) {
      return
    }

    counterRef.current = 0
    playTick(true)
    setTickIndex(1)
    intervalRef.current = window.setInterval(() => {
      counterRef.current += 1
      const nextTick = counterRef.current + 1
      playTick(nextTick % 3 === 1)
      setTickIndex(nextTick)
    }, activeUnitMs)

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPlaying, activeUnitMs])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
      void audioContextRef.current?.close()
    }
  }, [])

  function togglePlay() {
    if (isPlaying) {
      setIsPlaying(false)
      setTickIndex(0)
      return
    }
    setIsPlaying(true)
  }

  function playTick(accent: boolean) {
    const context = getAudioContext()
    if (!context) {
      return
    }

    void context.resume()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime
    const duration = accent ? 0.045 : 0.03

    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(accent ? 980 : 680, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(accent ? 0.12 : 0.07, now + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.01)
  }

  function getAudioContext(): AudioContext | null {
    if (audioContextRef.current) {
      return audioContextRef.current
    }

    const AudioContextClass =
      window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) {
      return null
    }

    audioContextRef.current = new AudioContextClass()
    return audioContextRef.current
  }

  const activeBeat = tickIndex % 7

  return (
    <section className="operator-metronome">
      <div className="operator-metronome__head">
        <div>
          <p className="eyebrow">Entrenamiento de cadencia</p>
          <h3>{title}</h3>
        </div>
        <button
          className="transport-button"
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pausar metrónomo' : 'Reproducir metrónomo'}
        >
          {isPlaying ? 'II' : '▶'}
        </button>
      </div>
      <p>{description}</p>
      <div className={`metronome-scope ${isPlaying ? 'is-running' : ''}`}>
        <div className="metronome-needle" style={{ transform: `rotate(${isPlaying ? -24 + activeBeat * 8 : 0}deg)` }} />
        <div className="metronome-lamps">
          {Array.from({ length: 7 }, (_, index) => (
            <span key={index} className={isPlaying && index === activeBeat ? 'is-active' : ''} />
          ))}
        </div>
      </div>
      <div className="metronome-readout">
        <strong>{activeUnitMs}ms</strong>
        <span>unidad base</span>
      </div>
      {adjustable ? (
        <label className="metronome-control">
          Velocidad de práctica
          <input
            type="range"
            min={60}
            max={220}
            step={5}
            value={localUnitMs}
            onChange={(event) => setLocalUnitMs(Number(event.currentTarget.value))}
          />
        </label>
      ) : null}
    </section>
  )
}
