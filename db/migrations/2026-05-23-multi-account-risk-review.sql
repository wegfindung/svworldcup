ALTER TABLE participants ADD COLUMN IF NOT EXISTS email_canonical_hash TEXT;

CREATE INDEX IF NOT EXISTS participants_email_canonical_hash_idx
    ON participants (email_canonical_hash)
    WHERE email_canonical_hash IS NOT NULL;

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
