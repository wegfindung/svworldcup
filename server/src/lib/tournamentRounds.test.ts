import { describe, expect, it } from 'vitest'
import { fixtures } from '../data/worldCupSeed.js'
import { allTeamsCompletedNthEpoch, buildFixtureRoundMap, firstKickoffEpochOfRound, getFixtureRound } from './tournamentRounds.js'

const THREE_HOURS_MS = 3 * 60 * 60 * 1000

function iso(epoch: number | null) {
  return epoch === null ? null : new Date(epoch).toISOString()
}

describe('fixture round derivation', () => {
  it('maps a first-matchday fixture to round 1 and a second-matchday fixture to round 2', () => {
    expect(getFixtureRound('2026-06-11-a-mex-rsa', fixtures)).toBe(1)
    expect(getFixtureRound('2026-06-18-a-cze-rsa', fixtures)).toBe(2)
    expect(getFixtureRound('2026-06-19-a-mex-kor', fixtures)).toBe(2)
  })

  it('assigns all 72 group fixtures to rounds 1-3, 24 per round', () => {
    const roundMap = buildFixtureRoundMap(fixtures)
    expect(roundMap.size).toBe(72)
    const counts = new Map<number, number>()
    for (const round of roundMap.values()) {
      counts.set(round, (counts.get(round) ?? 0) + 1)
    }
    expect(counts.get(1)).toBe(24)
    expect(counts.get(2)).toBe(24)
    expect(counts.get(3)).toBe(24)
  })
})

describe('round timing helpers', () => {
  it('round 2 first kickoff is CZE-RSA at 2026-06-18 16:00 UTC', () => {
    expect(iso(firstKickoffEpochOfRound(2, fixtures))).toBe('2026-06-18T16:00:00.000Z')
  })

  it('round 3 first kickoff is 2026-06-24 19:00 UTC', () => {
    expect(iso(firstKickoffEpochOfRound(3, fixtures))).toBe('2026-06-24T19:00:00.000Z')
  })

  it('all teams complete their 1st match (kickoff + 3h) at 2026-06-18 05:00 UTC', () => {
    expect(iso(allTeamsCompletedNthEpoch(1, fixtures, THREE_HOURS_MS))).toBe('2026-06-18T05:00:00.000Z')
  })

  it('all teams complete their 2nd match (kickoff + 3h) at 2026-06-24 05:00 UTC', () => {
    expect(iso(allTeamsCompletedNthEpoch(2, fixtures, THREE_HOURS_MS))).toBe('2026-06-24T05:00:00.000Z')
  })

  it('returns null for a round with no seeded fixtures (knockout not loaded)', () => {
    expect(firstKickoffEpochOfRound(6, fixtures)).toBeNull()
    expect(allTeamsCompletedNthEpoch(4, fixtures, THREE_HOURS_MS)).toBeNull()
  })
})
