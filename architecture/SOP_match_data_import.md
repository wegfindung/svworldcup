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

1. Upload. An admin selects a target fixture from the schedule, then submits that fixture's
   data as either JSON or CSV/TSV. The submission is first parsed and resolved without
   persisting anything; the admin resolves or skips every player row, and only a fully
   resolved submission is persisted as a pending batch. One submission equals one fixture
   equals one pending batch.
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
  display and the clean-sheet judgement, both of which happen in the pending stage. On
  promotion the same score is additionally captured as a public-display override (see
  "Official Scoreline Override"); that copy survives the batch delete so the results page can
  show the true scoreline even when an own goal or skipped scorer makes the per-player goal
  sum read low.
- The scoring engine continues to read `admin_match_entries` directly and is otherwise
  unaffected.
- Promotion is a plain upsert keyed by `(fixture_id, player_id)`.
- Exactly one path writes `admin_match_entries`: promotion after two confirmations. No
  bypass exists.
- Promotion runs under a fixture-scoped Postgres advisory lock (`pg_try_advisory_lock`), so two
  admins confirming the same batch at the same moment can't both pass the promotable check and
  double-promote (which would write duplicate audit rows). The second caller skips cleanly.
- The promotion loop runs as a single all-or-nothing transaction. The fixture-scoped advisory lock
  and the transaction share one connection: `ScoringRepository.withFixtureLock` checks out a client,
  takes the advisory lock, then wraps the work in `BEGIN`/`COMMIT` and passes that client to every
  write as an `executor`. The three promotion writes — each resolved row's upsert into
  `admin_match_entries`, the pending-batch delete, and the `match_import.promote` audit row —
  therefore commit together or not at all. A failure anywhere rolls the whole set back, leaving the
  pending batch intact; re-running promotion completes it cleanly (the upserts stay idempotent
  `(fixture_id, player_id)` upserts). The Memory repository has no real transaction (single test
  process) and just runs the work.
- To keep the public board from showing a half-promoted fixture, promotion suppresses the per-row
  leaderboard-cache invalidation and invalidates the board ONCE, after the transaction COMMITs.
  Invalidating only after commit avoids the cache-ordering trap where a concurrent read could
  otherwise re-cache pre-commit rows. So the board flips atomically on a fully successful promotion;
  a rolled-back promotion never invalidates. (This also removes the redundant N recomputes a
  multi-row promotion would otherwise trigger.)
- After a successful promotion the confirm route enqueues a **durable** veteran influence-snapshot job
  for the fixture (`participant_influence_snapshot_jobs`) instead of running the ~100 s Soccerverse
  capture inline. An in-process background worker drains the queue off the request path, one fixture at
  a time — see `SOP_system_overview.md` "Operations Observability". Enqueue happens after the
  promotion transaction commits; the rare commit-then-crash-before-enqueue gap self-heals on the next
  (idempotent) re-promote.

## Input Contract

A fixture's data is submitted in one of two formats. Both are pure source-transcription:
they carry no application IDs and no derived fields. The server owns player-ID resolution,
fixture identity, and clean-sheet derivation. One submission describes exactly one complete
fixture; multi-screenshot stitching happens outside the platform.

- **JSON.** A single object with a `match` block (home and away team names, final score,
  source URL) and a `players` array (per-player name, team, lineup status, minutes, goals,
  assists, rating).
- **CSV/TSV.** A pure player-rows table — one row per player, the same per-player fields as
  the JSON `players` array. The delimiter (tab or comma) is auto-detected. A header row
  naming the columns is required, so column order is free and a missing or misnamed column
  fails loudly rather than mis-mapping silently. The match-level fields (final score, source
  URL) are not in the paste; the admin supplies them in form fields, and the home and away
  teams come from the selected fixture.
