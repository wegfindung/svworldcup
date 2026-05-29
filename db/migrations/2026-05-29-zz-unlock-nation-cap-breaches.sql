BEGIN;

WITH slot_team AS (
  SELECT
    s.squad_id,
    COALESCE(ts.team_code, p.nationality_code) AS team_code
  FROM squad_slots ss
  JOIN squads s ON s.squad_id = ss.squad_id
  JOIN world_cup_players p ON p.player_id = ss.player_id
  LEFT JOIN LATERAL (
    SELECT team_code
    FROM world_cup_team_selections
    WHERE player_id = ss.player_id
    ORDER BY team_code
    LIMIT 1
  ) ts ON TRUE
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
  LEFT JOIN LATERAL (
    SELECT team_code
    FROM world_cup_team_selections
    WHERE player_id = ss.player_id
    ORDER BY team_code
    LIMIT 1
  ) ts ON TRUE
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
  LEFT JOIN LATERAL (
    SELECT team_code
    FROM world_cup_team_selections
    WHERE player_id = ss.player_id
    ORDER BY team_code
    LIMIT 1
  ) ts ON TRUE
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

COMMIT;
