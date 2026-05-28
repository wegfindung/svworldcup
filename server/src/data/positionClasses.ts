import type { SlotClass } from '../domain/types.js'

const slotClassByCode: Record<string, SlotClass> = {
  GK: 'GK',
  RB: 'DEF',
  RWB: 'DEF',
  CB: 'DEF',
  LB: 'DEF',
  LWB: 'DEF',
  SW: 'DEF',
  DMC: 'MID',
  DM: 'MID',
  DMR: 'MID',
  DML: 'MID',
  CM: 'MID',
  AMC: 'MID',
  AM: 'MID',
  AMR: 'MID',
  AML: 'MID',
  RM: 'MID',
  LM: 'MID',
  RW: 'MID',
  LW: 'MID',
  FC: 'FWD',
  FR: 'FWD',
  FL: 'FWD',
  FW: 'FWD',
  ST: 'FWD',
  CF: 'FWD',
  SS: 'FWD',
}

export function getPositionClasses(positionCodes: string[]): SlotClass[] {
  return [...new Set(positionCodes.map((code) => slotClassByCode[code]).filter(Boolean))]
}

export function isEligibleForSlot(positionCodes: string[], slotClass: SlotClass): boolean {
  return getPositionClasses(positionCodes).includes(slotClass)
}

// Defensive midfielder codes that gate the MID clean-sheet bonus. A MID slot only earns the
// configured cleanSheet.MID points when the player's snapshot positions include one of these.
// "DM" (directionless) is included alongside the explicit DML/DMR/DMC variants.
export const DM_BONUS_POSITIONS = ['DML', 'DMR', 'DMC', 'DM'] as const

export function isMidCleanSheetEligible(positionCodes: string[]): boolean {
  return positionCodes.some((code) => DM_BONUS_POSITIONS.includes(code as (typeof DM_BONUS_POSITIONS)[number]))
}
