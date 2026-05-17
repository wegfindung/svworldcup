-- Rename veteran_influence_snapshot -> participant_influence_snapshot.
--
-- The boost is no longer Veteran-only: any participant with a linked Soccerverse
-- account earns it from post-cutoff net buys, regardless of league_type. The original
-- table name became misleading. Migration must handle two states:
--
--   1. Existing DB that ran 2026-05-17-veteran-influence-snapshot.sql earlier:
--      veteran_influence_snapshot exists; participant_influence_snapshot does not.
--      -> rename the table and its index.
--
--   2. Fresh container: 01-schema.sql created participant_influence_snapshot directly,
--      then 2026-05-17-veteran-influence-snapshot.sql created an empty
--      veteran_influence_snapshot alongside it.
--      -> drop the empty veteran_ table; participant_ already in place.
--
-- ALTER ... IF EXISTS handles re-runs cleanly.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'veteran_influence_snapshot') THEN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'participant_influence_snapshot') THEN
      DROP TABLE veteran_influence_snapshot CASCADE;
    ELSE
      ALTER TABLE veteran_influence_snapshot RENAME TO participant_influence_snapshot;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'veteran_influence_snapshot_by_fixture') THEN
    ALTER INDEX veteran_influence_snapshot_by_fixture RENAME TO participant_influence_snapshot_by_fixture;
  END IF;
END $$;
