// Diacritic-insensitive name normaliser for match-import player resolution (D9).
// Mirrors normalizeLabel in tools/import-world-cup-squads.ts; that copy is left in place
// for now — deduplicating it touches the importer tool and is out of this work's scope.
export function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
