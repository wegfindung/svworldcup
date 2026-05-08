import type { ScoringConfig } from '../domain/types.js'

export const scoringDefaults: ScoringConfig = {
  goal: 2,
  assist: 2,
  cleanSheet: 3,
  appearance: 0,
  minutes: 0,
  performancePointsMin: 0.5,
  performancePointsMax: 1.0,
}
