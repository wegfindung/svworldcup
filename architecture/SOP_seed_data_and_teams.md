# SOP Seed Data And Teams

## Goal

Maintain deterministic backend seed data for Grand Tournament teams, fixtures, and editable tournament configuration.

## Team Seed Requirements

- Seed all 48 Grand Tournament teams.
- Store English display names in backend seed data.
- Include stable codes/slugs for routing and translation lookup.

## Fixture Seed Requirements

- Seed all 72 group-stage fixtures (12 groups, `A`–`L`).
- Preserve group, kickoff date, kickoff time, and home/away ordering.
- Teams and fixtures are deterministic compile-time seed data; they are not admin-editable at runtime today. If a final official schedule source is later wired in, fixture edits would become an admin-controlled, audited capability.

## Knockout Fixture Derivation

The 32 knockout fixtures (round of 32 → final) are **not** in the group-stage seed. They are **derived
at read time** from results, not seeded rows:

- The fixed bracket lives in `server/src/data/playoffBracket.ts`: `officialRoundOf32Fixtures` + the
  `winnerBracket` pairings, and `knockoutSchedule` — the **canonical source of every knockout match's
  kickoff date + UTC time** (keyed by match number 73–104).
- `services/playoffFixtures.ts → syncDerivedPlayoffFixtures` materializes each knockout fixture once its
  feeder results are final (R32 when the group stage completes; each later round when its two feeders
  finish) and **upserts the derived rows into `fixtures`**. It runs on every public read of
  `/fixtures`, `/match-results`, `/bootstrap` and on match import.
- **Consequence — knockout kickoff times live in code, not the DB.** Because the sync re-asserts the
  `knockoutSchedule` values on every read (`ON CONFLICT DO UPDATE SET kickoff_date/kickoff_time_utc`), a
  manual DB edit of a knockout fixture's time is overwritten on the next read. A knockout time/date
  correction must be made in `knockoutSchedule` and deployed. There is no admin route for kickoff times
  (only official-score and penalty-winner controls).
- **`fixtureId` encodes the kickoff date** (`{date}-{round}-{matchNumber}`, `playoffFixtureId`). An
  optional `idDate` on a schedule slot pins the id to the original date when a correction moves a kickoff
  **across a UTC day boundary** after the fixture was already materialized, so the existing row updates in
  place instead of orphaning as a duplicate (and any already-imported result for it stays linked). A
  same-day time change needs no `idDate`; a brand-new (not-yet-materialized) round takes the corrected
  date cleanly.

## Team Records

Each team record should include:

- `code`
- `slug`
- `nameEn`
- `groupKey`

## Admin Controls

- Admin can preselect Grand Tournament squads by Soccerverse `playerId`.
- Admin can maintain the eligible player pool.
- Candidate search defaults to the team's mapped Soccerverse country, but the admin can widen it to the
  **full player database** via an opt-in flag (`allCountries`). Soccerverse stores exactly one nationality
  per player, yet some players represent a nation in reality that is not their single stored country — a
  country-scoped search can never surface them under that nation. A widened search finds them by name
  regardless of stored country and returns each player's own stored nationality on the record; the
  save-time country-mismatch guard still warns only when a pool is overwhelmingly cross-nation, so adding
  such players is allowed.
- Builder team dropdowns must read from this preselected team pool instead of a free-form nationality search.
- Player identity in the team pool should be enriched with community datapack names and portraits when Soccerverse API records omit names.
- The backend must also support curated external Grand Tournament squad JSON imports when the user provides a reviewed source file.
- Imported players must preserve any provided portrait URL instead of forcing the community portrait host.
- Teams and fixtures are fixed seed constants today, so no admin route mutates them. The editable, audited admin surfaces are the Grand Tournament team player pools (`admin.team_pool_edit`) and the scoring config (`admin.score_config_change`). If team/fixture editing is added later, those changes must be auditable too.

## Data Quality Rules

- No duplicate team codes.
- No duplicate fixture ids.
- Team names in English remain the canonical internal reference.
- Translations are layered on top of canonical English values.
- External squad imports must use an explicit alias map when source country names differ from canonical team names, such as `Türkiye` -> `Turkey` and `DR Congo` -> `Democratic Republic of the Congo`.
