import { decodeTextEntities } from './displayName.js'

// Diacritic-insensitive name normaliser for match-import player resolution (D9).
// Mirrors normalizeLabel in tools/import-world-cup-squads.ts; that copy is left in place
// for now — deduplicating it touches the importer tool and is out of this work's scope.
export function normalizeName(value: string): string {
  return decodeTextEntities(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    // Treat "&" as the word "and" so source names like "Bosnia & Herzegovina" match the canonical
    // "Bosnia and Herzegovina" (and the reverse). Runs before the punctuation strip below, which would
    // otherwise drop the "&" to a blank and lose the conjunction entirely.
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
