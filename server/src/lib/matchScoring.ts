import { isMidCleanSheetEligible } from '../data/positionClasses.js'
import type { PerformanceCurveAnchor, ScoringConfig, SlotClass } from '../domain/types.js'

// The squad-independent point components of one match entry. Shared by the scoring engine
// (scoringRepository.ts) and the public results page (services/matchResults.ts) so both derive
// identical numbers from the same rating/event data. The clean-sheet component is NOT here: it
// depends on the slot class the player is placed in (see cleanSheetPointsForClass).

export function derivePerformancePoints(rating: number | undefined, curve: PerformanceCurveAnchor[]) {
  if (rating === undefined || Number.isNaN(rating)) {
    return 0
  }
  if (curve.length === 0) {
    return 0
  }
  if (rating < curve[0].rating) {
    return 0
  }
  const lastIndex = curve.length - 1
  if (rating >= curve[lastIndex].rating) {
    return curve[lastIndex].points
  }
  for (let i = 0; i < lastIndex; i += 1) {
    const lower = curve[i]
    const upper = curve[i + 1]
    if (rating >= lower.rating && rating <= upper.rating) {
      const span = upper.rating - lower.rating
      const t = span === 0 ? 0 : (rating - lower.rating) / span
      return lower.points + t * (upper.points - lower.points)
    }
  }
  return 0
}

// Minimal shape needed to score an entry's squad-independent components.
export interface ScorableEntry {
  goals: number
  assists: number
  minutes: number
  rating?: number
}

export function scoreEntryComponents(entry: ScorableEntry, scoring: ScoringConfig) {
  const goals = entry.goals * scoring.goal
  const assists = entry.assists * scoring.assist
  const appearance = entry.minutes > 0 ? scoring.appearance : 0
  const minutes = entry.minutes >= 60 ? scoring.minutes : 0
  const performance = derivePerformancePoints(entry.rating, scoring.performanceCurve)

  return {
    goals,
    assists,
    appearance,
    minutes,
    performance,
    total: goals + assists + appearance + minutes + performance,
  }
}

// Clean-sheet points a player would earn IF placed in the given slot class (before any reserve
// half-weight). GK/DEF/FWD pay the flat configured value; a MID slot pays its value only when the
// player's position codes include a defensive-midfielder variant (DML/DMR/DMC/DM), else 0. This
// mirrors the scoring engine's per-slot clean-sheet rule for a weight of 1.
export function cleanSheetPointsForClass(scoring: ScoringConfig, slotClass: SlotClass, positionCodes: string[]): number {
  const slotEarns = slotClass !== 'MID' || isMidCleanSheetEligible(positionCodes)
  return slotEarns ? scoring.cleanSheet[slotClass] : 0
}
