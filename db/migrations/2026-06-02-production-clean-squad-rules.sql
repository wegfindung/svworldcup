BEGIN;

WITH invalid_locked_squads AS (
  SELECT squad_id
  FROM squads
  WHERE is_locked = TRUE
    AND locked_at IS NULL
)
DELETE FROM squad_swaps sw
USING invalid_locked_squads invalid
WHERE sw.squad_id = invalid.squad_id;

WITH invalid_locked_squads AS (
  SELECT squad_id
  FROM squads
  WHERE is_locked = TRUE
    AND locked_at IS NULL
)
DELETE FROM squad_round_lineup rl
USING invalid_locked_squads invalid
WHERE rl.squad_id = invalid.squad_id;

UPDATE squads
SET is_locked = FALSE,
    updated_at = NOW()
WHERE is_locked = TRUE
  AND locked_at IS NULL;

WITH ranked_team_selections AS (
  SELECT
    selection_id,
    ROW_NUMBER() OVER (
      PARTITION BY player_id
      ORDER BY updated_at DESC, created_at DESC, team_code ASC, selection_id ASC
    ) AS rank
  FROM world_cup_team_selections
)
DELETE FROM world_cup_team_selections selection
USING ranked_team_selections ranked
WHERE selection.selection_id = ranked.selection_id
  AND ranked.rank > 1;

WITH slot_team AS (
  SELECT
    s.squad_id,
    COALESCE(ts.team_code, p.nationality_code) AS team_code
  FROM squad_slots ss
  JOIN squads s ON s.squad_id = ss.squad_id
  JOIN world_cup_players p ON p.player_id = ss.player_id
  LEFT JOIN world_cup_team_selections ts ON ts.player_id = ss.player_id
  WHERE s.is_locked = TRUE
),
violating_squads AS (
  SELECT squad_id
  FROM slot_team
  WHERE COALESCE(team_code, '') <> ''
  GROUP BY squad_id, team_code
  HAVING COUNT(*) > 4
)
DELETE FROM squad_swaps sw
USING violating_squads v
WHERE sw.squad_id = v.squad_id;

WITH slot_team AS (
  SELECT
    s.squad_id,
    COALESCE(ts.team_code, p.nationality_code) AS team_code
  FROM squad_slots ss
  JOIN squads s ON s.squad_id = ss.squad_id
  JOIN world_cup_players p ON p.player_id = ss.player_id
  LEFT JOIN world_cup_team_selections ts ON ts.player_id = ss.player_id
  WHERE s.is_locked = TRUE
),
violating_squads AS (
  SELECT squad_id
  FROM slot_team
  WHERE COALESCE(team_code, '') <> ''
  GROUP BY squad_id, team_code
  HAVING COUNT(*) > 4
)
DELETE FROM squad_round_lineup rl
USING violating_squads v
WHERE rl.squad_id = v.squad_id;

WITH slot_team AS (
  SELECT
    s.squad_id,
    COALESCE(ts.team_code, p.nationality_code) AS team_code
  FROM squad_slots ss
  JOIN squads s ON s.squad_id = ss.squad_id
  JOIN world_cup_players p ON p.player_id = ss.player_id
  LEFT JOIN world_cup_team_selections ts ON ts.player_id = ss.player_id
  WHERE s.is_locked = TRUE
),
violating_squads AS (
  SELECT squad_id
  FROM slot_team
  WHERE COALESCE(team_code, '') <> ''
  GROUP BY squad_id, team_code
  HAVING COUNT(*) > 4
)
UPDATE squads s
SET is_locked = FALSE,
    locked_at = NULL,
    updated_at = NOW()
FROM violating_squads v
WHERE s.squad_id = v.squad_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'world_cup_team_selections_player_id_key'
      AND conrelid = 'world_cup_team_selections'::regclass
  ) THEN
    ALTER TABLE world_cup_team_selections
      ADD CONSTRAINT world_cup_team_selections_player_id_key UNIQUE (player_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'squads_locked_at_required_chk'
      AND conrelid = 'squads'::regclass
  ) THEN
    ALTER TABLE squads
      ADD CONSTRAINT squads_locked_at_required_chk CHECK (is_locked = FALSE OR locked_at IS NOT NULL);
  END IF;
END $$;

COMMIT;
