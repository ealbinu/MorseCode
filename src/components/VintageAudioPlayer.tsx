import { useEffect, useRef, useState } from 'react'

type VintageAudioPlayerProps = {
  src: string | null
  title: string
  emptyText: string
}

export function VintageAudioPlayer({ src, title, emptyText }: VintageAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const waveform = useMemoWaveform(src)

  useEffect(() => {
    setIsPlaying(false)
    setDuration(0)
    setCurrentTime(0)
  }, [src])

  async function togglePlayback() {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    if (audio.paused) {
      await audio.play()
    } else {
      audio.pause()
    }
  }

  function seek(value: number) {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) {
      return
    }
    audio.currentTime = value
    setCurrentTime(value)
  }

  if (!src) {
    return <div className="empty-slot">{emptyText}</div>
  }

  const progress = duration > 0 ? currentTime / duration : 0

  return (
    <div className="vintage-player">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="scope-screen">
        <svg viewBox="0 0 240 88" role="img" aria-label={`Onda de audio de ${title}`}>
          <rect width="240" height="88" rx="5" />
          <g className="scope-grid-lines">
            {Array.from({ length: 6 }).map((_, index) => (
              <line key={`h-${index}`} x1="0" x2="240" y1={14 + index * 12} y2={14 + index * 12} />
            ))}
            {Array.from({ length: 9 }).map((_, index) => (
              <line key={`v-${index}`} y1="0" y2="88" x1={index * 30} x2={index * 30} />
            ))}
          </g>
          <path className="scope-wave" d={waveformPath(waveform, progress)} />
          <line className="scope-playhead" x1={progress * 240} x2={progress * 240} y1="0" y2="88" />
        </svg>
      </div>
      <div className="player-controls">
        <button className="transport-button" type="button" onClick={togglePlayback} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
          {isPlaying ? 'II' : '▶'}
        </button>
        <div className="player-readout">
          <strong>{title}</strong>
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
      <input
        className="player-progress"
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={Math.min(currentTime, duration || 0)}
        onChange={(event) => seek(Number(event.currentTarget.value))}
        aria-label="Posición de reproducción"
      />
    </div>
  )
}

function useMemoWaveform(src: string | null): number[] {
  const [waveform, setWaveform] = useState<number[]>(defaultWaveform())

  useEffect(() => {
    let cancelled = false

    async function loadWaveform() {
      if (!src) {
        setWaveform(defaultWaveform())
        return
      }

      try {
        const response = await fetch(src)
        const buffer = await response.arrayBuffer()
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        const context = new AudioContextClass()
        const audioBuffer = await context.decodeAudioData(buffer.slice(0))
        const channel = audioBuffer.getChannelData(0)
        const points = 180
        const bucketSize = Math.max(1, Math.floor(channel.length / points))
        const nextWaveform: number[] = []

        for (let start = 0; start < channel.length; start += bucketSize) {
          let peak = 0
          for (let i = start; i < Math.min(channel.length, start + bucketSize); i += 1) {
            peak = Math.max(peak, Math.abs(channel[i]))
          }
          nextWaveform.push(peak)
        }

        await context.close()
        if (!cancelled) {
          setWaveform(nextWaveform.slice(0, points))
        }
      } catch {
        if (!cancelled) {
          setWaveform(defaultWaveform())
        }
      }
    }

    void loadWaveform()
    return () => {
      cancelled = true
    }
  }, [src])

  return waveform
}

function waveformPath(values: number[], progress: number): string {
  if (values.length === 0) {
    return ''
  }

  const boost = 0.78 + Math.sin(progress * Math.PI) * 0.18
  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 240
      const y = 44 - value * 35 * boost
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function defaultWaveform(): number[] {
  return Array.from({ length: 180 }, (_, index) => 0.08 + Math.sin(index * 0.18) * 0.018)
}

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '0:00'
  }
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
