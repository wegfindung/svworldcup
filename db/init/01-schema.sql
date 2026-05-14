CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tournament_config (
    key TEXT PRIMARY KEY,
    value_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
    code CHAR(3) PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    group_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fixtures (
    fixture_id TEXT PRIMARY KEY,
    group_key TEXT NOT NULL,
    kickoff_date DATE NOT NULL,
    kickoff_time_local TIME NOT NULL,
    home_team_code CHAR(3) NOT NULL REFERENCES teams(code),
    away_team_code CHAR(3) NOT NULL REFERENCES teams(code),
    source TEXT NOT NULL DEFAULT 'user-first-matchday-seed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participants (
    participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    soccerverse_username TEXT,
    referrer_soccerverse_username TEXT,
    league_type TEXT NOT NULL CHECK (league_type IN ('rookie', 'veteran')),
    primary_team_code CHAR(3) NOT NULL REFERENCES teams(code),
    secondary_team_code CHAR(3) REFERENCES teams(code),
    status TEXT NOT NULL CHECK (status IN ('pending_verification', 'active', 'locked', 'withdrawn')),
    password_hash TEXT,
    password_set_at TIMESTAMPTZ,
    reveal_profile BOOLEAN NOT NULL DEFAULT FALSE,
    reveal_squad BOOLEAN NOT NULL DEFAULT FALSE,
    verification_sent_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
    admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS participant_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(admin_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS world_cup_players (
    player_id BIGINT PRIMARY KEY,
    display_name TEXT,
    nationality_code CHAR(3),
    position_codes TEXT[] NOT NULL DEFAULT '{}',
    rating INTEGER,
    position_main TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    source TEXT NOT NULL DEFAULT 'soccerverse',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE world_cup_players ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE world_cup_players ADD COLUMN IF NOT EXISTS position_main TEXT;
ALTER TABLE world_cup_players ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE world_cup_players ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS participant_password_reset_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS world_cup_team_selections (
    selection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_code CHAR(3) NOT NULL REFERENCES teams(code) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES world_cup_players(player_id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_code, player_id)
);

CREATE TABLE IF NOT EXISTS squads (
    squad_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL UNIQUE REFERENCES participants(participant_id) ON DELETE CASCADE,
    budget_limit INTEGER NOT NULL,
    budget_used INTEGER NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squad_slots (
    squad_slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID NOT NULL REFERENCES squads(squad_id) ON DELETE CASCADE,
    slot_key TEXT NOT NULL,
    slot_group TEXT NOT NULL CHECK (slot_group IN ('starter', 'sub')),
    slot_class TEXT NOT NULL CHECK (slot_class IN ('GK', 'DEF', 'MID', 'FWD')),
    player_id BIGINT NOT NULL REFERENCES world_cup_players(player_id),
    UNIQUE (squad_id, slot_key),
    UNIQUE (squad_id, player_id)
);

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
    rating NUMERIC(3,1),
    source_note TEXT NOT NULL DEFAULT 'manual admin entry',
    UNIQUE (fixture_id, player_id)
);

ALTER TABLE admin_match_entries ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1);

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email TEXT NOT NULL,
    action_key TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL CHECK (kind IN ('newsletter', 'autoresponder')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'sending', 'sent')),
    trigger_key TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_key IN ('manual', 'registration_created', 'registration_verified')),
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    audience_status TEXT NOT NULL DEFAULT 'active' CHECK (audience_status IN ('all', 'pending_verification', 'active')),
    scheduled_at TIMESTAMPTZ,
    delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0 AND delay_minutes <= 43200),
    batch_size INTEGER NOT NULL DEFAULT 50 CHECK (batch_size >= 1 AND batch_size <= 500),
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaign_recipients (
    recipient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(campaign_id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(participant_id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    league_type TEXT CHECK (league_type IN ('rookie', 'veteran')),
    primary_team_code CHAR(3),
    secondary_team_code CHAR(3),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, email)
);

CREATE INDEX IF NOT EXISTS email_campaigns_due_idx
    ON email_campaigns (status, scheduled_at)
    WHERE kind = 'newsletter';

CREATE INDEX IF NOT EXISTS email_campaign_recipients_due_idx
    ON email_campaign_recipients (campaign_id, status, queued_at);

-- Match data import engine: pending batch lifecycle + player-name resolution memory.
-- See architecture/SOP_match_data_import.md and db/migrations/2026-05-14-match-data-import.sql.

CREATE TABLE IF NOT EXISTS pending_match_batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id TEXT NOT NULL UNIQUE REFERENCES fixtures(fixture_id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    home_goals INTEGER CHECK (home_goals >= 0),
    away_goals INTEGER CHECK (away_goals >= 0),
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
