// Value-for-cost math for the Stats › Value tab. Pure helpers (no React) so they unit-test without a render
// and the panel stays a thin view. Everything is derived from the existing /player-points payload — capCost
// is already carried per row — so the Value board needs no new endpoint or query.
import type { PlayerPointsPlayer, SlotClass } from './types'

// Budget cost the value is normalised against: points produced "per 100k of budget spent". 100k keeps the
// numbers readable against the salary table (rating 60 ≈ 1.5k cost, rating 99 ≈ 1.84M).
export const VALUE_COST_UNIT = 100_000

export type ValueMode = 'total' | 'perGame'

// Clean-sheet points this player has banked for the chosen position (0 if they kept none, or the class pays
// nothing). Mirrors the Points tab so a position re-ranks the same base figure.
export function cleanSheetForPosition(player: PlayerPointsPlayer, position: SlotClass): number {
  return player.cleanSheetByPosition.find((entry) => entry.slotClass === position)?.points ?? 0
}

// Position total = position-independent base + that position's accumulated clean sheet (the generalised
// goalkeeper fold from the Results page).
export function totalForPosition(player: PlayerPointsPlayer, position: SlotClass): number {
  return player.basePoints + cleanSheetForPosition(player, position)
}

// Points credited for this position, optionally divided by appearances (per-match).
export function pointsForMode(player: PlayerPointsPlayer, position: SlotClass, mode: ValueMode): number {
  const total = totalForPosition(player, position)
  return mode === 'perGame' ? (player.appearances > 0 ? total / player.appearances : 0) : total
}

// The headline number: points produced per VALUE_COST_UNIT of budget cost. Higher = better value. A zero or
// missing cost yields 0 so a malformed row can never top the board.
export function valuePerCost(points: number, capCost: number): number {
  return capCost > 0 ? (points / capCost) * VALUE_COST_UNIT : 0
}

// The value a player is ranked/shown by for the chosen position and mode.
export function valueForMode(player: PlayerPointsPlayer, position: SlotClass, mode: ValueMode): number {
  return valuePerCost(pointsForMode(player, position, mode), player.capCost)
}

// Compact budget cost for the row sub-line: 1250 → "1.3k", 57506 → "58k", 886002 → "886k", 1837214 → "1.8M".
export function formatCost(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString(undefined, { maximumFractionDigits: value < 100_000 ? 1 : 0 })}k`
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}
