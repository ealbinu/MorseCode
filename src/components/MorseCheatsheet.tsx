import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { encodeTextToMorse } from '../lib/morse/encodeTextToMorse'
import { MorseTextDecoder } from './MorseTextDecoder'
import { MorseTapper } from './MorseTapper'
import { OperatorMetronome } from './OperatorMetronome'

type GuideWidgetId = (typeof GUIDE_WIDGETS)[number]['id']

const GUIDE_WIDGETS = [
  { id: 'basics', label: 'Base' },
  { id: 'rhythm', label: 'Ritmo' },
  { id: 'tapper', label: 'Tapper' },
  { id: 'metronome', label: 'Metrónomo' },
  { id: 'letters', label: 'Letras' },
  { id: 'numbers', label: 'Números' },
  { id: 'decoder', label: 'Decodificador' },
  { id: 'qcodes', label: 'Q-code' },
] as const

const LETTERS = [
  ['A', '.-'],
  ['B', '-...'],
  ['C', '-.-.'],
  ['D', '-..'],
  ['E', '.'],
  ['F', '..-.'],
  ['G', '--.'],
  ['H', '....'],
  ['I', '..'],
  ['J', '.---'],
  ['K', '-.-'],
  ['L', '.-..'],
  ['M', '--'],
  ['N', '-.'],
  ['O', '---'],
  ['P', '.--.'],
  ['Q', '--.-'],
  ['R', '.-.'],
  ['S', '...'],
  ['T', '-'],
  ['U', '..-'],
  ['V', '...-'],
  ['W', '.--'],
  ['X', '-..-'],
  ['Y', '-.--'],
  ['Z', '--..'],
]

const NUMBERS = [
  ['1', '.----'],
  ['2', '..---'],
  ['3', '...--'],
  ['4', '....-'],
  ['5', '.....'],
  ['6', '-....'],
  ['7', '--...'],
  ['8', '---..'],
  ['9', '----.'],
  ['0', '-----'],
]

const Q_CODES = [
  ['QRA', 'Nombre o distintivo de estación'],
  ['QRB', 'Distancia entre estaciones'],
  ['QRD', 'Destino o procedencia'],
  ['QRG', 'Frecuencia exacta'],
  ['QRH', 'Frecuencia variable'],
  ['QRI', 'Tono de transmisión'],
  ['QRK', 'Inteligibilidad de señal'],
  ['QRL', 'Frecuencia ocupada'],
  ['QRM', 'Interferencia de otra estación'],
  ['QRN', 'Ruido atmosférico'],
  ['QRO', 'Aumenta potencia'],
  ['QRP', 'Reduce potencia'],
  ['QRQ', 'Transmite más rápido'],
  ['QRS', 'Transmite más lento'],
  ['QRT', 'Cesa transmisión'],
  ['QRU', 'Sin mensajes pendientes'],
  ['QRV', 'Listo para recibir'],
  ['QRW', 'Avise a otra estación'],
  ['QRX', 'Espera / vuelvo luego'],
  ['QRY', 'Turno de comunicación'],
  ['QRZ', '¿Quién llama?'],
  ['QSA', 'Intensidad de señal'],
  ['QSB', 'Señal variable'],
  ['QSD', 'Manipulación defectuosa'],
  ['QSG', 'Enviar varios mensajes'],
  ['QSK', 'Interrupción entre señales'],
  ['QSL', 'Recibido / confirmado'],
  ['QSM', 'Repita último mensaje'],
  ['QSN', 'Escuchado en frecuencia'],
  ['QSO', 'Comunicado'],
  ['QSP', 'Retransmitir mensaje'],
  ['QSQ', 'Médico disponible / a bordo'],
  ['QSU', 'Transmita o responda aquí'],
  ['QSV', 'Serie de V para prueba'],
  ['QSW', 'Enviar en esta frecuencia'],
  ['QSX', 'Escuchar en otra frecuencia'],
  ['QSY', 'Cambia de frecuencia'],
  ['QSZ', 'Repetir palabras o grupos'],
  ['QTA', 'Cancelar mensaje'],
  ['QTB', 'Conteo de palabras'],
  ['QTC', 'Mensajes por transmitir'],
  ['QTH', 'Ubicación'],
  ['QTR', 'Hora exacta'],
  ['QTX', 'Mantener estación abierta'],
  ['QUA', 'Noticias de una estación'],
] as const

