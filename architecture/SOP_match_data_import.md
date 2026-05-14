# SOP Match Data Import

## Goal

Provide a controlled lifecycle for getting real-world match performance data into
`admin_match_entries` (the table the scoring engine reads), gated by two-admin
verification, so no unreviewed data can reach scoring.

This SOP states the business rules. `import-engine.md` is the architectural and operational
walkthrough — how the parts connect and how every path behaves.

## Scope

In scope:

- The JSON lifecycle inside the platform: upload, review, two-admin confirm, promote.
- The screenshot/JSON adapter — the only concrete import source for now.
- Manual single-row admin entry, routed through the same pending pipeline.

Out of scope:

- Screenshot handling. The platform never receives or stores images. An admin extracts a
  screenshot into JSON using a general-purpose AI assistant on their own machine; the
  platform only ever sees the resulting JSON. A standard extraction prompt template
  (`architecture/match-import-extraction-prompt.md`) is shipped so team members extract
  consistently across whichever assistant they use.
- The scoring rubric (rating-to-performance-points curve, clean-sheet rule). The import
  engine is scoring-neutral and captures raw facts only.
- A concrete API-Football adapter. The importer interface is defined; the API adapter
  stays a documented stub until a data source is team-decided.

## Lifecycle

1. Upload. An admin selects a target fixture from the schedule and submits one JSON
   describing that fixture. One JSON equals one fixture equals one pending batch.
2. Review. The submitted batch lands in the pending tables, never directly in
   `admin_match_entries`. The review UI shows parsed rows, resolved players, and skipped
   players. Rows are editable.
3. Confirm. Two distinct admins confirm the fixture's current data state.
4. Promote. On the second valid confirmation, each resolved row is upserted into
   `admin_match_entries` and the pending batch is cleared.

## Table Model

- Imports land in net-new pending tables. `admin_match_entries` remains the confirmed
  table and is not modified by the import path except for one additive `rating` column.
- The pending batch stores the fixture-level final score (home and away goals) alongside
  the source URL. The score is a fixture-level fact, not per-player, so it lives on the
  batch and is not propagated to `admin_match_entries`. It serves the review-UI result
  display and the clean-sheet judgement, both of which happen in the pending stage.
- The scoring engine continues to read `admin_match_entries` directly and is otherwise
  unaffected.
- Promotion is a plain upsert keyed by `(fixture_id, player_id)`.
- Exactly one path writes `admin_match_entries`: promotion after two confirmations. The
  existing manual single-row admin entry route is repurposed to write into the pending
  pipeline and no longer writes the confirmed table directly. No bypass exists.

## JSON Contract

- The submitted JSON is pure source-transcription: player names, team names, final score,
  per-player minutes, goals, assists, rating, lineup status, and the source URL.
- It carries no application IDs and no derived fields. The server owns player-ID
  resolution, fixture identity, and clean-sheet derivation.
- One JSON describes exactly one complete fixture. Multi-screenshot stitching happens
  outside the platform.
- A payload containing the same player twice in one fixture is rejected loudly, never
  silently deduplicated.
- `clean_sheet_eligible` is not in the JSON; it is a review-UI judgement.

## Fixture Identity

- The admin explicitly selects the target fixture before uploading. Fixture identity comes
  from that selection; there is no name-based fixture inference.
- The server cross-checks the JSON's two team names against the selected fixture's two
  teams. A mismatch is rejected loudly.
- Knockout fixture rows must show the real qualified teams before their stats are imported,
  or the team cross-check and player resolution fail.

## Source URL

- Every screenshot-sourced import records the source URL the screenshot was taken from. It
  is stored with the pending batch and shown as a clickable link in the review UI.
- The platform stores and links the URL only; it never fetches it server-side.
- The manual-entry path has no source URL; it uses a source note instead.

## Player-ID Resolution

- Each source name is normalized (diacritic-insensitive) and resolved to a
  `world_cup_players` record.
- Resolution order: the persisted name-to-player mapping table first, then auto-match
  against the target team's curated player pool, then leave explicitly unresolved.
- The review UI shows the resolved player per row, with display name and portrait, so an
  admin can visually verify the mapping and change it inline.
- A correction in the review UI writes back to the mapping table, so a name never needs
  re-resolving.
- Resolution quality for a team depends on that team's curated pool completeness. A fixture
  for a team with an incomplete pool produces more unresolved rows.

