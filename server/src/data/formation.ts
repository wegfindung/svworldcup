import type { SlotDefinition } from '../domain/types.js'

export const STARTING_BUDGET = 3_000_000

export const budgetOptions = [
  { budgetLimit: 1_500_000, scoreMultiplier: 1.3 },
  { budgetLimit: 2_000_000, scoreMultiplier: 1.18 },
  { budgetLimit: 2_500_000, scoreMultiplier: 1.08 },
  { budgetLimit: 3_000_000, scoreMultiplier: 1 },
  { budgetLimit: 4_000_000, scoreMultiplier: 0.9 },
  { budgetLimit: 5_000_000, scoreMultiplier: 0.82 },
  { budgetLimit: 6_000_000, scoreMultiplier: 0.75 },
] as const

export function getBudgetOption(budgetLimit: number) {
  return budgetOptions.find((option) => option.budgetLimit === budgetLimit) ?? null
}

export function getScoreMultiplierForBudget(budgetLimit: number) {
  return getBudgetOption(budgetLimit)?.scoreMultiplier ?? 1
}

export const formationSlots: SlotDefinition[] = [
  { key: 'starter-gk-1', slotGroup: 'starter', slotClass: 'GK', order: 1, label: 'Starting GK' },
  { key: 'starter-def-1', slotGroup: 'starter', slotClass: 'DEF', order: 2, label: 'Starting DEF 1' },
  { key: 'starter-def-2', slotGroup: 'starter', slotClass: 'DEF', order: 3, label: 'Starting DEF 2' },
  { key: 'starter-def-3', slotGroup: 'starter', slotClass: 'DEF', order: 4, label: 'Starting DEF 3' },
  { key: 'starter-def-4', slotGroup: 'starter', slotClass: 'DEF', order: 5, label: 'Starting DEF 4' },
  { key: 'starter-mid-1', slotGroup: 'starter', slotClass: 'MID', order: 6, label: 'Starting MID 1' },
  { key: 'starter-mid-2', slotGroup: 'starter', slotClass: 'MID', order: 7, label: 'Starting MID 2' },
  { key: 'starter-mid-3', slotGroup: 'starter', slotClass: 'MID', order: 8, label: 'Starting MID 3' },
  { key: 'starter-fwd-1', slotGroup: 'starter', slotClass: 'FWD', order: 9, label: 'Starting FWD 1' },
  { key: 'starter-fwd-2', slotGroup: 'starter', slotClass: 'FWD', order: 10, label: 'Starting FWD 2' },
  { key: 'starter-fwd-3', slotGroup: 'starter', slotClass: 'FWD', order: 11, label: 'Starting FWD 3' },
  { key: 'sub-gk-1', slotGroup: 'sub', slotClass: 'GK', order: 12, label: 'Reserve GK' },
  { key: 'sub-def-1', slotGroup: 'sub', slotClass: 'DEF', order: 13, label: 'Reserve DEF' },
  { key: 'sub-mid-1', slotGroup: 'sub', slotClass: 'MID', order: 14, label: 'Reserve MID' },
  { key: 'sub-fwd-1', slotGroup: 'sub', slotClass: 'FWD', order: 15, label: 'Reserve FWD' },
]

export function getSlotDefinition(slotKey: string) {
  return formationSlots.find((slot) => slot.key === slotKey) ?? null
}
