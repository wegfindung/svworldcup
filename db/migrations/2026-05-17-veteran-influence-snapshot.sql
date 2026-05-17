CREATE TABLE IF NOT EXISTS veteran_influence_snapshot (
    participant_id UUID NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
    fixture_id TEXT NOT NULL REFERENCES fixtures(fixture_id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES world_cup_players(player_id) ON DELETE CASCADE,
    net_shares INTEGER NOT NULL CHECK (net_shares >= 0),
    bonus_percent INTEGER NOT NULL CHECK (bonus_percent >= 0 AND bonus_percent <= 10),
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (participant_id, fixture_id, player_id)
);

CREATE INDEX IF NOT EXISTS veteran_influence_snapshot_by_fixture
    ON veteran_influence_snapshot (fixture_id);
