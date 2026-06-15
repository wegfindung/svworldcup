ALTER TABLE admin_match_entries
    ADD COLUMN IF NOT EXISTS lineup_status TEXT NOT NULL DEFAULT 'starter' CHECK (lineup_status IN ('starter', 'substitute'));
