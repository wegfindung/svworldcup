CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
    kickoff_time_utc TIME NOT NULL,
    home_team_code CHAR(3) NOT NULL REFERENCES teams(code),
    away_team_code CHAR(3) NOT NULL REFERENCES teams(code),
    source TEXT NOT NULL DEFAULT 'user-first-matchday-seed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participants (
    participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    email_canonical_hash TEXT,
    display_name TEXT NOT NULL,
    soccerverse_username TEXT,
    referrer_soccerverse_username TEXT,
    marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    marketing_unsubscribed_at TIMESTAMPTZ,
    marketing_unsubscribe_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    browser_locale TEXT NOT NULL DEFAULT 'en' CONSTRAINT participants_browser_locale_chk CHECK (browser_locale IN ('en', 'es', 'it', 'de', 'fr', 'pt', 'ru', 'zh', 'ja')),
    league_type TEXT NOT NULL CHECK (league_type IN ('rookie', 'veteran')),
    -- Nation pick (primary/secondary) is the full Soccerverse nation set, not the 48 WC teams,
    -- so these are free-text nation codes (alpha-2, gb-*, xk) with no FK to teams(code).
    primary_team_code TEXT NOT NULL,
    secondary_team_code TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending_verification', 'active', 'locked', 'withdrawn')),
    password_hash TEXT,
    password_set_at TIMESTAMPTZ,
    reveal_profile BOOLEAN NOT NULL DEFAULT FALSE,
    reveal_squad BOOLEAN NOT NULL DEFAULT FALSE,
    verification_sent_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    soccerverse_linked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE participants ADD COLUMN IF NOT EXISTS email_canonical_hash TEXT;

CREATE INDEX IF NOT EXISTS participants_email_canonical_hash_idx
    ON participants (email_canonical_hash)
    WHERE email_canonical_hash IS NOT NULL;

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
    UNIQUE (team_code, player_id),
    CONSTRAINT world_cup_team_selections_player_id_key UNIQUE (player_id)
);

