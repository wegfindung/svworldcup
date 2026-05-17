import { describe, expect, it } from 'vitest'
import { competitionStartEpoch } from '../data/competitionWindow.js'
import type { SoccerversePlayerRecord, SlotClass } from '../domain/types.js'
import { MemorySquadRepository } from './squadRepository.js'
import { MemoryTeamPoolRepository } from './teamPoolRepository.js'

const slotPlayers: Array<{ playerId: number; slotKey: string; position: string; slotClass: SlotClass }> = [
  { playerId: 101, slotKey: 'starter-gk-1', position: 'GK', slotClass: 'GK' },
  { playerId: 102, slotKey: 'starter-def-1', position: 'CB', slotClass: 'DEF' },
  { playerId: 103, slotKey: 'starter-def-2', position: 'CB', slotClass: 'DEF' },
  { playerId: 104, slotKey: 'starter-def-3', position: 'CB', slotClass: 'DEF' },
  { playerId: 105, slotKey: 'starter-def-4', position: 'CB', slotClass: 'DEF' },
  { playerId: 106, slotKey: 'starter-mid-1', position: 'CM', slotClass: 'MID' },
  { playerId: 107, slotKey: 'starter-mid-2', position: 'CM', slotClass: 'MID' },
  { playerId: 108, slotKey: 'starter-mid-3', position: 'CM', slotClass: 'MID' },
  { playerId: 109, slotKey: 'starter-fwd-1', position: 'ST', slotClass: 'FWD' },
  { playerId: 110, slotKey: 'starter-fwd-2', position: 'ST', slotClass: 'FWD' },
  { playerId: 111, slotKey: 'starter-fwd-3', position: 'ST', slotClass: 'FWD' },
  { playerId: 112, slotKey: 'sub-gk-1', position: 'GK', slotClass: 'GK' },
  { playerId: 113, slotKey: 'sub-def-1', position: 'CB', slotClass: 'DEF' },
  { playerId: 114, slotKey: 'sub-mid-1', position: 'CM', slotClass: 'MID' },
  { playerId: 115, slotKey: 'sub-fwd-1', position: 'ST', slotClass: 'FWD' },
]

function player(playerId: number, position: string): SoccerversePlayerRecord {
  return {
    playerId,
    displayName: `Player ${playerId}`,
    nationalityCode: 'FRA',
    rating: 50,
    clubId: 1,
    positions: [position],
    positionMain: position,
  }
}

async function createLockedSquad(now: () => number) {
  const pools = new MemoryTeamPoolRepository()
  await pools.replaceTeamPlayers(
    'FRA',
    slotPlayers.flatMap((slotPlayer) => [player(slotPlayer.playerId, slotPlayer.position), player(slotPlayer.playerId + 100, slotPlayer.position)]),
  )

  const squads = new MemorySquadRepository(pools, now)
  const participantId = 'participant-1'
  for (const slotPlayer of slotPlayers) {
    await squads.assignPlayer(participantId, { slotKey: slotPlayer.slotKey, playerId: slotPlayer.playerId })
  }
  await squads.lockSquad(participantId)

  return { squads, participantId }
}

describe('MemorySquadRepository competition edit window', () => {
  it('allows submitted squads to be edited before the competition starts', async () => {
    const beforeKickoff = (competitionStartEpoch() ?? Date.now()) - 1_000
    const { squads, participantId } = await createLockedSquad(() => beforeKickoff)

    const afterRemove = await squads.removePlayer(participantId, 'starter-gk-1')
    expect(afterRemove.slots.find((slot) => slot.key === 'starter-gk-1')?.player).toBeNull()

    const afterAssign = await squads.assignPlayer(participantId, { slotKey: 'starter-gk-1', playerId: 201 })
    expect(afterAssign.slots.find((slot) => slot.key === 'starter-gk-1')?.player?.playerId).toBe(201)

    const afterBudgetChange = await squads.setBudget(participantId, 6_000_000)
    expect(afterBudgetChange.budgetLimit).toBe(6_000_000)

    const afterReset = await squads.resetSquad(participantId)
    expect(afterReset.slots.every((slot) => !slot.player)).toBe(true)
  })

  it('blocks submitted squad edits after the competition starts', async () => {
    const start = competitionStartEpoch() ?? Date.now()
    let now = start - 1_000
    const { squads, participantId } = await createLockedSquad(() => now)

    now = start + 1_000

    await expect(squads.removePlayer(participantId, 'starter-gk-1')).rejects.toThrow('competition has started')
  })
})