- **Provider feed CSV.** The official tournament data feed (one CSV per fixture, downloaded
  from the provider) is accepted as-is through the same CSV upload path and is auto-detected
  by its header: a `player` column instead of `name`. Its column set is `fixture_id, kickoff,
  round, team, player, position, minutes, goals, assists, shots, shots_on_target, passes,
  key_passes, tackles, saves, yellow_cards, red_cards, rating`; columns beyond the shared
  per-player fields are ignored. The file lists each side's full matchday squad, so rows with
  an empty `minutes` cell (players who did not play) are dropped at parse and never enter the
  batch. Empty `goals`/`assists`/`rating` cells on a played row read as zero. The feed carries
  no lineup-status column, so starter vs substitute is derived per team — the eleven
  most-played rows are marked starters, the rest used substitutes. The derivation is
  display/validation only: scoring ignores lineup status (promotion writes
  `in_official_squad = true` on every row), and a reviewer can correct any row's status in
  review. Match-level fields work exactly like the manual CSV path: final score and source
  URL come from the form fields, the two teams from the selected fixture; the feed's own
  `fixture_id`/`kickoff`/`round` columns are ignored.

Common to both:

- A submission naming the same player twice for one team is rejected loudly, never silently
  deduplicated.
- A submission listing more than eleven starters for either team is rejected loudly. The
  starting lineup is fixed at eleven players; used substitutes are not capped.
- `clean_sheet_eligible` is never in the submission; it is auto-derived at finalize (60+ minutes
  AND the team conceded none) and admin-overridable in review (see "Clean Sheet").

## Fixture Identity

- The admin explicitly selects the target fixture before uploading. Fixture identity comes
  from that selection; there is no name-based fixture inference.
- For a JSON submission, the server cross-checks the JSON's two team names against the
  selected fixture's two teams; a mismatch is rejected loudly. A CSV/TSV submission carries
  no match-level team names — the two teams come from the selected fixture directly — so
  instead every player row's team is validated against the fixture's two teams.
- Knockout fixture rows must show the real qualified teams before their stats are imported,
  or the team cross-check and player resolution fail.
- Team names are matched through a shared normalizer (`lib/normalizeName.ts`, used by
  `lib/teamLookup.ts → resolveTeamCode`): diacritic- and case-insensitive, punctuation
  collapsed to spaces, and **`&` treated as `and`** — so `Bosnia & Herzegovina` and
  `Bosnia and Herzegovina` resolve to the same team, in either direction (the normalizer runs
  on both the canonical seed name and the source name). A short alias table in `teamLookup.ts`
  covers source-name variants the normalizer can't bridge on its own (`Türkiye`/`Turkey` → TUR,
  `DR Congo` → COD, `USA`).

## Source URL

- Every import records the source URL the data was taken from — the provenance link the
  second confirming admin checks the data against. It is stored with the pending batch and
  shown as a clickable link in the review UI.
- For a JSON submission the source URL may be given either in the JSON's `match` block or
  in a source URL form field; the form field takes precedence when both are present, and a
  submission with neither is rejected. For a CSV/TSV submission the admin supplies it in a
  form field.
- The platform stores and links the URL only; it never fetches it server-side.

## Player-ID Resolution

- Each source name is normalized (diacritic-insensitive) and resolved to a
  `world_cup_players` record.
- Resolution order: the persisted name-to-player mapping table first, then the reviewer
  skip list (a hit drops the row from the import), then auto-match against the target team's
  curated player pool, then leave explicitly unresolved.
- Pool auto-match considers up to two names per pool player: the stored display name
  (snapshotted from the community datapack at curation time — older pack versions were
  abbreviated, e.g. "C. Montes") and, when reachable, the player's **current community-pack
  name** (full real names, e.g. "César Montes Castro"), fetched in-memory at import time.
  The pack lookup is an enrichment only: if the pack is unavailable, resolution degrades to
  the stored names — never fails the import.
- Pool auto-match has two tiers over those candidate names. First an exact normalized-name
  match. If that finds nothing, a conservative **name-form match** bridges the remaining
  form gaps between provider data ("César Montes", "Luis Chávez") and abbreviated
  ("C. Montes") or extended ("Luis Chávez Magallón", "Julián Quiñones Quiñones",
  "César Montes Castro") stored or pack names: a candidate fits when its initial+surname
  form matches the source name (matching first-letter initial and identical trailing
  surname tokens, either direction), or when one name's token list is a strict prefix of
  the other's. Either tier resolves ONLY when exactly one pool player fits — two or more
  candidates leave the row explicitly unresolved for the admin.