CREATE TABLE IF NOT EXISTS squads (
    squad_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL UNIQUE REFERENCES participants(participant_id) ON DELETE CASCADE,
    budget_limit INTEGER NOT NULL,
    budget_used INTEGER NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT squads_locked_at_required_chk CHECK (is_locked = FALSE OR locked_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS squad_slots (
    squad_slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID NOT NULL REFERENCES squads(squad_id) ON DELETE CASCADE,
    slot_key TEXT NOT NULL,
    slot_group TEXT NOT NULL CHECK (slot_group IN ('starter', 'sub')),
    slot_class TEXT NOT NULL CHECK (slot_class IN ('GK', 'DEF', 'MID', 'FWD')),
    player_id BIGINT NOT NULL REFERENCES world_cup_players(player_id),
    position_codes TEXT[] NOT NULL DEFAULT '{}',
    UNIQUE (squad_id, slot_key),
    UNIQUE (squad_id, player_id)
);

ALTER TABLE squad_slots ADD COLUMN IF NOT EXISTS position_codes TEXT[] NOT NULL DEFAULT '{}';

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

CREATE TABLE IF NOT EXISTS participant_influence_snapshot (
    participant_id UUID NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
    fixture_id TEXT NOT NULL REFERENCES fixtures(fixture_id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES world_cup_players(player_id) ON DELETE CASCADE,
    net_shares INTEGER NOT NULL CHECK (net_shares >= 0),
    bonus_percent INTEGER NOT NULL CHECK (bonus_percent >= 0 AND bonus_percent <= 10),
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (participant_id, fixture_id, player_id)
);

CREATE INDEX IF NOT EXISTS participant_influence_snapshot_by_fixture
    ON participant_influence_snapshot (fixture_id);

-- Per-round lineup snapshot (player-swap feature). See architecture/SOP_scoring_and_leagues.md
-- "Per-Round Lineup Freeze". round_key is the tournament-wide round ordinal (group matchdays 1/2/3,
-- then knockout rounds 4..N). Scoring reads the snapshot with the greatest round_key <= the
-- fixture's round; rounds with no swap window inherit the previous one. Baseline written at squad
-- lock, later rounds on swap-commit.
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

-- Swap event log (player-swap feature). Authoritative record of who swapped what, when: history,
-- per-window limit counter, and the domain side of the audit trail. One row = one reserve<->starter
-- exchange within a slot class (player_in promoted to starter slot slot_in; player_out demoted to
-- sub slot slot_out; round_key = the round the swap sets the lineup for).
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

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email TEXT NOT NULL,
    action_key TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participant_risk_signals (
    signal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('registration', 'login', 'verify', 'squad_lock', 'lineup_lock')),
    email_canonical_hash TEXT,
    email_domain TEXT,
    email_provider TEXT,
    email_is_disposable BOOLEAN NOT NULL DEFAULT FALSE,
    email_mx_status TEXT CHECK (email_mx_status IN ('valid', 'missing', 'timeout', 'error')),
    email_mx_host_count INTEGER CHECK (email_mx_host_count IS NULL OR email_mx_host_count >= 0),
    ip_hash TEXT,
    ipv4_cidr24_hash TEXT,
    ipv4_cidr26_hash TEXT,
    ipv6_cidr64_hash TEXT,
    user_agent_hash TEXT,
    accept_language_hash TEXT,
    accept_language TEXT,
    client_fingerprint_hash TEXT,
    client_fingerprint_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS participant_risk_signals_participant_created_idx
    ON participant_risk_signals (participant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS participant_risk_signals_registration_subnet24_idx
    ON participant_risk_signals (ipv4_cidr24_hash, created_at DESC)
    WHERE event_type = 'registration' AND ipv4_cidr24_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS participant_risk_signals_registration_subnet26_idx
    ON participant_risk_signals (ipv4_cidr26_hash, created_at DESC)
    WHERE event_type = 'registration' AND ipv4_cidr26_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS participant_risk_signals_subnet_user_agent_idx
    ON participant_risk_signals (ipv4_cidr24_hash, user_agent_hash, created_at DESC)
    WHERE ipv4_cidr24_hash IS NOT NULL AND user_agent_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS participant_risk_signals_fingerprint_idx
    ON participant_risk_signals (client_fingerprint_hash, created_at DESC)
    WHERE client_fingerprint_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS participant_risk_cases (
    case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'confirmed', 'dismissed')),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    reason_keys TEXT[] NOT NULL DEFAULT '{}',
    detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    review_note TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS participant_risk_cases_status_score_idx
    ON participant_risk_cases (status, score DESC, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS participant_risk_case_members (
    case_id UUID NOT NULL REFERENCES participant_risk_cases(case_id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
    member_score INTEGER NOT NULL CHECK (member_score >= 0 AND member_score <= 100),
    reason_keys TEXT[] NOT NULL DEFAULT '{}',
    last_signal_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (case_id, participant_id)
);

CREATE INDEX IF NOT EXISTS participant_risk_case_members_participant_idx
    ON participant_risk_case_members (participant_id);

CREATE TABLE IF NOT EXISTS participant_risk_inquiry_emails (
    participant_id UUID PRIMARY KEY REFERENCES participants(participant_id) ON DELETE CASCADE,
    first_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_sent_by TEXT NOT NULL,
    last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sent_by TEXT NOT NULL,
    sent_count INTEGER NOT NULL DEFAULT 1 CHECK (sent_count >= 1)
);

CREATE TABLE IF NOT EXISTS participant_account_trash (
    trash_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
    previous_status TEXT NOT NULL CHECK (previous_status IN ('pending_verification', 'active', 'locked', 'withdrawn')),
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delete_after TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
    deleted_by TEXT NOT NULL,
    reason TEXT,
    restored_at TIMESTAMPTZ,
    restored_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS participant_account_trash_active_idx
    ON participant_account_trash (participant_id)
    WHERE restored_at IS NULL;

CREATE INDEX IF NOT EXISTS participant_account_trash_delete_after_idx
    ON participant_account_trash (delete_after)
    WHERE restored_at IS NULL;

CREATE TABLE IF NOT EXISTS email_campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL CHECK (kind IN ('newsletter', 'autoresponder')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'sending', 'sent')),
    trigger_key TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_key IN ('manual', 'registration_created', 'registration_verified')),
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    subject_by_locale JSONB,
    body_html_by_locale JSONB,
    audience_status TEXT NOT NULL DEFAULT 'active' CHECK (audience_status IN ('all', 'pending_verification', 'active')),
    audience_league TEXT NOT NULL DEFAULT 'all' CHECK (audience_league IN ('all', 'rookie', 'veteran')),
    audience_team_code TEXT,
    audience_referrer TEXT,
    scheduled_at TIMESTAMPTZ,
    delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0 AND delay_minutes <= 43200),
    batch_size INTEGER NOT NULL DEFAULT 50 CHECK (batch_size >= 1 AND batch_size <= 500),
    requires_marketing_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
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
    primary_team_code TEXT,
    secondary_team_code TEXT,
    referrer_soccerverse_username TEXT,
    marketing_unsubscribe_token TEXT,
    browser_locale TEXT CONSTRAINT email_campaign_recipients_browser_locale_chk CHECK (browser_locale IN ('en', 'es', 'it', 'de', 'fr', 'pt', 'ru', 'zh', 'ja')),
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

CREATE TABLE IF NOT EXISTS email_delivery_log (
    delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_delivery_log_sent_at_idx
    ON email_delivery_log (sent_at);

CREATE TABLE IF NOT EXISTS referral_clicks (
    click_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_soccerverse_username TEXT NOT NULL,
    landing_path TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_clicks_referrer_created_idx
    ON referral_clicks (referrer_soccerverse_username, created_at);

CREATE TABLE IF NOT EXISTS landing_page_visits (
    visit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_key TEXT NOT NULL UNIQUE,
    ip_hash TEXT NOT NULL,
    user_agent_hash TEXT,
    first_landing_path TEXT,
    last_landing_path TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hit_count INTEGER NOT NULL DEFAULT 1 CHECK (hit_count >= 1)
);

CREATE INDEX IF NOT EXISTS landing_page_visits_first_seen_idx
    ON landing_page_visits (first_seen_at);

CREATE INDEX IF NOT EXISTS landing_page_visits_last_seen_idx
    ON landing_page_visits (last_seen_at DESC);

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
