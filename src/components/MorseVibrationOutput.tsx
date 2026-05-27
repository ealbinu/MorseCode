import { useEffect, useMemo, useRef, useState } from 'react'

type MorseVibrationOutputProps = {
  morse: string
  unitMs: number
}

export function MorseVibrationOutput({ morse, unitMs }: MorseVibrationOutputProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const pattern = useMemo(() => morseToVibrationPattern(morse, unitMs), [morse, unitMs])
  const durationMs = useMemo(() => pattern.reduce((total, duration) => total + duration, 0), [pattern])

  useEffect(() => {
    setIsSupported(hasVibrationSupport())
  }, [])

  useEffect(() => {
    stopVibration()
  }, [morse, unitMs])

  useEffect(() => {
    return () => stopVibration()
  }, [])

  function stopVibration() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (hasVibrationSupport()) {
      window.navigator.vibrate(0)
    }
    setIsPlaying(false)
  }

  function playVibration() {
    if (!morse || pattern.length === 0 || !hasVibrationSupport()) {
      return
    }
    stopVibration()
    window.navigator.vibrate(pattern)
    setIsPlaying(true)
    timeoutRef.current = window.setTimeout(() => {
      setIsPlaying(false)
      timeoutRef.current = null
    }, durationMs)
  }

  if (!isSupported) {
    return null
  }

  return (
    <section className="vibration-output">
      <div className="vibration-output__head">
        <div>
          <p className="eyebrow">Salida háptica</p>
          <h3>Vibración</h3>
        </div>
        <button
          className="transport-button"
          type="button"
          disabled={!morse || pattern.length === 0}
          onClick={isPlaying ? stopVibration : playVibration}
          aria-label={isPlaying ? 'Detener vibración' : 'Reproducir vibración'}
        >
          {isPlaying ? 'II' : '▶'}
        </button>
      </div>
      <div className={`vibration-meter ${isPlaying ? 'is-active' : ''}`}>
        <span />
        <span />
        <span />
      </div>
      <p>{isPlaying ? 'Transmitiendo vibración' : 'Lista en dispositivos compatibles'}</p>
    </section>
  )
}

function hasVibrationSupport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.navigator?.vibrate === 'function' &&
    window.navigator.maxTouchPoints > 0
  )
}

function morseToVibrationPattern(morse: string, unitMs: number): number[] {
  const pattern: number[] = []
  const words = morse.split(' / ').filter(Boolean)

  words.forEach((word, wordIndex) => {
    const letters = word.split(' ').filter(Boolean)
    letters.forEach((letter, letterIndex) => {
      Array.from(letter).forEach((mark, markIndex) => {
        pattern.push(mark === '-' ? unitMs * 3 : unitMs)
        if (markIndex < letter.length - 1) {
          pattern.push(unitMs)
        }
      })
      if (letterIndex < letters.length - 1) {
        pattern.push(unitMs * 3)
      }
    })
    if (wordIndex < words.length - 1) {
      pattern.push(unitMs * 7)
    }
  })

  return pattern
}
