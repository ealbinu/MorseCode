import { useState } from 'react'

type FileUploaderProps = {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

export function FileUploader({ onFileSelected, disabled }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <section
      className={`drop-zone ${isDragging ? 'is-dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer.files.item(0)
        if (file) {
          onFileSelected(file)
        }
      }}
    >
      <div className="choice-card__icon drop-zone__rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div>
        <p className="eyebrow">Opción 1</p>
        <h2>Cargar archivo</h2>
        <p>WAV, MP3, M4A u OGG</p>
      </div>
      <div className="drop-zone__actions">
        <label className="machine-button">
          <input
            type="file"
            accept="audio/wav,audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/x-m4a"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.item(0)
              if (file) {
                onFileSelected(file)
              }
              event.currentTarget.value = ''
            }}
          />
          Cargar archivo
        </label>
      </div>
    </section>
  )
}
