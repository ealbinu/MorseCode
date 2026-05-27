import { MORSE_TABLE } from './morseTable'

const TEXT_TO_MORSE = Object.fromEntries(Object.entries(MORSE_TABLE).map(([morse, text]) => [text, morse]))

const ACCENT_MAP: Record<string, string> = {
  Á: 'A',
  À: 'A',
  Ä: 'A',
  Â: 'A',
  É: 'E',
  È: 'E',
  Ë: 'E',
  Ê: 'E',
  Í: 'I',
  Ì: 'I',
  Ï: 'I',
  Î: 'I',
  Ó: 'O',
  Ò: 'O',
  Ö: 'O',
  Ô: 'O',
  Ú: 'U',
  Ù: 'U',
  Ü: 'U',
  Û: 'U',
  Ñ: 'N',
}

export function encodeTextToMorse(text: string): { morse: string; unsupported: string[] } {
  const unsupported = new Set<string>()
  const words = text
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  const morseWords = words.map((word) =>
    Array.from(word)
      .map((char) => ACCENT_MAP[char] ?? char)
      .map((char) => {
        const morse = TEXT_TO_MORSE[char]
        if (!morse) {
          unsupported.add(char)
          return ''
        }
        return morse
      })
      .filter(Boolean)
      .join(' '),
  )

  return {
    morse: morseWords.filter(Boolean).join(' / '),
    unsupported: Array.from(unsupported),
  }
}
