# Match Data Import Engine — Operational Walkthrough

This is the architectural and operational companion to `SOP_match_data_import.md`. The SOP
states the business rules; this document explains how the engine is built, how its parts
connect, and how every path — including the failure paths — actually behaves. It is written
so that anyone, human or AI agent, can get a real head start on a bug in this engine without
reverse-engineering the code.

## What the engine does

It moves real-world match performance data into `admin_match_entries` (the table the scoring
engine reads) through a controlled lifecycle: **upload → review → two-admin confirm → promote**.
No unreviewed data can reach scoring. The only data source wired today is a pasted JSON
transcribed from match screenshots by an admin's own AI assistant; the platform never sees an
image.

## Lifecycle

### 1. Upload

`POST /api/admin/match-import/upload` with `{ fixtureId, json, replace? }`.

1. `uploadSchema` (zod) validates the request envelope.
2. `parseMatchImportJson` (zod, `lib/matchImportJson.ts`) validates the pasted JSON against the
   contract shape — see `SOP_match_data_import.md`, "JSON Contract".
3. `assertMatchImportSemantics` checks the cross-field rules: the match names two distinct
   teams, every player's team is one of those two, and no player name appears twice for the
   same team.
4. `JsonMatchStatsImporter.importMatch` (`services/matchStatsImporter.ts`) does the source-
   specific work: the wrong-fixture guard, per-team player resolution, and skip-list filtering
   (see "Player resolution" below). It returns an `ImportedMatch` — a ready-to-create batch
   plus the list of deliberately skipped names.
5. The route calls `createBatch` (or `replaceBatch` when `replace` is true and a batch already
   exists for the fixture) on the `MatchImportRepository`.
6. An `audit_logs` entry is written: `match_import.upload`.

The uploader's act of importing counts as the first confirmation. `createBatch` records it as
a confirmation at data version 1.

### 2. Review

`GET /api/admin/match-import/batches` lists pending batches; `GET .../batches/:batchId` fetches
one. The review UI (`web/src/components/MatchImportReview.tsx`) renders the two lineups side by
side, shows each row's resolved player with portrait and name, flags unresolved rows, links the
source URL, and shows the confirmation status.

Edits in the review stage:

- `PUT .../batches/:batchId/rows/:rowId` — stat-only edit (minutes, goals, assists, rating,
  lineup status, clean-sheet flag). Audited as `match_import.row_edit`.
- `POST .../batches/:batchId/rows/:rowId/resolve` — change the resolved player. This also writes
  the `(team_code, normalized_source_name) → player_id` pair back to `match_import_player_map`,
  so the same source name never needs re-resolving for that team. Audited as
  `match_import.player_map_correction`.
- `POST /skip-names` and `DELETE /skip-names` — add or remove a `(team_code, source_name)` entry
  on the reviewer-driven skip list. Audited as `match_import.skip_name_add` /
  `match_import.skip_name_remove`.

Every edit increments the batch's `data_version` (see "Confirmation state machine").

### 3. Confirm

`POST .../batches/:batchId/confirm`. `canConfirm` (`lib/confirmationRules.ts`) enforces that the
confirming admin is not the most recent editor of the current state and has not already
confirmed the current data version. `addConfirmation` records `(admin_email, data_version)`.
Audited as `match_import.confirm`. The route then calls `promoteBatchIfReady`.

### 4. Promote

`promoteBatchIfReady` (`services/matchPromotion.ts`) runs on every confirmation. When the batch
is promotable — two distinct admins have valid confirmations on the current data version — it:

1. Upserts every **resolved** row into `admin_match_entries` via
   `scoringRepository.upsertMatchEntry` (`in_official_squad = true`, `rating` carried through,
   `source_note = 'imported match data'`). Unresolved rows (null `player_id`) are skipped — they
   cannot affect scoring.
2. Deletes the pending batch.
3. Writes an `audit_logs` entry: `match_import.promote`.

Promotion is the **only** path from this engine into `admin_match_entries`.

## Patterns

### Adapter pattern

`MatchStatsImporter` is an interface with one method, `importMatch()`. `JsonMatchStatsImporter`
is the concrete implementation. `ApiMatchStatsImporter` is a documented stub — the API source is
not team-locked and its response shape is unverified, so it throws until implemented. Any future
source is one more `importMatch()` implementation feeding the same pending → confirm → promote
pipeline; nothing downstream changes.

### Dual-flavour repositories