- A name-form match can in principle pick a same-surname, same-initial namesake; the
  resolve stage shows every resolved player (name and portrait) before anything persists,
  and the two-admin confirmation still gates promotion — a wrong match is corrected
  inline, which also writes the persistent mapping.
- The review UI shows the resolved player per row, with display name and portrait, so an
  admin can visually verify the mapping and change it inline.
- A correction in the review UI writes back to the mapping table, so a name never needs
  re-resolving.
- Resolution quality for a team depends on that team's curated pool completeness. A fixture
  for a team with an incomplete pool produces more unresolved rows.

## Unresolved Players

- Every player row must end in one of two states before a submission can be persisted:
  resolved to a real `world_cup_players` record, or explicitly skipped. A submission with
  any still-unresolved row cannot be saved as a pending batch, so an incomplete report can
  never reach review, confirmation, or promotion.
- Resolution happens in the pre-persist stage (see Preview). The submission is parsed and
  auto-resolved without writing anything; the admin then resolves or skips every
  outstanding row, and only the fully resolved result is persisted.
- An unresolved row is cleared in the pre-persist resolve stage in one of two ways: skipped
  for this submission only, or added to the per-team skip list. Both drop the player from the
  submission so the row simply does not enter the batch; the skip-list entry additionally
  means the name is auto-skipped on every future import, so a genuinely not-pool-relevant
  name is not re-flagged. The skip list is separate from the name-to-player mapping table and
  is populated only by explicit reviewer choice in the resolve stage.
- When a name has no `world_cup_players` record at all, the intended workflow is to curate
  the player into that team's pool and re-submit, so auto-resolution picks them up.

## Clean Sheet

- The JSON carries goals-conceded per team via the final score. The review UI surfaces
  this next to each player row.
- `clean_sheet_eligible` is **auto-derived at finalize**: it is `true` when the player lasted
  60+ minutes (post-edit minutes) **and** their team conceded none — the opposing side's goals
  from the final score, mapped via the fixture's home/away team codes. The final score is used
  rather than summing per-player goals because own goals are the known weak point in feed data.
- The reviewing admin can **override** `clean_sheet_eligible` per player in review, before
  promotion (`UpdateMatchRowInput.clean_sheet_eligible`), to correct own-goal / feed mistakes;
  that manual value wins over the derivation. The pending batch is deleted on promote, so there
  is no post-promotion per-row override path.
- Position is not gated here: forwards earn zero clean-sheet points regardless, and MID slots
  earn the configured `+1` only when their snapshot positions include `DML`/`DMR`/`DMC`/`DM`
  — both decisions live in the scoring engine via the slot-class weight and the MID DM-eligibility
  predicate (`SOP_scoring_and_leagues.md`).

## Official Scoreline Override

- The public results page derives a fixture's scoreline from the **sum of promoted players'
  goals** per team. That sum is correct only when every goal is credited to a promoted player
  on the scoring team. An **own goal** (credited to no player) or a **skipped/unresolved
  scorer** makes it read low — e.g. a real 4–1 with one own goal shows as 3–1.
- The fix is a per-fixture **scoreline override**: the true home/away goals, stored as a
  display-only correction that the results page prefers over the derived sum. It does **not**
  touch scoring — no player banks goal-points for an opponent's own goal, and a skipped real
  scorer must still be resolved so they bank their own goal points (the override corrects the
  scoreline, not the missing resolution).
- Storage reuses the existing `tournament_config` key-value table — no schema change. A single
  `fixture_score_overrides` key holds a `{ fixtureId: { home, away } }` JSONB map. Reads return
  the whole map; writes merge or delete one fixture's entry atomically (`value_json || …` /
  `value_json - key`).
- The override is set two ways:
  - **Automatically on promotion.** After a fixture promotes, the confirm route writes the
    admin-entered final score (already captured on the pending batch) into the override map.
    A normal import therefore needs no extra step — the displayed scoreline matches the typed
    score even with an own goal. The write is post-commit and best-effort (same pattern as the
    influence-snapshot enqueue): a failure only leaves the fixture on the derived sum, fixable
    via the manual control, and never fails the promotion.
  - **Manually.** An admin set/clear control writes or removes one fixture's override directly,
    independent of import. This back-fills a fixture promoted before this rule existed and
    corrects a wrong score. Setting validates the fixture exists and non-negative goal counts;
    clearing reverts the fixture to the derived sum. Both are audited.

