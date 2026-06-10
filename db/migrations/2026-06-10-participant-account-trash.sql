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
