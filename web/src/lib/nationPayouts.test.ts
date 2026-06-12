import { describe, expect, it } from 'vitest'
import { computeNationPayouts } from './nationPayouts'
import type { NationScoreContributor, NationScoreRow } from './types'

function contributor(teamCode: string, index: number): NationScoreContributor {
  return {
    participantId: `${teamCode}-${index}`,
    displayName: `${teamCode} #${index}`,
    leagueType: 'rookie',
    primaryTeamCode: teamCode,
    totalScore: 100 - index,
    rank: index + 1,
  }
}

function nation(teamCode: string, rank: number, managerCount: number): NationScoreRow {
  const contributors = Array.from({ length: managerCount }, (_, i) => contributor(teamCode, i))
  return {
    teamCode,
    participantCount: managerCount,
    averageScore: 0,
    topScore: 0,
    contributors,
    rank,
  }
}

describe('computeNationPayouts', () => {
  it('pays the top three nations from their own pots and nothing trickles when each has 10', () => {
    const rows = [nation('A', 1, 10), nation('B', 2, 10), nation('C', 3, 10), nation('D', 4, 10)]
    const payouts = computeNationPayouts(rows)

    expect(payouts.get('A')).toMatchObject({ status: 'full', paidManagers: 10, perManager: 75, amount: 750 })
    expect(payouts.get('B')).toMatchObject({ status: 'full', paidManagers: 10, perManager: 45, amount: 450 })
    expect(payouts.get('C')).toMatchObject({ status: 'full', paidManagers: 10, perManager: 30, amount: 300 })
    // No top-3 nation under-filled, so there is no leftover to fund rank 4.
    expect(payouts.get('D')).toMatchObject({ status: 'none', paidManagers: 0, amount: 0 })
  })

  it('a top-3 nation always fully pays its managers and caps at 10', () => {
    const rows = [nation('A', 1, 4), nation('B', 2, 15)]
    const payouts = computeNationPayouts(rows)

    // 4 managers, all paid at 75 from its own pot.
    expect(payouts.get('A')).toMatchObject({ status: 'full', paidManagers: 4, managerCount: 4, amount: 300 })
    // 15 managers but only the top 10 are ever paid.
    expect(payouts.get('B')).toMatchObject({ status: 'full', paidManagers: 10, managerCount: 15, amount: 450 })
  })

  it('leftover from an under-filled top-3 nation trickles down at 10 SVV/manager', () => {
    // Rank 1 has 6 managers -> pays 6*75=450, leaves 300 in the pool. Ranks 2/3 full, no spill.
    const rows = [nation('A', 1, 6), nation('B', 2, 10), nation('C', 3, 10), nation('D', 4, 10), nation('E', 5, 10)]
    const payouts = computeNationPayouts(rows)

    expect(payouts.get('A')).toMatchObject({ status: 'full', paidManagers: 6, amount: 450 })
    // 300 leftover = 30 manager-payments. D takes 10 (full, 100), 200 remains; E takes 10 (full, 100).
    expect(payouts.get('D')).toMatchObject({ status: 'full', paidManagers: 10, perManager: 10, amount: 100 })
    expect(payouts.get('E')).toMatchObject({ status: 'full', paidManagers: 10, perManager: 10, amount: 100 })
  })

  it('marks a lower nation partial when the pool runs out mid-nation, then none below', () => {
    // Rank 1 has 8 managers -> 8*75=600, leftover 150 = 15 manager-payments.
    const rows = [nation('A', 1, 8), nation('B', 2, 10), nation('C', 3, 10), nation('D', 4, 10), nation('E', 5, 10), nation('F', 6, 10)]
    const payouts = computeNationPayouts(rows)

    // D takes its full 10 (100), leaving 50 = 5 payments.
    expect(payouts.get('D')).toMatchObject({ status: 'full', paidManagers: 10, amount: 100 })
    // E can only cover 5 of its 10 -> partial.
    expect(payouts.get('E')).toMatchObject({ status: 'partial', paidManagers: 5, managerCount: 10, amount: 50 })
    // Pool exhausted -> F gets nothing.
    expect(payouts.get('F')).toMatchObject({ status: 'none', paidManagers: 0, amount: 0 })
  })

  it('strands a sub-10 remainder (min 10 SVV payout)', () => {
    // Rank 1 has 9 managers -> 9*75=675, leftover 75 = 7 full payments + 5 stranded.
    const rows = [nation('A', 1, 9), nation('B', 2, 10), nation('C', 3, 10), nation('D', 4, 10)]
    const payouts = computeNationPayouts(rows)

    expect(payouts.get('A')).toMatchObject({ status: 'full', paidManagers: 9, amount: 675 })
    // floor(75/10)=7 managers paid; the remaining 5 SVV is below the 10 SVV minimum and is not distributed.
    expect(payouts.get('D')).toMatchObject({ status: 'partial', paidManagers: 7, amount: 70 })
  })

  it('walks the table in rank order regardless of input ordering', () => {
    const rows = [nation('D', 4, 10), nation('A', 1, 5), nation('C', 3, 10), nation('B', 2, 10)]
    const payouts = computeNationPayouts(rows)

    // A is rank 1 despite being second in the array: 5*75=375, leftover 375 = 37 payments.
    expect(payouts.get('A')).toMatchObject({ perManager: 75 })
    expect(payouts.get('D')).toMatchObject({ status: 'full', perManager: 10, amount: 100 })
  })
})
