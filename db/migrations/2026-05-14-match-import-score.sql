-- Persist the fixture-level final score on the pending match batch. The score is a
-- fixture-level fact (not per-player): it drives the review-UI result display and the
-- clean-sheet judgement, both of which happen in the pending stage. It is deliberately
-- not propagated to admin_match_entries. Additive and idempotent.
-- See architecture/SOP_match_data_import.md.

ALTER TABLE pending_match_batches ADD COLUMN IF NOT EXISTS home_goals INTEGER CHECK (home_goals >= 0);
ALTER TABLE pending_match_batches ADD COLUMN IF NOT EXISTS away_goals INTEGER CHECK (away_goals >= 0);
