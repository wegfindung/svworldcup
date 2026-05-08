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
