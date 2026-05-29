import type { SlotClass, SlotGroup } from '../domain/types.js'
import { SwapValidationError } from './swapGate.js'

// A single slot in a lineup composition: the player occupying it plus the slot's fixed shape.
// positionCodes travel with the player (they drive the MID clean-sheet predicate).
export interface LineupSlot {
  slotKey: string
  slotGroup: SlotGroup
  slotClass: SlotClass
  playerId: number
  positionCodes: string[]
}

export interface AppliedSwap {
  slots: LineupSlot[] // the new 15-slot composition
  slotIn: string // the starter slot now holding the promoted reserve
  slotOut: string // the sub slot now holding the demoted starter
  slotClass: SlotClass
}

// Apply one reserve<->starter exchange to a lineup. playerIn (a current reserve) moves into the
// starter slot; playerOut (a current starter of the same class) moves into the reserve slot. The
// slot shapes (slotGroup/slotClass per slotKey) are unchanged — only the occupying player and its
// position codes move. Throws SwapValidationError if the move is not a valid same-class swap.
export function applySwap(current: LineupSlot[], playerInId: number, playerOutId: number): AppliedSwap {
  if (playerInId === playerOutId) {
    throw new SwapValidationError('A player cannot be swapped with themselves.')
  }

  const inSlot = current.find((slot) => slot.playerId === playerInId)
  const outSlot = current.find((slot) => slot.playerId === playerOutId)

  if (!inSlot) {
    throw new SwapValidationError('The player to bring on is not in your squad.')
  }
  if (!outSlot) {
    throw new SwapValidationError('The player to take off is not in your squad.')
  }
  if (inSlot.slotGroup !== 'sub') {
    throw new SwapValidationError('The player to bring on must currently be a reserve.')
  }
  if (outSlot.slotGroup !== 'starter') {
    throw new SwapValidationError('The player to take off must currently be a starter.')
  }
  if (inSlot.slotClass !== outSlot.slotClass) {
    throw new SwapValidationError('Players can only be swapped within the same position class.')
  }

  const slots = current.map((slot) => {
    if (slot.slotKey === outSlot.slotKey) {
      return { ...slot, playerId: playerInId, positionCodes: inSlot.positionCodes }
    }
    if (slot.slotKey === inSlot.slotKey) {
      return { ...slot, playerId: playerOutId, positionCodes: outSlot.positionCodes }
    }
    return slot
  })

  return { slots, slotIn: outSlot.slotKey, slotOut: inSlot.slotKey, slotClass: inSlot.slotClass }
}
