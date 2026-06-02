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
