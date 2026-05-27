# dev.to — Artículo técnico

**URL para publicar:** https://dev.to/new
**Tags:** `javascript` `webdev` `audio` `typescript`
**Cover image:** https://codigomorse.link/og-image.png
**Mejor horario:** martes o miércoles de mañana (EST)

---

```markdown
---
title: How I built a browser-only Morse code audio decoder with Web Audio API
published: true
tags: javascript, webdev, audio, typescript
cover_image: https://codigomorse.link/og-image.png
---

Most Morse code tools online do one thing: convert text to dots and dashes.
I wanted the hard part — take a real audio file with Morse code tones and
decode it to text, entirely in the browser, with no backend.

This is what I learned building [codigomorse.link](https://codigomorse.link).

## The problem with audio Morse decoding

Text-to-Morse is trivial: look up a table, done. Audio-to-Morse is different.
A real recording has:

- Background noise and static
- Tones at unknown frequencies (could be 400 Hz, 700 Hz, 1200 Hz...)
- Unknown speed (WPM)
- Possible echo, reverb, or interference from other stations
- No metadata — you don't know where dots end and dashes begin

The decoder has to figure all of this out from raw PCM samples.

## Pipeline overview

```
Audio file / microphone
        ↓
   Mono + normalize
        ↓
  FFT frequency analysis  ← find candidate tone frequencies
        ↓
  Tone candidate scoring  ← pick the best frequency
        ↓
  Goertzel energy envelope ← track tone ON/OFF over time
        ↓
   Thresholding           ← binary signal
        ↓
   Segmentation           ← list of ON/OFF segments with durations
        ↓
  Duration classification ← dots, dashes, letter gaps, word gaps
        ↓
   Morse decode           ← table lookup → text
```

Each stage answers one specific question and passes a simple data structure
to the next. No global state, no magic numbers in the middle of the pipeline.

---

## Stage 1: FFT frequency analysis

The first problem is: **what frequency is the Morse tone?**

I divide the audio into overlapping frames and run an FFT on each. The FFT
gives me the power at each frequency bin for that frame. I collect the
top-energy peaks across all frames into a list of `SpectrumPeak` objects:

```ts
type SpectrumPeak = {
  frequencyHz: number
  energy: number
  frameIndex: number
}
```

The search range is configurable (default 120–3200 Hz) to cover the full
range of CW tones used in amateur radio.

---

## Stage 2: Tone candidate detection

Now I have thousands of peaks. Which frequency is the Morse signal?

I group peaks into 25 Hz buckets — peaks at 698 Hz and 712 Hz are probably
the same tone with slight frequency drift. Then I score each group on five
dimensions:

```ts
const totalScore =
  energyScore * 0.25 +      // how loud the tone is
  repetitionScore * 0.25 +  // how often it appears across frames
  stabilityScore * 0.2 +    // how consistent the frequency is
  onOffClarityScore * 0.2 + // does it turn ON and OFF like Morse?
  morseValidityScore * 0.1  // does the resulting Morse make sense?
```

**The ON/OFF clarity score is the most interesting one.** A constant tone
(carrier) scores poorly. Random noise scores poorly. Morse scores well
because it has a duty cycle between 3% and 72%, many transitions, and
gaps that fall into recognizable duration bands.

```ts
const dutyScore =
  onFraction > 0.03 && onFraction < 0.72 ? 1
  : onFraction < 0.03 ? onFraction / 0.03
  : (1 - onFraction) / 0.28
```

The frequency with the highest `totalScore` becomes the target tone.

---

## Stage 3: Goertzel energy envelope

Once I know the target frequency, I need to track its energy over time —
not a full FFT per frame, but targeted energy measurement at exactly one
frequency. This is what the **Goertzel algorithm** is for.

Goertzel computes the DFT at a single frequency in O(N) time, which is
much cheaper than a full FFT when you only need one bin:

```ts
const coefficient = 2 * Math.cos((2 * Math.PI * frequencyHz) / sampleRate)

for (let i = 0; i < windowSize; i++) {
  q0 = coefficient * q1 - q2 + signal[start + i]
  q2 = q1
  q1 = q0
}