export function MorseCheatsheet() {
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef<number | null>(null)
  const [visibleWidgets, setVisibleWidgets] = useState<Record<GuideWidgetId, boolean>>(() =>
    GUIDE_WIDGETS.reduce(
      (widgets, widget) => ({
        ...widgets,
        [widget.id]: true,
      }),
      {} as Record<GuideWidgetId, boolean>,
    ),
  )

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  function toggleWidget(id: GuideWidgetId) {
    setVisibleWidgets((current) => ({ ...current, [id]: !current[id] }))
  }

  async function copyQCode(code: string) {
    const { morse } = encodeTextToMorse(code)

    try {
      await copyToClipboard(morse)
      showToast(`${code} copiado: ${morse}`)
    } catch {
      showToast('No se pudo copiar al portapapeles')
    }
  }

  function showToast(message: string) {
    setToast(message)
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast('')
      toastTimerRef.current = null
    }, 2200)
  }

  const showPracticeColumn = visibleWidgets.rhythm || visibleWidgets.tapper || visibleWidgets.metronome

  return (
    <section className="learn-console">
      <div className="guide-view-menu">
        <div>
          <p className="eyebrow">Menú de vistas</p>
          <h3>Widgets de guía</h3>
        </div>
        <div className="guide-view-menu__switches">
          {GUIDE_WIDGETS.map((widget) => (
            <label key={widget.id}>
              <input
                type="checkbox"
                checked={visibleWidgets[widget.id]}
                onChange={() => toggleWidget(widget.id)}
              />
              <span>{widget.label}</span>
            </label>
          ))}
        </div>
      </div>

      {visibleWidgets.basics ? (
        <div className="learn-guide">
        <p className="eyebrow">Zona izquierda · Guía de código Morse</p>
        <h2>Guía Morse</h2>
        <div className="lesson-strip">
          <article>
            <strong>Punto</strong>
            <span>1 unidad de tono</span>
          </article>
          <article>
            <strong>Raya</strong>
            <span>3 unidades de tono</span>
          </article>
          <article>
            <strong>Entre letras</strong>
            <span>3 unidades de silencio</span>
          </article>
          <article>
            <strong>Entre palabras</strong>
            <span>7 unidades de silencio</span>
          </article>
          <article>
            <strong>/</strong>
            <span>separador de palabras en texto</span>
          </article>
        </div>
        <ol className="mini-lesson">
          <li>Reconoce señales base: E es punto, T es raya.</li>
          <li>Memoriza pares de transmisión: A es punto-raya, N es raya-punto.</li>
          <li>Escucha ritmo, no cuentes milisegundos.</li>
          <li>Practica primero con SOS: tres puntos, tres rayas, tres puntos.</li>
        </ol>
      </div>
      ) : null}

      {showPracticeColumn ? (
        <div className="learn-practice-column">
          {visibleWidgets.rhythm ? (
            <article className="operator-brief">
              <p className="eyebrow">Cómo funciona</p>
              <h3>Ritmo de transmisión</h3>
              <p>
                El código Morse no depende de una velocidad fija: todo se mide contra una unidad base. Un punto dura 1
                unidad, una raya dura 3, la pausa entre letras dura 3 y la pausa entre palabras dura 7.
              </p>
              <p>
                Usa el metrónomo para sentir esa unidad. Luego practica con la llave: pulsación corta para punto,
                pulsación larga para raya.
              </p>
            </article>
          ) : null}
          {visibleWidgets.tapper ? <MorseTapper /> : null}
          {visibleWidgets.metronome ? <OperatorMetronome adjustable title="Metrónomo de operador" /> : null}
        </div>
      ) : null}

      {visibleWidgets.letters ? (
        <div className="cheat-table compact-table">
        <p className="eyebrow">Letras</p>
        <div className="morse-grid">
          {LETTERS.map(([letter, morse]) => (
            <span key={letter}>
              <strong>{letter}</strong>
              <code>{morse}</code>
            </span>
          ))}
        </div>
      </div>
      ) : null}

      {visibleWidgets.numbers ? (
        <div className="cheat-table compact-table">
        <p className="eyebrow">Números</p>
        <div className="morse-grid numbers">
          {NUMBERS.map(([letter, morse]) => (
            <span key={letter}>
              <strong>{letter}</strong>
              <code>{morse}</code>
            </span>
          ))}
        </div>
      </div>
      ) : null}

      {visibleWidgets.decoder ? (
        <MorseTextDecoder
          className="practice-decoder"
          eyebrow="Práctica de recepción"
          title="Decodificar texto"
          description="Pega o escribe una transmisión y comprueba tu lectura."
          initialValue="... --- ..."
        />
      ) : null}

      {visibleWidgets.qcodes ? (
        <div className="q-code-panel">
        <div>
          <p className="eyebrow">Código operativo</p>
          <h3>Q-code estándar</h3>
        </div>
        <p>
          45 abreviaturas de tres letras usadas para acelerar transmisiones. Como pregunta o respuesta, cambian según
          el contexto de operación.
        </p>
        <div className="q-code-grid">
          {Q_CODES.map(([code, meaning]) => (
            <button
              key={code}
              type="button"
              onPointerDown={() => void copyQCode(code)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  void copyQCode(code)
                }
              }}
            >
              <strong>{code}</strong>
              <em>{meaning}</em>
            </button>
          ))}
        </div>
      </div>
      ) : null}
      {toast ? createPortal(<div className="guide-toast" role="status">{toast}</div>, document.body) : null}
    </section>
  )
}

async function copyToClipboard(text: string): Promise<void> {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', 'true')
  textArea.style.position = 'fixed'
  textArea.style.left = '-9999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textArea)

  if (copied) {
    return
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  throw new Error('Clipboard unavailable')
}
