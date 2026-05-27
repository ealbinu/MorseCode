import { MORSE_TABLE } from './morseTable'

export function decodeMorse(morse: string): { text: string; invalidSymbols: string[] } {
  const invalidSymbols: string[] = []
  const words = morse
    .trim()
    .split(' / ')
    .filter(Boolean)

  const text = words
    .map((word) =>
      word
        .split(' ')
        .filter(Boolean)
        .map((symbol) => {
          const decoded = MORSE_TABLE[symbol]
          if (!decoded) {
            invalidSymbols.push(symbol)
            return '�'
          }
          return decoded
        })
        .join(''),
    )
    .join(' ')

  return { text, invalidSymbols }
}
