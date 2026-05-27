# Decodificador Morse desde Audio

App web offline para analizar archivos WAV/MP3/M4A/OGG o grabaciones desde el micrófono en el navegador y decodificar código Morse sonoro sin backend ni IA. Incluye un modo de escritura para convertir texto a audio Morse y descargarlo como MP3.

## Instalación

```bash
npm install
npm run dev
```

## Algoritmo

1. El audio entra por carga de archivo o por grabación local con `getUserMedia` + `MediaRecorder`.
2. Web Audio API decodifica el archivo o blob local en memoria.
3. La señal se convierte a mono y se normaliza por pico.
4. Se analiza por ventanas con FFT para encontrar picos entre la frecuencia mínima y máxima configurada.
5. Las frecuencias cercanas se agrupan como candidatos.
6. Cada candidato se puntúa por energía, repetición, estabilidad, claridad ON/OFF y validez Morse.
7. Para el mejor candidato se calcula una envolvente enfocada con Goertzel.
8. Un umbral adaptativo convierte la envolvente en ON/OFF.
9. La segmentación fusiona microcortes e ignora clicks aislados.
10. Se estima la unidad base automáticamente y se clasifican puntos, rayas y pausas.
11. La tabla Morse internacional traduce símbolos a texto.

El análisis ocurre completamente en el navegador: el audio no se sube a ningún servidor.

## Modo codificar

El botón `Codificar` cambia a la cara transmisora de la máquina. Ahí puedes escribir texto, previsualizar su código Morse, generar el tono y descargar un MP3 local.

## Modo guía

El botón `Guía` abre la cara izquierda de la máquina con una tabla rápida de letras, números y una guía breve para entender puntos, rayas y pausas.

## Limitaciones conocidas

- Audios con música, eco fuerte o varios tonos Morse simultáneos pueden requerir ajustar frecuencia mínima/máxima o sensibilidad.
- La grabación por micrófono requiere permiso del navegador y funciona mejor en `localhost` o HTTPS.
- Si el operador cambia mucho la velocidad durante el mensaje, la estimación de unidad base puede degradarse.
- Los archivos muy largos se recortan para el análisis inicial para proteger el rendimiento del navegador.
- Tonos fuera de 300-2000 Hz requieren ajustar el rango manualmente.
