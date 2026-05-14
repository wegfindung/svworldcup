import { z } from 'zod'
import type { LineupStatus, MatchImportJson } from '../domain/types.js'
import { MatchImportValidationError } from './matchImportError.js'
import { normalizeName } from './normalizeName.js'

// The JSON contract an admin pastes — pure source-transcription (D7). No app IDs, no derived
// fields. See architecture/SOP_match_data_import.md.
export const matchImportJsonSchema = z.object({
  match: z.object({
    homeTeam: z.string().trim().min(1).max(120),
    awayTeam: z.string().trim().min(1).max(120),
    homeGoals: z.coerce.number().int().min(0).max(99),
    awayGoals: z.coerce.number().int().min(0).max(99),
    sourceUrl: z.string().trim().url().max(500),
  }),
  players: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        team: z.string().trim().min(1).max(120),
        lineupStatus: z.enum(['starter', 'substitute']),
        minutes: z.coerce.number().int().min(0).max(130),
        goals: z.coerce.number().int().min(0).max(20),
        assists: z.coerce.number().int().min(0).max(20),
        rating: z.coerce.number().min(0).max(10),
      }),
    )
    .min(1)
    .max(40),
})

export function parseMatchImportJson(raw: unknown): MatchImportJson {
  return matchImportJsonSchema.parse(raw)
}

// Fix 8: the starting lineup is fixed at 11 players (used substitutes are not capped).
// Extracted as a standalone check because the cap must be re-asserted AFTER lineupStatus
// edits — resolve-stage edits (Fix A, applied in finalizeSubmission) and review-screen edits
// (updateRow) both happen after the parse-time check below has already run. Works on any rows
// carrying a team key plus a lineup status.
export function assertStarterCap(
  rows: ReadonlyArray<{ teamCode: string; lineupStatus: LineupStatus }>,
): void {
  const starterCounts = new Map<string, number>()
  for (const row of rows) {
    if (row.lineupStatus !== 'starter') {
      continue
    }
    const count = (starterCounts.get(row.teamCode) ?? 0) + 1
    if (count > 11) {
      throw new MatchImportValidationError(
        `${row.teamCode} has more than 11 starters. The starting lineup is fixed at 11 players.`,
      )
    }
    starterCounts.set(row.teamCode, count)
  }
}

// Semantic checks beyond shape: every player's team must be one of the two match teams, and
// D4 — no player may appear twice for the same team. The wrong-fixture guard (D10) needs the
// selected fixture and lives in the importer adapter.
export function assertMatchImportSemantics(json: MatchImportJson): void {
  const homeTeam = normalizeName(json.match.homeTeam)
  const awayTeam = normalizeName(json.match.awayTeam)
  if (homeTeam === awayTeam) {
    throw new MatchImportValidationError('The match must name two distinct teams.')
  }
  const matchTeams = new Set([homeTeam, awayTeam])

  const seen = new Set<string>()
  for (const player of json.players) {
    const normalizedTeam = normalizeName(player.team)
    if (!matchTeams.has(normalizedTeam)) {
      throw new MatchImportValidationError(
        `Player "${player.name}" is assigned to "${player.team}", which is not one of the two match teams.`,
      )
    }
    const key = `${normalizedTeam}:${normalizeName(player.name)}`
    if (seen.has(key)) {
      throw new MatchImportValidationError(
        `Player "${player.name}" appears more than once for ${player.team}.`,
      )
    }
    seen.add(key)
  }

  assertStarterCap(
    json.players.map((player) => ({
      teamCode: normalizeName(player.team),
      lineupStatus: player.lineupStatus,
    })),
  )
}
