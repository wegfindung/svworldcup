CREATE TABLE IF NOT EXISTS participant_fixture_lineups (
    lineup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
    fixture_id TEXT NOT NULL REFERENCES fixtures(fixture_id) ON DELETE CASCADE,
    budget_limit INTEGER NOT NULL,
    budget_used INTEGER NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (participant_id, fixture_id)
);

CREATE TABLE IF NOT EXISTS participant_fixture_lineup_slots (
    lineup_slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lineup_id UUID NOT NULL REFERENCES participant_fixture_lineups(lineup_id) ON DELETE CASCADE,
    slot_key TEXT NOT NULL,
    slot_group TEXT NOT NULL CHECK (slot_group IN ('starter', 'sub')),
    slot_class TEXT NOT NULL CHECK (slot_class IN ('GK', 'DEF', 'MID', 'FWD')),
    player_id BIGINT NOT NULL REFERENCES world_cup_players(player_id),
    UNIQUE (lineup_id, slot_key),
    UNIQUE (lineup_id, player_id)
);