## Unresolved Players

- Rows that resolve are imported; unresolved rows are listed prominently in the review UI
  with a reason. Unresolved rows cannot affect scoring, since only drafted and locked
  players score.
- A name that is genuinely not pool-relevant can be added to a per-team skip list by
  deliberate reviewer action, so it is not re-flagged on every future import. The skip
  list is separate from the name-to-player mapping table and is populated only by explicit
  reviewer choice.

## Clean Sheet

- The JSON carries goals-conceded per team via the final score. The review UI surfaces
  this next to each player row.
- The reviewing admin sets `clean_sheet_eligible` informed by that visible fact. The
  import engine defines no clean-sheet scoring rule and forces no team decision; it
  transcribes the raw input and lets the human apply judgement.

## Confirmation Rules

- Promotion requires two distinct admin confirmations on the fixture's current data state.
- The admin who uploads the batch counts as confirmation number one. A fresh, untouched
  import already holds one confirmation; one more distinct admin must review and confirm.
- Any edit to any row voids all confirmations on that batch, including the uploader's
  implicit one. The batch returns to zero confirmations and must be re-confirmed on the
  new state.
- The most recent editor of a batch cannot be a confirmer of that state. The two
  confirmations must come from two distinct admins, neither being that editor. The
  original uploader remains eligible unless they are themselves the most recent editor.
- Net effect: a clean import needs the uploader plus one other admin; an edited import
  needs two non-editor admins. Either way, at least two distinct humans have signed off on
  the exact data that gets promoted.
- Confirmation state is tracked with a version counter on the pending batch. Every edit
  increments the version, and a confirmation counts toward promotion only if its recorded
  version equals the batch's current version. Confirmation rows are never destroyed, so
  the full history is auditable.

## Re-submission

- Re-submitting a fixture's JSON never writes `admin_match_entries` directly.
- If the fixture is mid-review, the new JSON replaces the pending batch entirely and
  confirmations reset to zero.
- If the fixture is already promoted, re-submission creates a fresh correction batch that
  needs its own two confirmations before it re-promotes over the confirmed rows.
- The uploader is warned before review progress is discarded or already-confirmed data is
  corrected.
- Persisted name mappings and the skip list still apply on re-submission; stat values come
  fresh from the new JSON.

## Preview

- There is no separate validate-only or dry-run mode. The pending stage is the preview:
  submitting JSON creates a pending batch, the review UI shows what would happen, and
  deleting the batch discards it.
- Malformed JSON fails fast with clear errors and creates no pending batch.

## Rating

- `rating`, the source match rating, is captured as a raw fact on the pending row and on
  `admin_match_entries` via a new additive column.
- `performance_points` is derived from `rating`, not typed directly. The
  rating-to-performance-points conversion is part of the scoring rubric and is not
  implemented by the import engine.
- The import engine never computes, shows, or stores a per-player point total. A player's
  points depend on the slot class each participant placed them in, so one match
  performance yields different totals per participant; that is the scoring engine's job.

## API Source Precedence

- If and when an API adapter is implemented, the API becomes the source of truth for match
  data. The JSON path remains a fully self-sufficient, load-bearing path, not a stopgap.
- Even as source of truth, API-imported rows still flow through pending, two-admin
  confirm, promote. Source of truth sets data precedence, not a bypass of the verification
  gate.
- When API data for a fixture is wrong, an admin edits that fixture's data in the pending
  stage; the edit still goes through two-admin confirmation and is audited. This is a
  rare-exception override.

## Audit Logging

Every import-path admin write produces an audit log entry in the same operation:

- match-data import (pending batch creation)
- pending-row edits
- fixture confirmations
- promotion to `admin_match_entries`
- player-name mapping corrections
- skip-list changes
- pending batch discard

Retrofitting audit coverage onto pre-existing un-audited admin writes is out of scope for
this work.

## Known Interactions

- Substitution-rule absence rows. The scoring engine's substitution rule fires on match
  entries with `in_official_squad = false`. The import lifecycle records starters and used
  substitutes only, so every row it promotes has `in_official_squad = true` and the
  substitution rule does not fire from imported data as-is. This is an open interaction
  with the scoring engine, flagged for a later decision.
- Rating-to-performance-points preview. A preview of the performance points a rating will
  yield depends on the scoring rubric's rating curve, which is not yet implemented. Rating
  capture is in place; the preview is added when the curve exists.
