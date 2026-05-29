-- Player-swap feature: per-round lineup freeze + swap event log.
-- See architecture/SOP_scoring_and_leagues.md "Per-Round Lineup Freeze" and "Player Swaps".

-- Per-round lineup snapshot. One immutable row-set per (squad, round): which 11 of the 15 are
-- starters and which 4 are reserves for that round, plus the frozen position_codes for the MID
-- clean-sheet predicate. round_key is the tournament-wide round ordinal (group matchdays 1/2/3,
-- then knockout rounds 4..N). Scoring resolves a fixture's weight by reading the snapshot with the
-- greatest round_key <= the fixture's round (rounds with no swap window inherit the previous one).
-- Baseline (round 1) is written at squad lock; later rounds are written on swap-commit.
CREATE TABLE IF NOT EXISTS squad_round_lineup (
    squad_id UUID NOT NULL REFERENCES squads(squad_id) ON DELETE CASCADE,
    round_key INTEGER NOT NULL,
    slot_key TEXT NOT NULL,
    slot_group TEXT NOT NULL CHECK (slot_group IN ('starter', 'sub')),
    slot_class TEXT NOT NULL CHECK (slot_class IN ('GK', 'DEF', 'MID', 'FWD')),
    player_id BIGINT NOT NULL REFERENCES world_cup_players(player_id),
    position_codes TEXT[] NOT NULL DEFAULT '{}',
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (squad_id, round_key, slot_key),
    UNIQUE (squad_id, round_key, player_id)
);

CREATE INDEX IF NOT EXISTS squad_round_lineup_by_squad_round
    ON squad_round_lineup (squad_id, round_key);

-- Swap event log: authoritative record of who swapped what, when. Serves as queryable history,
-- the per-window limit counter, and the domain side of the audit trail (an audit_logs row is also
-- written per swap). One row = one reserve<->starter exchange within a slot class:
--   player_in  -> reserve promoted into the starting XI; lands in starter slot slot_in
--   player_out -> starter demoted to the bench;          lands in sub slot slot_out
--   window_key -> the swap window the action was made in (e.g. 'W1'/'W2'/'W3')
--   round_key  -> the round the swap sets the lineup for (the next not-yet-locked round)
CREATE TABLE IF NOT EXISTS squad_swaps (
    swap_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID NOT NULL REFERENCES squads(squad_id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
    window_key TEXT NOT NULL,
    round_key INTEGER NOT NULL,
    slot_class TEXT NOT NULL CHECK (slot_class IN ('GK', 'DEF', 'MID', 'FWD')),
    slot_in TEXT NOT NULL,
    slot_out TEXT NOT NULL,
    player_in BIGINT NOT NULL REFERENCES world_cup_players(player_id),
    player_out BIGINT NOT NULL REFERENCES world_cup_players(player_id),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS squad_swaps_by_participant_window
    ON squad_swaps (participant_id, window_key);