Every repository is an interface with two implementations: a `Memory*` flavour (in-process maps,
no database) and a `Postgres*` flavour. `services/repos.ts` holds the factories; each picks the
Postgres flavour when a database connection string resolves, otherwise the Memory flavour. The
Memory flavour makes the engine fully testable without a database, and the integration tests run
the real Express routes against Memory repos.

### Two-table model

Imported data lands in net-new **pending** tables. `admin_match_entries` is the **confirmed**
table the scoring engine reads, and the import path never writes it except through promotion.
This is a hard boundary: untrusted imported rows and trusted scoring rows never share a table.

### Confirmation-version state machine

`pending_match_batches.data_version` starts at 1 and increments on every row edit. Each
confirmation row records the `data_version` it was made at. A confirmation counts toward
promotion only if its version equals the batch's current version (`countsTowardPromotion` in
`lib/confirmationRules.ts`). So any edit bumps the version and instantly staleness-voids all
prior confirmations — with no cascade deletes. Confirmation rows are never destroyed, so the
full history ("admin X confirmed v2, then B edited to v3") stays auditable. Promotion requires
two distinct admin emails valid at the current version.

## Player resolution

`resolvePlayer` (`lib/playerResolution.ts`) resolves a screenshot source name to a
`world_cup_players` id for a given team, in this order:

1. The persisted name-to-player mapping table (`match_import_player_map`).
2. The reviewer skip list (`match_import_skip_names`) — a hit means the row is dropped, not
   imported, and reported back in `skippedNames`.
3. Auto-match against the team's curated pool. The v1 confidence bar is an exact normalized-name
   match; a single pool match resolves, multiple matches or none leaves the row explicitly
   unresolved with a reason.

Names are normalized diacritic-insensitively by `lib/normalizeName.ts`. Team names are resolved
to canonical team codes by `lib/teamLookup.ts`, which carries an alias map for source names that
differ from the canonical Grand Tournament names.

## Connections — route → repository → table

| Route | Repository call(s) | Tables touched |
| --- | --- | --- |
| `POST /upload` | `JsonMatchStatsImporter.importMatch`, `MatchImportRepository.createBatch` / `replaceBatch`, `AuditRepository.record` | reads `match_import_player_map`, `match_import_skip_names`, team pool; writes `pending_match_batches`, `pending_match_stat_rows`, `pending_match_confirmations`, `audit_logs` |
| `GET /batches`, `GET /batches/:id` | `MatchImportRepository.listBatches` / `getBatch` | reads pending tables |
| `PUT /batches/:id/rows/:rowId` | `MatchImportRepository.updateRow`, `AuditRepository.record` | writes `pending_match_stat_rows`, `pending_match_batches` (version bump), `audit_logs` |
| `POST /batches/:id/rows/:rowId/resolve` | `MatchImportRepository.updateRow`, `MatchMappingRepository.upsertPlayerMap`, `AuditRepository.record` | writes `pending_match_stat_rows`, `pending_match_batches`, `match_import_player_map`, `audit_logs` |
| `POST /batches/:id/confirm` | `MatchImportRepository.addConfirmation`, `promoteBatchIfReady` → `ScoringRepository.upsertMatchEntry` + `MatchImportRepository.deleteBatch`, `AuditRepository.record` | writes `pending_match_confirmations`, `audit_logs`; on promotion writes `admin_match_entries` and deletes the pending batch |
| `DELETE /batches/:id` | `MatchImportRepository.deleteBatch`, `AuditRepository.record` | deletes pending tables (cascade), writes `audit_logs` |
| `POST /skip-names`, `DELETE /skip-names` | `MatchMappingRepository.addSkipName` / `removeSkipName`, `AuditRepository.record` | writes `match_import_skip_names`, `audit_logs` |

The router (`createMatchImportRouter`, `routes/matchImport.ts`) is a sub-router mounted at
`/match-import` inside the admin router (`routes/admin.ts`), which is mounted under `/api/admin`
and sits behind `requireAdmin`. So every route above requires an authenticated admin session.

After promotion, the scoring engine reads `admin_match_entries` directly through
`ScoringRepository.listMatchEntries` when it calculates leaderboard rows. The import engine has
no further involvement once a batch is promoted.

## Tables

Pending lifecycle:

- `pending_match_batches` — one batch per fixture (`fixture_id` is unique). Holds the source URL,
  the fixture-level final score (`home_goals` / `away_goals`), `data_version`, and the
  created-by / last-edited-by actors.
- `pending_match_stat_rows` — per-player rows in a batch. `player_id` is nullable (null = an
  unresolved row). A partial unique index forbids the same resolved player twice in one batch
  while still allowing multiple unresolved rows.
