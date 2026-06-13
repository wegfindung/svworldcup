import type { SlotClass, SlotGroup } from './types'

// Client mirror of server/src/data/formation.ts — the squad rules the Best XI optimiser obeys. Kept in sync by
// hand (the two packages don't share code); if the server values change, change these too.
export const MAX_PLAYERS_PER_NATION = 4
export const STARTING_BUDGET = 3_000_000
export const SUBSTITUTE_POINT_WEIGHT = 0.5

export const budgetOptions: Array<{ budgetLimit: number; scoreMultiplier: number }> = [
  { budgetLimit: 1_500_000, scoreMultiplier: 1.5 },
  { budgetLimit: 2_000_000, scoreMultiplier: 1.25 },
  { budgetLimit: 2_500_000, scoreMultiplier: 1.12 },
  { budgetLimit: 3_000_000, scoreMultiplier: 1 },
  { budgetLimit: 3_500_000, scoreMultiplier: 0.87 },
  { budgetLimit: 4_000_000, scoreMultiplier: 0.8 },
  { budgetLimit: 4_500_000, scoreMultiplier: 0.7 },
  { budgetLimit: 5_000_000, scoreMultiplier: 0.6 },
  { budgetLimit: 5_500_000, scoreMultiplier: 0.52 },
  { budgetLimit: 6_000_000, scoreMultiplier: 0.45 },
  { budgetLimit: 8_000_000, scoreMultiplier: 0.28 },
  { budgetLimit: 9_000_000, scoreMultiplier: 0.2 },
]

export interface FormationSlot {
  slotClass: SlotClass
  slotGroup: SlotGroup
}

// 15 slots: 11 starters (1 GK / 4 DEF / 3 MID / 3 FWD) then 4 reserves (1 each). Starters listed first so the
// bench normalisation places the weakest of each class in the trailing reserve slot.
export const formationLayout: FormationSlot[] = [
  { slotClass: 'GK', slotGroup: 'starter' },
  { slotClass: 'DEF', slotGroup: 'starter' },
  { slotClass: 'DEF', slotGroup: 'starter' },
  { slotClass: 'DEF', slotGroup: 'starter' },
  { slotClass: 'DEF', slotGroup: 'starter' },
  { slotClass: 'MID', slotGroup: 'starter' },
  { slotClass: 'MID', slotGroup: 'starter' },
  { slotClass: 'MID', slotGroup: 'starter' },
  { slotClass: 'FWD', slotGroup: 'starter' },
  { slotClass: 'FWD', slotGroup: 'starter' },
  { slotClass: 'FWD', slotGroup: 'starter' },
  { slotClass: 'GK', slotGroup: 'sub' },
  { slotClass: 'DEF', slotGroup: 'sub' },
  { slotClass: 'MID', slotGroup: 'sub' },
  { slotClass: 'FWD', slotGroup: 'sub' },
]
