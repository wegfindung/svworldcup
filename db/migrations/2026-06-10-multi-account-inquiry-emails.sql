CREATE TABLE IF NOT EXISTS participant_risk_inquiry_emails (
    participant_id UUID PRIMARY KEY REFERENCES participants(participant_id) ON DELETE CASCADE,
    first_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_sent_by TEXT NOT NULL,
    last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sent_by TEXT NOT NULL,
    sent_count INTEGER NOT NULL DEFAULT 1 CHECK (sent_count >= 1)
);
