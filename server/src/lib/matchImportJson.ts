import { z } from 'zod'
import type { MatchImportJson } from '../domain/types.js'
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
  const starterCounts = new Map<string, number>()
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

    if (player.lineupStatus === 'starter') {
      const count = (starterCounts.get(normalizedTeam) ?? 0) + 1
      if (count > 11) {
        throw new MatchImportValidationError(
          `${player.team} has more than 11 starters. The starting lineup is fixed at 11 players.`,
        )
      }
      starterCounts.set(normalizedTeam, count)
    }
  }
}
