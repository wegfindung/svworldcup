import type { MatchImportJson } from '../domain/types.js'
import { MatchImportValidationError } from './matchImportError.js'
import { matchImportJsonSchema } from './matchImportJson.js'
import { resolveTeamCode } from './teamLookup.js'

// The match-level fields are not in a CSV/TSV paste — they come from the import panel's
// form fields and the selected fixture. See architecture/SOP_match_data_import.md.
export interface CsvMatchOptions {
  homeTeamCode: string
  awayTeamCode: string
  homeTeamName: string
  awayTeamName: string
  homeGoals: number
  awayGoals: number
  sourceUrl: string
}

// The required per-player columns. A header row naming these is mandatory; order is free.
const REQUIRED_COLUMNS = ['name', 'team', 'lineupstatus', 'minutes', 'goals', 'assists', 'rating']

function resolveRowTeamName(value: string, options: CsvMatchOptions): string {
  const upper = value.trim().toUpperCase()
  if (upper === options.homeTeamCode) return options.homeTeamName
  if (upper === options.awayTeamCode) return options.awayTeamName
  const code = resolveTeamCode(value)
  if (code === options.homeTeamCode) return options.homeTeamName
  if (code === options.awayTeamCode) return options.awayTeamName
  throw new MatchImportValidationError(
    `Row team "${value}" is not one of the fixture's two teams.`,
  )
}

// Parse a pasted CSV/TSV player-rows table into the shared MatchImportJson shape, so the
// rest of the import pipeline stays format-agnostic. Delimiter (tab or comma) is
// auto-detected from the header row; a header row naming the columns is required.
export function parseMatchImportCsv(text: string, options: CsvMatchOptions): MatchImportJson {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length < 2) {
    throw new MatchImportValidationError(
      'The pasted CSV/TSV needs a header row and at least one player row.',
    )
  }

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : null
  if (!delimiter) {
    throw new MatchImportValidationError(
      'Could not detect a tab or comma delimiter in the header row.',
    )
  }

  const header = lines[0].split(delimiter).map((cell) => cell.trim().toLowerCase())
  const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column))
  if (missing.length > 0) {
    throw new MatchImportValidationError(
      `The CSV/TSV header is missing required column(s): ${missing.join(', ')}.`,
    )
  }

  const columnIndex = (column: string) => header.indexOf(column)
  const players = lines.slice(1).map((line, rowIndex) => {
    const cells = line.split(delimiter)
    if (cells.length !== header.length) {
      throw new MatchImportValidationError(
        `Row ${rowIndex + 1} has ${cells.length} columns but the header has ${header.length}.`,
      )
    }
    const cell = (column: string) => cells[columnIndex(column)]?.trim() ?? ''
    return {
      name: cell('name'),
      team: resolveRowTeamName(cell('team'), options),
      lineupStatus: cell('lineupstatus').toLowerCase(),
      minutes: cell('minutes'),
      goals: cell('goals'),
      assists: cell('assists'),
      rating: cell('rating'),
    }
  })

  // Reuse the JSON schema for all per-field validation (ranges, enum, numeric coercion).
  return matchImportJsonSchema.parse({
    match: {
      homeTeam: options.homeTeamName,
      awayTeam: options.awayTeamName,
      homeGoals: options.homeGoals,
      awayGoals: options.awayGoals,
      sourceUrl: options.sourceUrl,
    },
    players,
  })
}
