-- Scoring rubric reshape: per-class clean sheet + rating-derived performance curve.
-- Overwrites any existing 'scoring' row to match the new ScoringConfig shape; the previous
-- shape (scalar cleanSheet, performancePointsMin/Max) is incompatible with the current code.
-- Idempotent: re-running sets value_json to the same JSON.

INSERT INTO tournament_config (key, value_json, updated_at)
VALUES (
  'scoring',
  '{
    "goal": 5,
    "assist": 3,
    "appearance": 1,
    "minutes": 1,
    "cleanSheet": { "GK": 4, "DEF": 4, "MID": 1, "FWD": 0 },
    "performanceCurve": [
      { "rating": 6.0,  "points": 0.5 },
      { "rating": 8.0,  "points": 1.0 },
      { "rating": 9.5,  "points": 1.5 },
      { "rating": 10.0, "points": 2.0 }
    ]
  }'::jsonb,
  NOW()
)
ON CONFLICT (key)
DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = NOW();
