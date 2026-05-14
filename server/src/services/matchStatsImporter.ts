import { fixtures } from '../data/worldCupSeed.js'
import { MatchImportValidationError } from '../lib/matchImportError.js'
import { normalizeName } from '../lib/normalizeName.js'
import { resolvePlayer, type PlayerResolutionContext } from '../lib/playerResolution.js'
import { resolveTeamCode } from '../lib/teamLookup.js'
import type { CreateMatchBatchRowInput, ImportedMatch, MatchImportJson } from '../domain/types.js'
import type { MatchMappingRepository } from '../repositories/matchMappingRepository.js'
import type { TeamPoolRepository } from '../repositories/teamPoolRepository.js'

export interface MatchImportRequest {
  fixtureId: string
  createdBy: string
  json: MatchImportJson
}

// D1: the adapter abstraction. One importMatch() implementation per data source, all feeding
// the same pending -> two-admin confirm -> promote pipeline. The JSON adapter is concrete; the
// API adapter is a documented stub until a data source is team-locked.
export interface MatchStatsImporter {
  source: 'json' | 'api'
  importMatch(request: MatchImportRequest): Promise<ImportedMatch>
}

export class JsonMatchStatsImporter implements MatchStatsImporter {
  source: 'json' = 'json'

  constructor(
    private readonly mappingRepository: MatchMappingRepository,
    private readonly teamPoolRepository: TeamPoolRepository,
  ) {}

  async importMatch(request: MatchImportRequest): Promise<ImportedMatch> {
    const { fixtureId, json } = request

    const fixture = fixtures.find((candidate) => candidate.fixtureId === fixtureId)
    if (!fixture) {
      throw new MatchImportValidationError('Unknown fixture.')
    }

    // D10 wrong-fixture guard: the JSON's two teams must be the selected fixture's two teams.
    const homeCode = resolveTeamCode(json.match.homeTeam)
    const awayCode = resolveTeamCode(json.match.awayTeam)
    if (!homeCode || !awayCode) {
      throw new MatchImportValidationError('Could not resolve both team names to World Cup teams.')
    }
    const jsonCodes = new Set([homeCode, awayCode])
    if (!jsonCodes.has(fixture.homeTeamCode) || !jsonCodes.has(fixture.awayTeamCode)) {
      throw new MatchImportValidationError(
        'The submitted JSON describes a different fixture than the one selected.',
      )
    }

    const teamCodeByName = new Map<string, string>([
      [normalizeName(json.match.homeTeam), homeCode],
      [normalizeName(json.match.awayTeam), awayCode],
    ])

    // D9: load each team's resolution memory and curated pool once.
    const contextByTeam = new Map<string, PlayerResolutionContext>()
    for (const teamCode of jsonCodes) {
      contextByTeam.set(teamCode, {
        mapEntries: await this.mappingRepository.listPlayerMap(teamCode),
        skipNames: await this.mappingRepository.listSkipNames(teamCode),
        teamPool: await this.teamPoolRepository.listByTeam(teamCode),
      })
    }

    const rows: CreateMatchBatchRowInput[] = []
    const skippedNames: string[] = []

    for (const player of json.players) {
      const teamCode = teamCodeByName.get(normalizeName(player.team))
      if (!teamCode) {
        throw new MatchImportValidationError(
          `Player "${player.name}" is assigned to a team not in this fixture.`,
        )
      }
      const context = contextByTeam.get(teamCode) as PlayerResolutionContext
      const resolution = resolvePlayer(player.name, teamCode, context)

      // D12: a name on the skip list is deliberately not imported as a row.
      if (resolution.status === 'skipped') {
        skippedNames.push(player.name)
        continue
      }

      rows.push({
        sourceName: player.name,
        teamCode,
        playerId: resolution.status === 'resolved' ? resolution.playerId : null,
        lineupStatus: player.lineupStatus,
        minutes: player.minutes,
        goals: player.goals,
        assists: player.assists,
        rating: player.rating,
        // D11: clean-sheet eligibility is a review-UI judgement, defaulted false on import.
        cleanSheetEligible: false,
      })
    }

    return {
      batchInput: {
        fixtureId,
        sourceUrl: json.match.sourceUrl,
        homeGoals: json.match.homeGoals,
        awayGoals: json.match.awayGoals,
        createdBy: request.createdBy,
        rows,
      },
      skippedNames,
    }
  }
}

export class ApiMatchStatsImporter implements MatchStatsImporter {
  source: 'api' = 'api'

  // D1: documented stub. season=2026 cannot be called without a paid API-Football key, so the
  // real /fixtures/players response shape is unverified and the data source is not team-locked.
  // When a source is decided, implement importMatch() to feed the SAME pipeline (pending ->
  // two-admin confirm -> promote) as the JSON adapter. See architecture/SOP_match_data_import.md.
  async importMatch(): Promise<ImportedMatch> {
    throw new MatchImportValidationError('The API match-stats adapter is not implemented yet.')
  }
}
