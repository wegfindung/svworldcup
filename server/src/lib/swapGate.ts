import type { FixtureSeed } from '../domain/types.js'
import { getOpenSwapWindow, hasSwapHardStopPassed, isNationInMatch, type SwapWindow } from '../data/swapWindows.js'

// The dedicated gate for player swaps. A swap is a separate mutation path that deliberately does NOT
// go through assertSquadEditable (which forbids edits after registration close / competition start to
// protect wage fairness). A swap re-prices nothing, so it is exempt; instead it must satisfy the five
// conditions below. See architecture/SOP_scoring_and_leagues.md "The assertSwapAllowed gate".

export class SwapValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SwapValidationError'
  }
}

export interface SwapGateContext {
  // Squad must be locked and complete (all 15 slots filled).
  isLocked: boolean
  isComplete: boolean
  // The two players' nation codes (the reserve coming on + the starter going off).
  nationsInvolved: string[]
  // How many swaps this participant has already made in the currently open window.
  swapsUsedInWindow: number
  now: number
  fixtures?: FixtureSeed[]
}

// Returns the open swap window the action belongs to, or throws SwapValidationError. The returned
// window carries targetRound (the round the swap sets the lineup for) and swapLimit.
export function assertSwapAllowed(context: SwapGateContext): SwapWindow {
  const { isLocked, isComplete, nationsInvolved, swapsUsedInWindow, now, fixtures } = context

  if (!isLocked || !isComplete) {
    throw new SwapValidationError('Squad must be locked and complete before players can be swapped.')
  }

  if (hasSwapHardStopPassed(now, fixtures)) {
    throw new SwapValidationError('Swaps are closed for the rest of the tournament.')
  }

  const window = getOpenSwapWindow(now, fixtures)
  if (!window) {
    throw new SwapValidationError('No swap window is currently open.')
  }

  for (const nation of nationsInvolved) {
    if (isNationInMatch(nation, now, fixtures)) {
      throw new SwapValidationError(`${nation} is currently playing — that player cannot be swapped until the match has finished.`)
    }
  }

  if (swapsUsedInWindow >= window.swapLimit) {
    throw new SwapValidationError(`Swap limit reached for this window (${window.swapLimit}).`)
  }

  return window
}
