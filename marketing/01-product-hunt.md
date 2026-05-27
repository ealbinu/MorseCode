# Product Hunt

**URL para publicar:** https://www.producthunt.com/posts/new

---

## Name
codigomorse.link

## Tagline
Browser-only Morse code decoder & encoder — no uploads, no backend, full audio

## Description

codigomorse.link is a full Morse code toolkit that runs entirely in your browser. No files leave your device.

**What it does:**
- Decode Morse from an audio file (MP3, WAV, OGG) or live microphone recording
- Encode any text to Morse with a vintage audio player and MP3 download
- Visual light output (lamp + fullscreen flash mode)
- Interactive guide: tapper, operator metronome, Q-codes, cheatsheet

**Why it's different:**
Most Morse tools only do text → dots-and-dashes. codigomorse.link actually analyzes audio — it uses FFT and energy envelope detection to find the Morse tone in a real recording and decode it to text. Everything runs client-side via the Web Audio API.

The UI is styled as a 1940s radio/telegraph machine (skeuomorphic, dark, amber dials). Built with Vite + React + TypeScript.

## Topics
`Developer Tools` · `Education` · `Audio` · `Open Source`

## Thumbnail / Media
- OG image: https://codigomorse.link/og-image.png

---

## Maker's first comment
*(pégalo tú justo después de publicar, como primer comentario)*

> I built this because I'm a ham radio operator and couldn't find a Spanish-language Morse tool that actually decoded audio. Most online tools only convert text to dots and dashes — none of them analyze a real audio file.
>
> The audio decoder was the hard part: FFT analysis, tone candidate scoring, Goertzel energy envelope, segmentation, and duration classification to turn raw audio into readable text. Everything runs in the browser via Web Audio API — no server touches your audio.
>
> Happy to answer questions about the implementation. 73.
