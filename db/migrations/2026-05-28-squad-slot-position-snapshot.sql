-- Snapshot each squad slot's player position codes at slot-write time so the MID clean-sheet
-- bonus (gated on DML/DMR/DMC/DM being among the player's positions) is deterministic for
-- locked squads even if Soccerverse rewrites world_cup_players.position_codes (e.g. the
-- 2026-07-04 season transition). Scoring reads only from this snapshot column.
ALTER TABLE squad_slots ADD COLUMN IF NOT EXISTS position_codes TEXT[] NOT NULL DEFAULT '{}';
