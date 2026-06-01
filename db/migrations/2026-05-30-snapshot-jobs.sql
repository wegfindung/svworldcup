-- Durable queue for the veteran influence-snapshot capture. A successful promotion enqueues one job
-- per fixture; an in-process background worker drains pending jobs one at a time, off the request
-- path, instead of running the ~100s Soccerverse capture inline. See SOP_system_overview.md
-- ("Operations Observability") and services/snapshotWorker.ts.
CREATE TABLE IF NOT EXISTS participant_influence_snapshot_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id TEXT NOT NULL REFERENCES fixtures(fixture_id) ON DELETE CASCADE,
    -- pending: waiting to run. running: claimed by the worker. failed: gave up after max attempts
    -- (kept for admin visibility). Done jobs are deleted, so the table stays small.
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The worker claims oldest-pending-first; this index serves both the claim scan and a status filter.
CREATE INDEX IF NOT EXISTS participant_influence_snapshot_jobs_status_created
    ON participant_influence_snapshot_jobs (status, created_at);

-- At most one outstanding (pending OR running) job per fixture, so a re-promotion while a capture is
-- still queued/running does not enqueue a duplicate. A failed job does NOT block a fresh enqueue.
CREATE UNIQUE INDEX IF NOT EXISTS participant_influence_snapshot_jobs_one_outstanding_per_fixture
    ON participant_influence_snapshot_jobs (fixture_id)
    WHERE status IN ('pending', 'running');