const power = q1 * q1 + q2 * q2 - coefficient * q1 * q2
```

I run this over 20 ms windows with 10 ms hops. The result is a sequence of
`(time, energy)` pairs — a time-domain envelope of the target tone. I smooth
it with a 5-point moving average and normalize to [0, 1].

---

## Stage 4: Thresholding and segmentation

The normalized envelope is continuous. I need binary: tone is ON or OFF.

**Thresholding** applies an adaptive threshold, converting each envelope
point to `isOn: boolean`.

**Segmentation** collapses consecutive ON frames into a single segment
with a duration, then cleans up artifacts:

```ts
// Remove clicks shorter than 18ms — almost never real Morse dits
const withoutClicks = segments.filter(s =>
  s.type === 'on' ? s.durationMs >= 18 : true
)

// Merge OFF gaps shorter than 25ms between ON segments
// (artifacts from envelope smoothing, not real letter gaps)
```

The result is a clean list of `{ type: 'on' | 'off', durationMs: number }`
segments — the raw timing of the Morse signal.

---

## Stage 5: Duration classification

This is where segments become actual Morse code. The key insight: **all
durations in Morse are multiples of one unit time** (the duration of a dot).

- Dot: 1 unit
- Dash: 3 units
- Letter gap: 3 units
- Word gap: 7 units

I estimate the unit time from the most common short ON-segment duration.
Then I classify each segment:

```
ON  segment < dashRatio * unitMs    → dot (.)
ON  segment ≥ dashRatio * unitMs    → dash (-)
OFF segment < 2 * unitMs            → symbol gap (ignored)
OFF segment < wordGapRatio * unitMs → letter gap ( )
OFF segment ≥ wordGapRatio * unitMs → word gap  (/)
```

Default `dashRatio` is 2.0 and `wordGapRatio` is 5.5 — both configurable
because real recordings often have non-standard timing.

---

## Stage 6: The sensitivity sweep

A single threshold value doesn't work for all recordings. Too high and you
miss weak dits. Too low and noise becomes signal.

Instead of asking the user to tune it, I run **six decode passes** in
parallel at different sensitivity values around the user's setting:

```ts
const offsets = [-0.18, -0.09, 0, 0.09, 0.18, 0.28]
const passes = offsets.map(o => decodeWithSensitivity(envelope, base + o))
```

Each pass produces a different decoded text. I score each one:

```ts
const score =
  validation.validityScore * 0.18 +  // % of valid Morse symbols
  languageScore * 0.34 +              // does it look like real words?
  fragmentationScore * 0.22 +         // are symbols too short/fragmented?
  spacingScore * 0.14 +               // is gap timing consistent?
  scoreSymbolShape(morse) * 0.08 +    // are symbols ≤ 6 chars long?
  scoreSegmentCount(segments) * 0.04  // enough signal to work with?
```

The **language score** is the most powerful heuristic. It rewards vowels
(random noise decodes to mostly consonants), penalizes runs of 5+ consonants,
and gives bonus points for common words appearing in the output.

The best-scoring pass wins — no user tuning needed for most recordings.

---

## What I got wrong first

**Single threshold:** My first version had one fixed threshold. It worked
on clean test audio and failed on anything from a real radio. The sensitivity
sweep fixed this.

**Full FFT per-segment:** I initially tried running FFT on each ON-segment
individually to confirm the tone. Slow and added no value — Goertzel on the
full signal gives you the same information with much less code.

**Median for unit time estimation:** Median of ON durations is statistically
fragile when there's noise. The current approach (mode of short ON durations)
is more robust for real-world recordings.

---

## Tech stack

- **Vite + React + TypeScript** — the app shell
- **Web Audio API** — decoding audio files via `AudioContext.decodeAudioData`
- **No DSP libraries** — FFT, Goertzel, and all signal processing are
  hand-rolled in TypeScript
- **lamejs** — MP3 encoding for the "Download MP3" feature in the encoder

---

## Try it

Live at [codigomorse.link](https://codigomorse.link).
Source: [github.com/ealbinu/MorseCode](https://github.com/ealbinu/MorseCode)

Most interesting files:

- [`analyzeMorseAudio.ts`](https://github.com/ealbinu/MorseCode/blob/main/src/lib/audio/analyzeMorseAudio.ts) — main pipeline
- [`toneCandidateDetection.ts`](https://github.com/ealbinu/MorseCode/blob/main/src/lib/audio/toneCandidateDetection.ts) — tone scoring
- [`energyEnvelope.ts`](https://github.com/ealbinu/MorseCode/blob/main/src/lib/audio/energyEnvelope.ts) — Goertzel implementation
- [`classifyDurations.ts`](https://github.com/ealbinu/MorseCode/blob/main/src/lib/morse/classifyDurations.ts) — timing classification

Happy to answer questions about any stage of the pipeline. 73.
```
