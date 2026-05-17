-- Rename fixtures.kickoff_time_local to kickoff_time_utc and convert the stored values
-- from Europe/Stockholm (the original ad-hoc convention) to UTC.
--
-- Storage: kickoff_date + kickoff_time_utc describe a UTC instant.
-- Display: frontends format into the viewer's local timezone via toLocaleString.
--
-- NOTE on fixture_id format: existing rows keep their current fixture_id strings.
-- A handful of fixtures (the ones whose Stockholm date wrapped past midnight) have
-- IDs that begin with the Stockholm date even though their stored kickoff_date is
-- now one day earlier under UTC. Greenfield installs (db/init/02-seed-tournament.sql)
-- use UTC-dated IDs throughout. If you want prod IDs to match the greenfield seed,
-- run a separate ops step to rewrite those IDs and cascade to the FK children
-- (admin_match_entries, pending_match_batches, participant_fixture_lineups).

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixtures' AND column_name = 'kickoff_time_local'
  ) THEN
    ALTER TABLE fixtures RENAME COLUMN kickoff_time_local TO kickoff_time_utc;

    -- Treat existing stored (date, time) as Europe/Stockholm wall-clock,
    -- convert to UTC, write back the UTC components.
    UPDATE fixtures
    SET
      kickoff_date = (
        (
          ((kickoff_date::timestamp + kickoff_time_utc::time) AT TIME ZONE 'Europe/Stockholm')
            AT TIME ZONE 'UTC'
        )::date
      ),
      kickoff_time_utc = (
        (
          ((kickoff_date::timestamp + kickoff_time_utc::time) AT TIME ZONE 'Europe/Stockholm')
            AT TIME ZONE 'UTC'
        )::time
      );
  END IF;
END $$;

COMMIT;
