import { describe, expect, it } from 'vitest'
import type { MatchImportJson, SoccerversePlayerRecord } from '../domain/types.js'
import { MatchImportValidationError } from '../lib/matchImportError.js'
import { MemoryMatchMappingRepository } from '../repositories/matchMappingRepository.js'
import { MemoryTeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { JsonMatchStatsImporter } from './matchStatsImporter.js'

const BRA_MAR_FIXTURE = '2026-06-13-c-bra-mar'

function svPlayer(playerId: number, displayName: string): SoccerversePlayerRecord {
  return { playerId, displayName, nationalityCode: 'BRA', rating: 80, clubId: 0, positions: ['MID'] }
}

function baseJson(): MatchImportJson {
  return {
    match: { homeTeam: 'Brazil', awayTeam: 'Morocco', homeGoals: 1, awayGoals: 0, sourceUrl: 'https://x.test/m' },
    players: [
      { name: 'Vinicius Junior', team: 'Brazil', lineupStatus: 'starter', minutes: 90, goals: 1, assists: 0, rating: 8.1 },
    ],
  }
}

async function makeImporter() {
  const mapping = new MemoryMatchMappingRepository()
  const pools = new MemoryTeamPoolRepository()
  await pools.replaceTeamPlayers('BRA', [svPlayer(10, 'Vinicius Junior'), svPlayer(11, 'Rodrygo')])
  await pools.replaceTeamPlayers('MAR', [svPlayer(20, 'Achraf Hakimi')])
  return { importer: new JsonMatchStatsImporter(mapping, pools), mapping }
}

describe('JsonMatchStatsImporter.resolveMatch', () => {
  it('auto-resolves a player against the team pool', async () => {
    const { importer } = await makeImporter()
    const result = await importer.resolveMatch({ fixtureId: BRA_MAR_FIXTURE, json: baseJson() })
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].resolution).toEqual({ status: 'resolved', playerId: 10 })
    expect(result.sourceUrl).toBe('https://x.test/m')
    expect(result.homeGoals).toBe(1)
    expect(result.awayGoals).toBe(0)
  })

  it('leaves an unknown player unresolved', async () => {
    const { importer } = await makeImporter()
    const json = baseJson()
    json.players[0].name = 'Unknown Newcomer'
    const result = await importer.resolveMatch({ fixtureId: BRA_MAR_FIXTURE, json })
    expect(result.rows[0].resolution.status).toBe('unresolved')
  })

  it('auto-skips a name on the skip list and reports it instead of returning a row', async () => {
    const { importer, mapping } = await makeImporter()
    await mapping.addSkipName({ teamCode: 'BRA', normalizedSourceName: 'vinicius junior', createdBy: 'a@example.com' })
    const result = await importer.resolveMatch({ fixtureId: BRA_MAR_FIXTURE, json: baseJson() })
    expect(result.rows).toHaveLength(0)
    expect(result.skippedNames).toEqual(['Vinicius Junior'])
  })

  it('rejects a submission describing a different fixture than the one selected (D10)', async () => {
    const { importer } = await makeImporter()
    await expect(
      importer.resolveMatch({ fixtureId: '2026-06-13-d-usa-par', json: baseJson() }),
    ).rejects.toBeInstanceOf(MatchImportValidationError)
  })

  it('rejects an unknown fixture', async () => {
    const { importer } = await makeImporter()
    await expect(
      importer.resolveMatch({ fixtureId: 'not-a-fixture', json: baseJson() }),
    ).rejects.toBeInstanceOf(MatchImportValidationError)
  })

  it('resolves via the current community-pack name when the stored name is stale', async () => {
    const mapping = new MemoryMatchMappingRepository()
    const pools = new MemoryTeamPoolRepository()
    // Stored snapshot is a form the source name cannot reach ("V. José da Silva"),
    // but the pack's current full name matches exactly.
    await pools.replaceTeamPlayers('BRA', [svPlayer(10, 'V. José da Silva')])
    await pools.replaceTeamPlayers('MAR', [svPlayer(20, 'Achraf Hakimi')])
    const packNames = new Map([[10, 'Vinicius Junior']])
    const importer = new JsonMatchStatsImporter(mapping, pools, async (playerId) => packNames.get(playerId))
    const result = await importer.resolveMatch({ fixtureId: BRA_MAR_FIXTURE, json: baseJson() })
    expect(result.rows[0].resolution).toEqual({ status: 'resolved', playerId: 10 })
  })

  it('degrades to stored names when the pack lookup throws', async () => {
    const mapping = new MemoryMatchMappingRepository()
    const pools = new MemoryTeamPoolRepository()
    await pools.replaceTeamPlayers('BRA', [svPlayer(10, 'Vinicius Junior')])
    await pools.replaceTeamPlayers('MAR', [svPlayer(20, 'Achraf Hakimi')])
    const importer = new JsonMatchStatsImporter(mapping, pools, async () => {
      throw new Error('pack down')
    })
    const result = await importer.resolveMatch({ fixtureId: BRA_MAR_FIXTURE, json: baseJson() })
    expect(result.rows[0].resolution).toEqual({ status: 'resolved', playerId: 10 })
  })
})
