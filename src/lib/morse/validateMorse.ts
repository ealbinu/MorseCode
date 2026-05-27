import { MORSE_TABLE } from './morseTable'

export function validateMorse(morse: string): {
  validityScore: number
  invalidSymbols: string[]
  totalSymbols: number
} {
  const symbols = morse
    .split(/\s+|\/+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (symbols.length === 0) {
    return { validityScore: 0, invalidSymbols: [], totalSymbols: 0 }
  }

  const invalidSymbols = symbols.filter((symbol) => !MORSE_TABLE[symbol])
  const validityScore = 1 - invalidSymbols.length / symbols.length

  return {
    validityScore,
    invalidSymbols,
    totalSymbols: symbols.length,
  }
}
