import type { ScoringConfig } from '../domain/types.js'

export const scoringDefaults: ScoringConfig = {
  goal: 5,
  assist: 3,
  appearance: 1,
  minutes: 1,
  cleanSheet: { GK: 4, DEF: 4, MID: 1, FWD: 0 },
  performanceCurve: [
    { rating: 6.0, points: 0.5 },
    { rating: 8.0, points: 1.0 },
    { rating: 9.5, points: 1.5 },
    { rating: 10.0, points: 2.0 },
  ],
}
