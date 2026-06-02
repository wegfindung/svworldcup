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
