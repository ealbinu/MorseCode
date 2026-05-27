# Show HN (Hacker News)

**URL para publicar:** https://news.ycombinator.com/submit
**Mejor horario:** martes o miércoles, 9–11am EST

---

## Title
Show HN: Browser-only Morse code audio decoder – analyzes MP3/WAV files with Web Audio API

## URL
https://codigomorse.link

## Text (opcional)

I built a Morse code decoder that actually analyzes audio files — not just text conversion. Upload an MP3/WAV or record from the microphone, and it decodes the Morse to text entirely in the browser.

The interesting part is the audio pipeline: FFT frequency analysis → tone candidate scoring (energy, repetition, ON/OFF clarity) → Goertzel energy envelope → thresholding → segmentation → duration classification (dots vs dashes) → Morse decode. No backend, no file uploads.

Also includes a text encoder with vintage audio player, MP3 export, light output, operator metronome, Q-codes guide, and an interactive telegraph tapper.

Stack: Vite + React + TypeScript + Web Audio API + lamejs for MP3 encoding.

GitHub: https://github.com/ealbinu/MorseCode

---

## Notas
- HN premia brevedad. Si quieres ir más corto, deja solo el "Text" del primer párrafo.
- Después de publicar, comparte el link en el maker comment de Product Hunt.
- El artículo de dev.to funciona bien como seguimiento si el post pega.
