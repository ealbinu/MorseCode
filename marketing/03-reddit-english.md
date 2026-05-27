# Reddit — English communities

**Publicar en:**
- https://reddit.com/r/amateurradio
- https://reddit.com/r/HamRadio

---

## Title
I built a browser-only Morse code audio decoder — upload an MP3 or record from mic, get decoded text

## Body

Hey hams, built a free tool for decoding Morse from audio files.

**codigomorse.link** — no backend, no file uploads, everything runs in your browser via Web Audio API.

Features:
- Upload MP3/WAV/OGG or record from microphone → decoded text
- FFT-based tone detection with energy scoring (handles some background noise)
- Text encoder with adjustable WPM, tone frequency, wave type, MP3 download
- Visual light output (lamp mode + fullscreen flash)
- Operator metronome, telegraph tapper, Q-codes reference, full cheatsheet

The UI is in Spanish (I'm a Spanish-speaking ham) but the tool works for anyone — the audio analysis is language-agnostic.

Would love feedback from CW operators on real-world recordings. 73 de EA/XE/LU/CE/PY region.

---

## Notas
- No menciones "promotion" ni "my site" — habla como operador compartiendo una herramienta útil.
- Si te piden el source: https://github.com/ealbinu/MorseCode