- `pending_match_confirmations` — `(batch_id, admin_email, data_version)`, unique on that triple.

Resolution memory:

- `match_import_player_map` — persisted `(team_code, normalized_source_name) → player_id`.
- `match_import_skip_names` — reviewer-driven `(team_code, normalized_source_name)` skip list.

Existing tables touched:

- `admin_match_entries` — the confirmed scoring table. The import path added one column,
  `rating`; promotion upserts into it.
- `audit_logs` — append-only; every import-path admin write lands here.

Schema lives in `db/init/01-schema.sql`; the additive migrations are
`db/migrations/2026-05-14-match-data-import.sql` (tables + the `rating` column) and
`db/migrations/2026-05-14-match-import-score.sql` (the batch-level score columns).

## Failure and edge paths

- **Malformed JSON** — fails zod parsing, surfaces as a `ZodError`, the error handler returns
  400, and no pending batch is created.
- **Semantic violations** — duplicate player name in the payload, a player on a team that is not
  in the match, the match naming the same team twice, or JSON describing a different fixture
  than the one selected (the wrong-fixture guard) all raise `MatchImportValidationError`, which
  the error handler maps to 422.
- **Duplicate resolved player in a batch** — `assertNoDuplicatePlayers` in the repository rejects
  it on create and on edit (422). Unresolved rows are exempt; several may coexist.
- **Unresolved players** — rows that do not resolve are still imported, with a null `player_id`,
  and flagged prominently in the review UI. Names on the skip list are dropped before import and
  returned in `skippedNames`. Unresolved rows are skipped at promotion.
- **Re-submission** — `replace: true` makes the upload wholesale-replace the existing pending
  batch as a fresh version 1; without it, an existing batch makes the upload fail with 422.
- **Edit voids confirmations** — any row edit bumps `data_version`, which staleness-voids every
  prior confirmation. The admin who made the edit cannot confirm the state they just produced.
- **Discard** — `DELETE /batches/:id` deletes the pending batch (the child rows and confirmations
  cascade) and is audited as `match_import.discard`.

## Audit actions

Every import-path admin write produces an `audit_logs` entry in the same operation:
`match_import.upload`, `match_import.row_edit`, `match_import.player_map_correction`,
`match_import.confirm`, `match_import.promote`, `match_import.skip_name_add`,
`match_import.skip_name_remove`, `match_import.discard`.

## Known interactions and flags

- **Substitution-rule absence rows.** The scoring engine's substitution rule fires on match
  entries with `in_official_squad = false`. The import lifecycle records starters and used
  substitutes only, so every row it promotes has `in_official_squad = true` and the substitution
  rule does not fire from imported data as-is. This is an open interaction with the scoring
  engine, flagged for a later decision — not yet resolved.
- **Rating-to-performance-points preview.** The review UI is intended to show, next to the rating
  input, the performance points a rating will yield. That conversion is part of the scoring
  rubric's rating curve, which is not yet implemented. Rating capture is in place; the preview is
  added when the curve exists.

## File map

| Concern | File |
| --- | --- |
| Business-rule spec | `architecture/SOP_match_data_import.md` |
| Screenshot-to-JSON prompt template | `architecture/match-import-extraction-prompt.md` |
| HTTP routes | `server/src/routes/matchImport.ts` (mounted by `server/src/routes/admin.ts`) |
| JSON contract + semantic checks | `server/src/lib/matchImportJson.ts` |
| Adapter interface + JSON adapter + API stub | `server/src/services/matchStatsImporter.ts` |
| Promotion orchestration | `server/src/services/matchPromotion.ts` |
| Player resolution | `server/src/lib/playerResolution.ts`, `server/src/lib/normalizeName.ts` |
| Team-name resolution | `server/src/lib/teamLookup.ts` |
| Confirmation state machine | `server/src/lib/confirmationRules.ts` |
| Batch lifecycle repository | `server/src/repositories/matchImportRepository.ts` |
| Resolution-memory repository | `server/src/repositories/matchMappingRepository.ts` |
| Audit repository | `server/src/repositories/auditRepository.ts` |
| Repository factories | `server/src/services/repos.ts` |
| Validation-error mapping | `server/src/middleware/errorHandler.ts`, `server/src/lib/matchImportError.ts` |
| Review UI | `web/src/components/MatchImportPanel.tsx`, `MatchImportReview.tsx`, `MatchImportPlayerRow.tsx` |
| Schema + migrations | `db/init/01-schema.sql`, `db/migrations/2026-05-14-match-data-import.sql`, `db/migrations/2026-05-14-match-import-score.sql` |
