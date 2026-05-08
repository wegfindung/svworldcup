# SOP Seed Data And Teams

## Goal

Maintain deterministic backend seed data for World Cup teams, fixtures, and editable tournament configuration.

## Team Seed Requirements

- Seed all teams from the provided first matchday list.
- Store English display names in backend seed data.
- Include stable codes/slugs for routing and translation lookup.

## Fixture Seed Requirements

- Seed the provided opening matchday fixtures.
- Preserve group, kickoff date, kickoff time, and home/away ordering.
- Treat imported fixture data as editable admin-controlled seed data until a final official schedule source is chosen.

## Team Records

Each team record should include:

- `code`
- `slug`
- `nameEn`
- `groupKey`
- `isSeededFromUserInput`

## Admin Controls

- Admin can preselect World Cup squads by Soccerverse `playerId`.
- Admin can maintain the eligible player pool.
- Builder team dropdowns must read from this preselected team pool instead of a free-form nationality search.
- Player identity in the team pool should be enriched with community datapack names and portraits when Soccerverse API records omit names.
- Admin changes to seeded teams/fixtures must be auditable.

## Data Quality Rules

- No duplicate team codes.
- No duplicate fixture ids.
- Team names in English remain the canonical internal reference.
- Translations are layered on top of canonical English values.
