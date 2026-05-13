ALTER TABLE participants
    ADD COLUMN IF NOT EXISTS reveal_profile BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE participants
    ADD COLUMN IF NOT EXISTS reveal_squad BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS admin_match_entries (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id TEXT NOT NULL REFERENCES fixtures(fixture_id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES world_cup_players(player_id),
    in_official_squad BOOLEAN NOT NULL,
    minutes INTEGER NOT NULL CHECK (minutes >= 0 AND minutes <= 130),
    goals INTEGER NOT NULL CHECK (goals >= 0),
    assists INTEGER NOT NULL CHECK (assists >= 0),
    clean_sheet_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    performance_points NUMERIC(3,1),
    source_note TEXT NOT NULL DEFAULT 'manual admin entry',
    UNIQUE (fixture_id, player_id)
);
