import type { MatchImportJson } from '../domain/types.js'
import { MatchImportValidationError } from './matchImportError.js'
import { matchImportJsonSchema } from './matchImportJson.js'
import { resolveRowTeamName, type CsvMatchOptions } from './matchImportCsv.js'

// Fix B: parser for the official provider feed CSV (one file per fixture). Column set:
//   fixture_id,kickoff,round,team,player,position,minutes,goals,assists,shots,
//   shots_on_target,passes,key_passes,tackles,saves,yellow_cards,red_cards,rating
// Differences vs. the manual-paste contract (matchImportCsv.ts), all handled here:
// - `player` instead of `name`; extra stat columns are ignored.
// - The file lists each side's FULL matchday squad. A row with an empty `minutes` cell is
//   a player who did not play — dropped at parse, never imported (an entry with no minutes
//   scores nothing, and the full squads would overflow the 40-player schema cap).
// - No lineupStatus column. Starter vs substitute is derived per team: the eleven
//   most-played rows start, the rest are used substitutes. Scoring ignores the field
//   (promotion writes in_official_squad = true on every row — see matchPromotion.ts); it
//   only feeds the 11-starter cap and the review display, where an admin can correct it.
// - The in-file fixture_id/kickoff/round are the provider's, not ours — ignored. The
//   match-level fields (score, source URL) come from the form, like the manual CSV path.
// See architecture/SOP_match_data_import.md "Provider feed CSV".

const REQUIRED_COLUMNS = ['team', 'player', 'minutes', 'goals', 'assists', 'rating']

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function detectDelimiter(headerLine: string): string | null {
  return headerLine.includes('\t') ? '\t' : headerLine.includes(',') ? ',' : null
}

// The upload route uses this to pick a parser: a header naming `player` (and not `name`)
// is the provider feed; anything else goes to the manual-paste parser.
export function isFeedCsv(text: string): boolean {
  const lines = splitLines(text)
  if (lines.length === 0) {
    return false
  }
  const delimiter = detectDelimiter(lines[0])
  if (!delimiter) {
    return false
  }
  const header = lines[0].split(delimiter).map((cell) => cell.trim().toLowerCase())
  return header.includes('player') && !header.includes('name')
}

export function parseMatchImportFeedCsv(text: string, options: CsvMatchOptions): MatchImportJson {
  const lines = splitLines(text)
  if (lines.length < 2) {
    throw new MatchImportValidationError(
      'The feed CSV needs a header row and at least one player row.',
    )
  }

  const delimiter = detectDelimiter(lines[0])
  if (!delimiter) {
    throw new MatchImportValidationError(
      'Could not detect a tab or comma delimiter in the header row.',
    )
  }

  const header = lines[0].split(delimiter).map((cell) => cell.trim().toLowerCase())
  const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column))
  if (missing.length > 0) {
    throw new MatchImportValidationError(
      `The feed CSV header is missing required column(s): ${missing.join(', ')}.`,
    )
  }

  const columnIndex = (column: string) => header.indexOf(column)
  const played: Array<{
    name: string
    team: string
    minutes: string
    goals: string
    assists: string
    rating: string
  }> = []

  lines.slice(1).forEach((line, rowIndex) => {
    const cells = line.split(delimiter)
    if (cells.length !== header.length) {
      throw new MatchImportValidationError(
        `Row ${rowIndex + 1} has ${cells.length} columns but the header has ${header.length}.`,
      )
    }
    const cell = (column: string) => cells[columnIndex(column)]?.trim() ?? ''
    if (cell('minutes') === '') {
      return
    }
    played.push({
      name: cell('player'),
      team: resolveRowTeamName(cell('team'), options),
      minutes: cell('minutes'),
      goals: cell('goals') || '0',
      assists: cell('assists') || '0',
      rating: cell('rating') || '0',
    })
  })

  if (played.length === 0) {
    throw new MatchImportValidationError(
      'No row in the feed CSV has minutes — there is nothing to import.',
    )
  }

  // Derive lineup status: per team, the eleven most-played rows start. Stable sort keeps
  // file order between equal minutes, so the derivation is deterministic.
  const indicesByTeam = new Map<string, number[]>()
  played.forEach((row, index) => {
    const indices = indicesByTeam.get(row.team) ?? []
    indices.push(index)
    indicesByTeam.set(row.team, indices)
  })
  const lineupStatus: Array<'starter' | 'substitute'> = new Array(played.length).fill('substitute')
  for (const indices of indicesByTeam.values()) {
    const ranked = [...indices].sort((a, b) => Number(played[b].minutes) - Number(played[a].minutes))
    for (const index of ranked.slice(0, 11)) {
      lineupStatus[index] = 'starter'
    }
  }

  // Reuse the JSON schema for all per-field validation (ranges, numeric coercion).
  return matchImportJsonSchema.parse({
    match: {
      homeTeam: options.homeTeamName,
      awayTeam: options.awayTeamName,
      homeGoals: options.homeGoals,
      awayGoals: options.awayGoals,
      sourceUrl: options.sourceUrl,
    },
    players: played.map((row, index) => ({
      name: row.name,
      team: row.team,
      lineupStatus: lineupStatus[index],
      minutes: row.minutes,
      goals: row.goals,
      assists: row.assists,
      rating: row.rating,
    })),
  })
}
