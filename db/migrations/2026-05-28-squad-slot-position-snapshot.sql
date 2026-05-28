-- Snapshot each squad slot's player position codes at slot-write time so the MID clean-sheet
-- bonus (gated on DML/DMR/DMC/DM being among the player's positions) is deterministic for
-- locked squads even if Soccerverse rewrites world_cup_players.position_codes (e.g. the
-- 2026-07-04 season transition). Scoring reads only from this snapshot column.
ALTER TABLE squad_slots ADD COLUMN IF NOT EXISTS position_codes TEXT[] NOT NULL DEFAULT '{}';

UPDATE squad_slots ss
SET position_codes = COALESCE(wcp.position_codes, '{}')
FROM world_cup_players wcp
WHERE wcp.player_id = ss.player_id
  AND ss.position_codes = '{}';

-- Existing deployments already have the scoring row from the previous rubric migration.
-- Keep all other configurable scoring values intact while applying the updated DEF bonus.
UPDATE tournament_config
SET value_json = jsonb_set(value_json, '{cleanSheet,DEF}', '3'::jsonb, true),
    updated_at = NOW()
WHERE key = 'scoring';
