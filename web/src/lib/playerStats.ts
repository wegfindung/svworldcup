import type { PlayerPointsCleanSheet, SlotClass } from './types'

// Clean-sheet-earning positions: GK and DEF always, a MID only with a defensive-midfielder code.
const DM_POSITIONS = ['DML', 'DMR', 'DMC', 'DM']

// Whether a player's position can earn clean-sheet points (so a clean-sheet count is meaningful for them).
// Checks ALL of the player's positions, primary or alternate — a forward who can also play DMC qualifies.
export function earnsCleanSheetPosition(positionClasses: SlotClass[], positions: string[]) {
  return (
    positionClasses.includes('GK') ||
    positionClasses.includes('DEF') ||
    (positionClasses.includes('MID') && positions.some((code) => DM_POSITIONS.includes(code)))
  )
}

// A goalkeeper has a single fixed slot class, so their clean sheet is deterministic and folds into the base
// figure (the Results-page goalkeeper fold). Returns base + accumulated GK clean sheet for a single-class
// GK, otherwise the unchanged base (an outfield clean sheet is position-dependent and stays separate).
export function goalkeeperFoldedBase(basePoints: number, cleanSheetByPosition: PlayerPointsCleanSheet[]) {
  if (cleanSheetByPosition.length === 1 && cleanSheetByPosition[0].slotClass === 'GK') {
    return basePoints + cleanSheetByPosition[0].points
  }
  return basePoints
}
