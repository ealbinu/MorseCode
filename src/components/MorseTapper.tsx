import { useMemo, useRef, useState } from 'react'
import { decodeMorse } from '../lib/morse/decodeMorse'

type MorseTapperProps = {
  unitMs?: number
}

export function MorseTapper({ unitMs = 120 }: MorseTapperProps) {
  const [committedMorse, setCommittedMorse] = useState('')
  const [currentLetter, setCurrentLetter] = useState('')
  const [isPressing, setIsPressing] = useState(false)
  const pressStartRef = useRef(0)
  const lastReleaseRef = useRef(0)
  const currentLetterRef = useRef('')
  const finalizeTimerRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  const displayMorse = useMemo(() => joinMorse(committedMorse, currentLetter), [committedMorse, currentLetter])
  const decoded = useMemo(() => decodeMorse(displayMorse), [displayMorse])

  function beginTap() {
    if (isPressing) {
      return
    }

    clearFinalizeTimer()
    const now = performance.now()
    const gapMs = lastReleaseRef.current ? now - lastReleaseRef.current : 0

    if (gapMs >= unitMs * 5.5) {
      commitCurrentLetter()
      insertWordGap()
    } else if (gapMs >= unitMs * 2.2) {
      commitCurrentLetter()
    }

    pressStartRef.current = now
    setIsPressing(true)
    startTone()
  }

  function endTap() {
    if (!isPressing) {
      return
    }

    const durationMs = performance.now() - pressStartRef.current
    const mark = durationMs >= unitMs * 2.2 ? '-' : '.'
    const nextLetter = `${currentLetterRef.current}${mark}`

    currentLetterRef.current = nextLetter
    setCurrentLetter(nextLetter)
    lastReleaseRef.current = performance.now()
    setIsPressing(false)
    stopTone()
    scheduleLetterCommit()
  }

  function commitCurrentLetter() {
    const letter = currentLetterRef.current
    if (!letter) {
      return
    }

    setCommittedMorse((current) => joinMorse(current, letter))
    currentLetterRef.current = ''
    setCurrentLetter('')
  }

  function insertWordGap() {
    setCommittedMorse((current) => {
      const clean = current.trim()
      if (!clean || clean.endsWith('/')) {
        return clean
      }
      return `${clean} /`
    })
  }

  function scheduleLetterCommit() {
    clearFinalizeTimer()
    finalizeTimerRef.current = window.setTimeout(() => {
      commitCurrentLetter()
      finalizeTimerRef.current = null
    }, unitMs * 3.2)
  }

  function clearFinalizeTimer() {
    if (finalizeTimerRef.current) {
      window.clearTimeout(finalizeTimerRef.current)
      finalizeTimerRef.current = null
    }
  }

  function reset() {
    clearFinalizeTimer()
    stopTone()
    setCommittedMorse('')
    setCurrentLetter('')
    setIsPressing(false)
    currentLetterRef.current = ''
    pressStartRef.current = 0
    lastReleaseRef.current = 0
  }

  function startTone() {
    const context = getAudioContext()
    if (!context) {
      return
    }

    void context.resume()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(650, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillatorRef.current = oscillator
    gainRef.current = gain
  }

  function stopTone() {
    if (!oscillatorRef.current || !gainRef.current || !audioContextRef.current) {
      return
    }

    const now = audioContextRef.current.currentTime
    gainRef.current.gain.cancelScheduledValues(now)
    gainRef.current.gain.setValueAtTime(Math.max(gainRef.current.gain.value, 0.0001), now)
    gainRef.current.gain.exponentialRampToValueAtTime(0.0001, now + 0.02)
    oscillatorRef.current.stop(now + 0.03)
    oscillatorRef.current = null
    gainRef.current = null
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

  return (
    <section className="morse-tapper">
      <div className="morse-tapper__head">
        <div>
          <p className="eyebrow">Práctica de llave</p>
          <h3>Morse code tapper</h3>
        </div>
        <button className="machine-button secondary compact" type="button" onClick={reset}>
          Limpiar
        </button>
      </div>
      <button
        className={`telegraph-key ${isPressing ? 'is-down' : ''}`}
        type="button"
        onPointerDown={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.setPointerCapture(event.pointerId)
          }
          beginTap()
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
          endTap()
        }}
        onPointerCancel={endTap}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault()
            beginTap()
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault()
            endTap()
          }
        }}
      >
        <span />
      </button>
      <div className="tapper-readouts">
        <div>
          <span>Código Morse</span>
          <strong>{displayMorse || '...'}</strong>
        </div>
        <div>
          <span>Mensaje</span>
          <strong>{decoded.text || '—'}</strong>
        </div>
      </div>
      <p>Mantén presionado para raya, toca corto para punto. Pausa para separar letras; pausa larga para palabras.</p>
    </section>
  )
}

function joinMorse(left: string, right: string): string {
  const cleanLeft = left.trim()
  const cleanRight = right.trim()

  if (!cleanLeft) {
    return cleanRight
  }
  if (!cleanRight) {
    return cleanLeft
  }
  return `${cleanLeft} ${cleanRight}`
}
