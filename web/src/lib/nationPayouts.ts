// Live "in the money" computation for the public Nations table.
//
// Mirrors the canonical payout rule in architecture/SOP_scoring_and_leagues.md
// ("Nation winner determination" → "Prize-pool payout"): the Nations pool is a fixed
// $1,500 SVV ($750/$450/$300 for the top three nations). Each top-3 nation pays its
// top <=10 managers at its per-manager rate; any share it cannot use (because it has
// fewer than 10 managers) drops into a leftover pool that walks down the table paying
// lower nations 10 SVV/manager until it can no longer fund a 10 SVV payment.
//
// Computed at render time from the current ranked rows so the indicator tracks live
// rank shifts — see SOP "Nations table in-money indicator (display)". No money is
// minted: lower nations have no own pot, they are funded only from the leftover.

import type { NationScoreRow } from './types'

// Own pots for ranks 1/2/3 (SVV). Ranks 4+ have no pot — leftover-funded only.
export const NATION_POOLS = [750, 450, 300]
// Per-manager rate for any leftover-funded (rank 4+) nation, and the minimum payment unit.
export const TRICKLE_PER_MANAGER = 10
// A nation's pool is split as if it always had 10 managers; only its top 10 are ever paid.
export const NATION_MANAGER_CAP = 10

export type NationPayoutStatus = 'full' | 'partial' | 'none'

export interface NationPayout {
  teamCode: string
  status: NationPayoutStatus
  // How many of the nation's top managers are paid (always <= NATION_MANAGER_CAP).
  paidManagers: number
  // Managers actually attached to the nation (contributors), for the "X of Y" copy.
  managerCount: number
  // SVV each paid manager receives (75/45/30 for the top three, 10 for leftover-funded).
  perManager: number
  // Total SVV paid to this nation (paidManagers * perManager).
  amount: number
}

// Single downward pass of the ranked table. Returns a teamCode -> payout map so the
// caller can look up any row (including search-filtered rows) without re-walking — the
// walk always runs over the full ranked set, never a filtered subset.
export function computeNationPayouts(rows: NationScoreRow[]): Map<string, NationPayout> {
  const ordered = [...rows].sort((a, b) => a.rank - b.rank)
  const payouts = new Map<string, NationPayout>()
  let leftover = 0

  ordered.forEach((row, index) => {
    const managerCount = row.contributors.length
    const eligible = Math.min(managerCount, NATION_MANAGER_CAP)

    if (index < NATION_POOLS.length) {
      // Top-3 nation: paid from its own pot. It always fully pays its eligible managers
      // (the pot covers up to 10 at the rate), and any unused share spills downward.
      const pot = NATION_POOLS[index]
      const perManager = pot / NATION_MANAGER_CAP
      const amount = eligible * perManager
      leftover += pot - amount
      payouts.set(row.teamCode, {
        teamCode: row.teamCode,
        status: 'full',
        paidManagers: eligible,
        managerCount,
        perManager,
        amount,
      })
      return
    }

    // Rank 4+: funded only from the leftover, one manager at a time at the trickle rate.
    const affordable = Math.floor(leftover / TRICKLE_PER_MANAGER)
    const paidManagers = Math.min(eligible, affordable)
    const amount = paidManagers * TRICKLE_PER_MANAGER
    leftover -= amount
    const status: NationPayoutStatus =
      paidManagers === 0 ? 'none' : paidManagers < eligible ? 'partial' : 'full'
    payouts.set(row.teamCode, {
      teamCode: row.teamCode,
      status,
      paidManagers,
      managerCount,
      perManager: TRICKLE_PER_MANAGER,
      amount,
    })
  })

  return payouts
}
