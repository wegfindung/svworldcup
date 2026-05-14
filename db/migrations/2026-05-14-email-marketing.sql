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
