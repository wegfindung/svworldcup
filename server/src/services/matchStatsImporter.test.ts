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

describe('JsonMatchStatsImporter', () => {
  it('auto-resolves a player against the team pool', async () => {
    const { importer } = await makeImporter()
    const result = await importer.importMatch({ fixtureId: BRA_MAR_FIXTURE, createdBy: 'a@example.com', json: baseJson() })
    expect(result.batchInput.rows).toHaveLength(1)
    expect(result.batchInput.rows[0].playerId).toBe(10)
    expect(result.batchInput.sourceUrl).toBe('https://x.test/m')
    expect(result.batchInput.homeGoals).toBe(1)
    expect(result.batchInput.awayGoals).toBe(0)
  })

  it('leaves an unknown player unresolved with a null playerId', async () => {
    const { importer } = await makeImporter()
    const json = baseJson()
    json.players[0].name = 'Unknown Newcomer'
    const result = await importer.importMatch({ fixtureId: BRA_MAR_FIXTURE, createdBy: 'a@example.com', json })
    expect(result.batchInput.rows[0].playerId).toBeNull()
  })

  it('skips a name on the skip list and reports it instead of creating a row', async () => {
    const { importer, mapping } = await makeImporter()
    await mapping.addSkipName({ teamCode: 'BRA', normalizedSourceName: 'vinicius junior', createdBy: 'a@example.com' })
    const result = await importer.importMatch({ fixtureId: BRA_MAR_FIXTURE, createdBy: 'a@example.com', json: baseJson() })
    expect(result.batchInput.rows).toHaveLength(0)
    expect(result.skippedNames).toEqual(['Vinicius Junior'])
  })

  it('rejects JSON describing a different fixture than the one selected (D10)', async () => {
    const { importer } = await makeImporter()
    await expect(
      importer.importMatch({ fixtureId: '2026-06-13-d-usa-par', createdBy: 'a@example.com', json: baseJson() }),
    ).rejects.toBeInstanceOf(MatchImportValidationError)
  })

  it('rejects an unknown fixture', async () => {
    const { importer } = await makeImporter()
    await expect(
      importer.importMatch({ fixtureId: 'not-a-fixture', createdBy: 'a@example.com', json: baseJson() }),
    ).rejects.toBeInstanceOf(MatchImportValidationError)
  })
})
