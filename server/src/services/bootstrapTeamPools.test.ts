import { describe, expect, it, vi } from 'vitest'
import type { SoccerversePlayerRecord } from '../domain/types.js'
import type { TeamPoolRepository } from '../repositories/teamPoolRepository.js'

const fetchPlayersByIds = vi.fn(async (playerIds: number[], countryId?: string) =>
  playerIds.map((playerId) => player(playerId, countryId ?? 'TST')),
)

vi.mock('./soccerverse.js', () => ({
  fetchPlayersByIds,
}))

const { bootstrapInitialTeamPools } = await import('./bootstrapTeamPools.js')
const { initialTeamSelections } = await import('../data/initialTeamSelections.js')
const { getSoccerverseCountryId } = await import('../data/teamCountryMap.js')

function player(playerId: number, nationalityCode: string): SoccerversePlayerRecord {
  return {
    playerId,
    displayName: `Player ${playerId}`,
    nationalityCode,
    rating: 80,
    clubId: 1,
    positions: ['CM'],
    positionMain: 'CM',
  }
}

describe('bootstrapInitialTeamPools', () => {
  it('syncs explicitly curated team selections with their Soccerverse country id', async () => {
    const syncedTeams: string[] = []
    const repository: TeamPoolRepository = {
      storageKind: 'memory',
      listByTeam: vi.fn(async () => []),
      getTeamPlayerById: vi.fn(async () => null),
      getTeamSelectionCounts: vi.fn(async () => ({})),
      replaceTeamPlayers: vi.fn(async (teamCode) => {
        syncedTeams.push(teamCode)
        return []
      }),
      seedTeamPlayersIfEmpty: vi.fn(async () => {}),
    }

    await bootstrapInitialTeamPools(repository)

    const curatedTeamCodes = Object.keys(initialTeamSelections)
    expect(syncedTeams).toEqual(curatedTeamCodes)
    expect(fetchPlayersByIds).toHaveBeenCalledTimes(curatedTeamCodes.length)
    expect(repository.seedTeamPlayersIfEmpty).not.toHaveBeenCalled()
    for (const [index, teamCode] of curatedTeamCodes.entries()) {
      expect(fetchPlayersByIds.mock.calls[index][0]).toEqual(initialTeamSelections[teamCode])
      expect(fetchPlayersByIds.mock.calls[index][1]).toBe(getSoccerverseCountryId(teamCode))
    }
  })
})
