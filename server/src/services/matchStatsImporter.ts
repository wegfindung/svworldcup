import { fixtures } from '../data/worldCupSeed.js'
import { MatchImportValidationError } from '../lib/matchImportError.js'
import { normalizeName } from '../lib/normalizeName.js'
import { resolvePlayer, type PlayerResolutionContext } from '../lib/playerResolution.js'
import { resolveTeamCode } from '../lib/teamLookup.js'
import type { MatchImportJson, MatchResolution, ResolvedMatchRow } from '../domain/types.js'
import type { MatchMappingRepository } from '../repositories/matchMappingRepository.js'
import type { TeamPoolRepository } from '../repositories/teamPoolRepository.js'

export interface MatchImportRequest {
  fixtureId: string
  json: MatchImportJson
}

// D1: the adapter abstraction. One resolveMatch() implementation per data source, all
// feeding the same pre-persist resolve -> two-admin confirm -> promote pipeline. The JSON
// adapter is concrete (and also serves the CSV/TSV format, which is parsed into the same
// MatchImportJson shape upstream); the API adapter is a documented stub.
export interface MatchStatsImporter {
  source: 'json' | 'api'
  resolveMatch(request: MatchImportRequest): Promise<MatchResolution>
}

export class JsonMatchStatsImporter implements MatchStatsImporter {
  source: 'json' = 'json'

  constructor(
    private readonly mappingRepository: MatchMappingRepository,
    private readonly teamPoolRepository: TeamPoolRepository,
  ) {}

  // Parse-time resolution only: nothing is persisted. Every player is auto-resolved against
  // the D9 memory + curated pool; rows that stay unresolved are returned for the admin to
  // resolve or skip in the pre-persist stage. See architecture/SOP_match_data_import.md.
  async resolveMatch(request: MatchImportRequest): Promise<MatchResolution> {
    const { fixtureId, json } = request

    const fixture = fixtures.find((candidate) => candidate.fixtureId === fixtureId)
    if (!fixture) {
      throw new MatchImportValidationError('Unknown fixture.')
    }
    // buildMatchImportJson guarantees a source URL (from the JSON or the panel's form field);
    // this guard makes that invariant explicit and narrows the type for the return below.
    if (!json.match.sourceUrl) {
      throw new MatchImportValidationError('The submission is missing a source URL.')
    }
    const sourceUrl = json.match.sourceUrl

    // D10 wrong-fixture guard: the submission's two teams must be the selected fixture's.
    const homeCode = resolveTeamCode(json.match.homeTeam)
    const awayCode = resolveTeamCode(json.match.awayTeam)
    if (!homeCode || !awayCode) {
      throw new MatchImportValidationError('Could not resolve both team names to Grand Tournament teams.')
    }
    const fixtureCodes = new Set([homeCode, awayCode])
    if (!fixtureCodes.has(fixture.homeTeamCode) || !fixtureCodes.has(fixture.awayTeamCode)) {
      throw new MatchImportValidationError(
        'The submission describes a different fixture than the one selected.',
      )
    }

    const teamCodeByName = new Map<string, string>([
      [normalizeName(json.match.homeTeam), homeCode],
      [normalizeName(json.match.awayTeam), awayCode],
    ])

    // D9: load each team's resolution memory and curated pool once.
    const contextByTeam = new Map<string, PlayerResolutionContext>()
    for (const teamCode of fixtureCodes) {
      contextByTeam.set(teamCode, {
        mapEntries: await this.mappingRepository.listPlayerMap(teamCode),
        skipNames: await this.mappingRepository.listSkipNames(teamCode),
        teamPool: await this.teamPoolRepository.listByTeam(teamCode),
      })
    }

    const rows: ResolvedMatchRow[] = []
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

      // D12: a name on the skip list is auto-skipped — reported, not returned as a row.
      if (resolution.status === 'skipped') {
        skippedNames.push(player.name)
        continue
      }

      rows.push({
        sourceName: player.name,
        teamCode,
        lineupStatus: player.lineupStatus,
        minutes: player.minutes,
        goals: player.goals,
        assists: player.assists,
        rating: player.rating,
        resolution,
      })
    }

    return {
      fixtureId,
      sourceUrl,
      homeTeamCode: fixture.homeTeamCode,
      awayTeamCode: fixture.awayTeamCode,
      homeGoals: json.match.homeGoals,
      awayGoals: json.match.awayGoals,
      rows,
      skippedNames,
    }
  }
}

export class ApiMatchStatsImporter implements MatchStatsImporter {
  source: 'api' = 'api'

  // D1: documented stub. season=2026 cannot be called without a paid API-Football key, so the
  // real /fixtures/players response shape is unverified and the data source is not team-locked.
  // When a source is decided, implement resolveMatch() to feed the SAME pipeline (pre-persist
  // resolve -> two-admin confirm -> promote) as the JSON adapter.
  async resolveMatch(): Promise<MatchResolution> {
    throw new MatchImportValidationError('The API match-stats adapter is not implemented yet.')
  }
}
