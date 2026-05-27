import { VintageAudioPlayer } from './VintageAudioPlayer'

type AudioPlayerProps = {
  audioUrl: string | null
  fileName: string
}

export function AudioPlayer({ audioUrl, fileName }: AudioPlayerProps) {
  return (
    <section className="panel audio-panel">
      <div>
        <p className="eyebrow">Plato de reproducción</p>
        <h3>{fileName || 'Sin archivo cargado'}</h3>
      </div>
      <VintageAudioPlayer src={audioUrl} title={fileName || 'Señal recibida'} emptyText="Esperando señal" />
    </section>
  )
}
