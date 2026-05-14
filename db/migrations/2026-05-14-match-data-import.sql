-- Match data import engine: pending batch lifecycle + player-name resolution memory.
-- All additive. See architecture/SOP_match_data_import.md.

CREATE TABLE IF NOT EXISTS pending_match_batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id TEXT NOT NULL UNIQUE REFERENCES fixtures(fixture_id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    data_version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    last_edited_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pending_match_stat_rows (
    row_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES pending_match_batches(batch_id) ON DELETE CASCADE,
    source_name TEXT NOT NULL,
    team_code CHAR(3) NOT NULL REFERENCES teams(code),
    player_id BIGINT REFERENCES world_cup_players(player_id),
    lineup_status TEXT NOT NULL CHECK (lineup_status IN ('starter', 'substitute')),
    minutes INTEGER NOT NULL CHECK (minutes >= 0 AND minutes <= 130),
    goals INTEGER NOT NULL CHECK (goals >= 0),
    assists INTEGER NOT NULL CHECK (assists >= 0),
    rating NUMERIC(3,1),
    clean_sheet_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- D4: no duplicate resolved player within a fixture. Partial so multiple unresolved
-- (null player_id) rows are still allowed in the same batch.
CREATE UNIQUE INDEX IF NOT EXISTS pending_match_stat_rows_batch_player_unq
    ON pending_match_stat_rows (batch_id, player_id)
    WHERE player_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pending_match_confirmations (
    confirmation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES pending_match_batches(batch_id) ON DELETE CASCADE,
    admin_email TEXT NOT NULL,
    data_version INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (batch_id, admin_email, data_version)
);

CREATE TABLE IF NOT EXISTS match_import_player_map (
    map_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_code CHAR(3) NOT NULL REFERENCES teams(code) ON DELETE CASCADE,
    normalized_source_name TEXT NOT NULL,
    player_id BIGINT NOT NULL REFERENCES world_cup_players(player_id) ON DELETE CASCADE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_code, normalized_source_name)
);

CREATE TABLE IF NOT EXISTS match_import_skip_names (
    skip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_code CHAR(3) NOT NULL REFERENCES teams(code) ON DELETE CASCADE,
    normalized_source_name TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_code, normalized_source_name)
);

-- D19: rating is a raw captured fact; performance_points derivation is parked scoring work.
ALTER TABLE admin_match_entries ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1);
