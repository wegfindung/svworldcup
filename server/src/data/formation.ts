import type { SlotDefinition } from '../domain/types.js'

export const STARTING_BUDGET = 3_000_000

// A squad may contain at most this many players from the same Grand Tournament team (a national team).
// Counts all 15 squad members — starters and reserves alike. See SOP_registration_and_auth.md.
export const MAX_PLAYERS_PER_NATION = 4

// True when adding one more player from `incomingTeamCode` would breach the per-team cap, given the
// team codes already in the squad. Empty/unknown team codes never block a draft (a missing code is
// treated as "no team" and skipped). Pure — callers throw their own SquadValidationError.
export function wouldExceedNationCap(existingTeamCodes: readonly string[], incomingTeamCode: string) {
  if (!incomingTeamCode) {
    return false
  }
  const sameTeam = existingTeamCodes.filter((code) => code === incomingTeamCode).length
  return sameTeam >= MAX_PLAYERS_PER_NATION
}

// The first team code that appears more than MAX_PLAYERS_PER_NATION times in a full squad, or null
// when every team is within the cap. Used as the lock-time backstop. Empty codes are ignored.
export function findNationCapBreach(teamCodes: readonly string[]): string | null {
  const counts = new Map<string, number>()
  for (const code of teamCodes) {
    if (!code) {
      continue
    }
    const next = (counts.get(code) ?? 0) + 1
    if (next > MAX_PLAYERS_PER_NATION) {
      return code
    }
    counts.set(code, next)
  }
  return null
}

export const budgetOptions = [
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
