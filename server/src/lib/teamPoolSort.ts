import type { SlotClass, TeamPoolPlayer } from '../domain/types.js'

const slotClassSortOrder: Record<SlotClass, number> = {
  GK: 0,
  DEF: 1,
  MID: 2,
  FWD: 3,
}

const slotClassByPositionCode: Partial<Record<string, SlotClass>> = {
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

function getPrimarySlotClass(player: Pick<TeamPoolPlayer, 'positionMain' | 'positions' | 'positionClasses'>): SlotClass {
  const mainSlotClass = player.positionMain ? slotClassByPositionCode[player.positionMain.trim().toUpperCase()] : undefined
  if (mainSlotClass) {
    return mainSlotClass
  }

  const listedSlotClass = player.positionClasses[0]
  if (listedSlotClass) {
    return listedSlotClass
  }

  for (const positionCode of player.positions) {
    const slotClass = slotClassByPositionCode[positionCode.trim().toUpperCase()]
    if (slotClass) {
      return slotClass
    }
  }

  return 'FWD'
}

export function compareTeamPoolPlayersForBuilder(left: TeamPoolPlayer, right: TeamPoolPlayer) {
  const slotClassOrderDifference = slotClassSortOrder[getPrimarySlotClass(left)] - slotClassSortOrder[getPrimarySlotClass(right)]
  if (slotClassOrderDifference !== 0) {
    return slotClassOrderDifference
  }

  const ratingDifference = right.rating - left.rating
  if (ratingDifference !== 0) {
    return ratingDifference
  }

  const nameDifference = left.displayName.localeCompare(right.displayName, 'en', { sensitivity: 'base' })
  if (nameDifference !== 0) {
    return nameDifference
  }

  return left.playerId - right.playerId
}
