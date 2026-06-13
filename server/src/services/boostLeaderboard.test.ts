import { describe, expect, it } from 'vitest'
import { buildBoostLeaderboard } from './boostLeaderboard.js'
import type { ParticipantInfluenceSnapshotRecord, TeamPoolPlayer } from '../domain/types.js'

function player(playerId: number, displayName: string, teamCode = 'BRA'): TeamPoolPlayer {
  return {
    teamCode,
    playerId,
    displayName,
    nationalityCode: teamCode,
    rating: 80,
    capCost: 100_000,
    positions: ['FWD'],
    positionMain: 'FWD',
    positionClasses: ['FWD'],
    imageUrl: '',
  }
}

function snap(
  participantId: string,
  playerId: number,
  netShares: number,
  bonusPercent: number,
  snapshotAt: string,
  fixtureId = 'F1',
): ParticipantInfluenceSnapshotRecord {
  return { participantId, fixtureId, playerId, netShares, bonusPercent, snapshotAt }
}

const pool = new Map<number, TeamPoolPlayer>([
  [1, player(1, 'Mbappe')],
  [2, player(2, 'Bellingham')],
  [3, player(3, 'Ghost')],
])

describe('buildBoostLeaderboard', () => {
  it('sums net shares across competitors and ranks by total, with manager count and combined bonus', () => {
    const payload = buildBoostLeaderboard(
      [
        snap('p1', 1, 200, 10, '2026-06-13T10:00:00Z'),
        snap('p2', 1, 120, 10, '2026-06-13T10:00:00Z'),
        snap('p3', 2, 90, 9, '2026-06-13T10:00:00Z'),
        snap('p1', 2, 50, 5, '2026-06-13T10:00:00Z'),
      ],
      pool,
    )

    expect(payload.items.map((row) => row.playerId)).toEqual([1, 2]) // 320 shares > 140
    const top = payload.items[0]
    expect(top).toMatchObject({ playerId: 1, totalNetShares: 320, managerCount: 2, combinedBonusPercent: 20 })
    expect(payload.items[1]).toMatchObject({ playerId: 2, totalNetShares: 140, managerCount: 2, combinedBonusPercent: 14 })
    expect(payload.summary).toEqual({ playersBoosted: 2, competitorsBoosting: 3, totalNetShares: 460 })
  })

  it('keeps only the latest snapshot per competitor-per-player (current standing, not cumulative)', () => {
    const payload = buildBoostLeaderboard(
      [
        snap('p1', 1, 300, 10, '2026-06-11T10:00:00Z', 'F1'), // earlier fixture
        snap('p1', 1, 80, 8, '2026-06-13T10:00:00Z', 'F2'), // sold down by the latest fixture
      ],
      pool,
    )
    expect(payload.items[0]).toMatchObject({ playerId: 1, totalNetShares: 80, managerCount: 1, combinedBonusPercent: 8 })
  })

  it('ignores zero-boost snapshots and players missing from the pool', () => {
    const payload = buildBoostLeaderboard(
      [
        snap('p1', 1, 0, 0, '2026-06-13T10:00:00Z'), // drafted but not boosted
        snap('p2', 3, 500, 10, '2026-06-13T10:00:00Z'), // player 3 not in pool? it is — use a missing id below
        snap('p2', 99, 500, 10, '2026-06-13T10:00:00Z'), // not in pool → undisplayable
      ],
      pool,
    )
    // Player 3 is in the pool and boosted → it shows; player 99 is dropped; player 1 had zero boost.
    expect(payload.items.map((row) => row.playerId)).toEqual([3])
    expect(payload.summary.competitorsBoosting).toBe(1)
  })

  it('returns an empty board when there are no snapshots', () => {
    const payload = buildBoostLeaderboard([], pool)
    expect(payload).toEqual({ summary: { playersBoosted: 0, competitorsBoosting: 0, totalNetShares: 0 }, items: [] })
  })
})