## Penalty Shootout Winner

- A knockout fixture that finishes level after extra time is decided by a penalty shootout. The
  shootout result is **not** part of the match-stat data (no player banks a shootout goal — only the
  bracket cares who advanced). Without a way to record it, the only way to make the bracket populate
  was to type a fake extra goal, which then displayed a wrong scoreline (e.g. `2–1` for a match that
  ended `1–1`).
- The fix is a per-fixture **penalty winner**: the team code that won the shootout, stored as a
  display-and-advancement marker that is independent of the scoreline. The real score stays `1–1`;
  the public results page tags the winning team with a `(p)` marker, and the bracket derivation
  advances the penalty winner when the goals are level. It awards **no points** — it is purely the
  shootout outcome.
- Storage reuses the existing `tournament_config` key-value table — no schema change. A single
  `fixture_penalty_winners` key holds a `{ fixtureId: winningTeamCode }` JSONB map, written/cleared
  one fixture at a time atomically (`value_json || …` / `value_json - key`), exactly like the
  scoreline override. It is a **separate** key from `fixture_score_overrides`: a penalty winner can be
  recorded without setting any scoreline, and the two never collide.
- The penalty winner is set **manually only** — match imports carry no shootout data. An admin
  set/clear control (knockout fixtures only) writes the winning side or removes it; setting validates
  the fixture exists and that the team code is one of the fixture's two sides. Both are audited.
- It only takes effect when the score is **level** (`homeGoals === awayGoals`). A non-level knockout
  score already has a winner on goals, so a stray penalty winner is ignored for both display and
  advancement. For a fixture whose own-goal/skip undercount made the level score read wrong, set the
  scoreline override to the true (level) score AND the penalty winner — the two controls are independent.

## Confirmation Rules

- Promotion requires two distinct admin confirmations on the fixture's current data state.
- The admin who uploads the batch counts as confirmation number one. A fresh, untouched
  import already holds one confirmation; one more distinct admin must review and confirm.
- Any edit to any row voids all prior confirmations on that batch, including the
  uploader's implicit one — they no longer count toward the new data state.
- Submitting an edit counts as the editor's confirmation number one on the new data
  state. By submitting the edit, the editor asserts the data is what they believe is
  correct. The editor cannot add a second confirmation on top of that, but they are not
  barred — they are already counted. An edited batch therefore needs exactly one other
  distinct admin to confirm.
- Net effect: a clean import needs the uploader plus one other admin; an edited import
  needs the editor (counted via the edit) plus one other admin. Either way, exactly two
  distinct humans have signed off on the exact data that gets promoted — never three.
- Confirmation state is tracked with a version counter on the pending batch. Every edit
  increments the version, and a confirmation counts toward promotion only if its recorded
  version equals the batch's current version. Confirmation rows are never destroyed, so
  the full history is auditable.

## Re-submission

- Re-submitting a fixture's data never writes `admin_match_entries` directly.
- If the fixture is mid-review, the new submission replaces the pending batch entirely and
  confirmations reset to zero.
- If the fixture is already promoted, re-submission creates a fresh correction batch that
  needs its own two confirmations before it re-promotes over the confirmed rows.
- The uploader is warned before review progress is discarded or already-confirmed data is
  corrected.
- Persisted name mappings and the skip list still apply on re-submission; stat values come
  fresh from the new submission.

## Preview

- Submitting a fixture's data first parses and resolves it without persisting anything. The
  admin sees the parsed rows and their resolution state, resolves or skips every unresolved
  row, and only then is the pending batch persisted. This pre-persist stage is the preview;
  it never writes to the database.
- Malformed input fails fast with clear errors and creates nothing.
- After persistence, the pending batch's review UI remains the place to inspect and edit
  the fixture before the two-admin confirmation; deleting the batch discards it.

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
- official-scoreline override set / clear (the auto-capture on promotion is covered by the
  `match_import.promote` audit row; a manual set or clear is audited separately)
- penalty-shootout winner set / clear (manual only; see "Penalty Shootout Winner")

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
