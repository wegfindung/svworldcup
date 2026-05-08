# SOP Scoring And Leagues

## Goal

Apply deterministic event scoring with clear separation between rookie/veteran logic and nation tables.

## Base Scoring

- goal: `2`
- assist: `2`
- clean sheet: `3`
- appearance: `0`
- minutes: `0`
- optional admin-entered performance points: `0.5` to `1.0`

## Score Configuration

- Scoring values are stored in backend configuration.
- Admins may change scoring parameters only until the official 2026 World Cup kickoff timestamp.
- Every config change must be audited.

## League Rules

### Rookie

- No ownership bonus.
- Beginner-friendly path for users without a Soccerverse main account.

### Veteran

- Requires Soccerverse username at registration.
- Gets `1%` score bonus for each `10` influence held in a drafted `playerId`.
- Bonus cap: `10%`.

## National Tables

- Each participant chooses one primary country.
- Each participant may choose one optional secondary country.
- Participants contribute to:
- rookie or veteran table
- primary country table
- optional secondary country table

## Substitution Rules

- One substitute per class: `GK`, `DEF`, `MID`, `FWD`.
- A sub scores only when the linked starter is absent from the official match squad list.
- Rotation or benching does not trigger substitution.
- Subs are locked to their slot class.

## Hidden Squad Rules

- Squads are private by default.
- Participants may reveal their own squad.
- Admin can reveal all squads globally at kickoff.

## Edge Cases

- Rookie entries must always have `ownershipBoostPercent = 0`.
- Veteran entries without Soccerverse username are invalid.
- Performance points are optional and admin-supplied only.
- All score calculations must be reproducible from stored match input and scoring config snapshots.
