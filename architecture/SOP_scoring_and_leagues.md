# SOP Scoring And Leagues

## Goal

Apply deterministic event scoring with clear separation between rookie/veteran logic and nation tables.

## Base Scoring

All values listed below are stored in scoring configuration; the defaults shown are the team-locked starting values.

Flat values, all positions:

- goal: `5`
- assist: `3`
- appearance: `1` — awarded when `minutes > 0`
- minutes: `1` — awarded when `minutes >= 60`

Clean sheet — per lineup slot class (the slot the player is placed in, not their listed position):

- GK: `4`
- DEF: `4`
- MID: `1`
- FWD: `0`

Performance points — derived from the admin-entered match rating via a continuous piecewise-linear curve:

- anchors: `(6.0 → 0.5)`, `(8.0 → 1.0)`, `(9.5 → 1.5)`, `(10.0 → 2.0)`
- rating below `6.0` → `0`
- rating null / unrated → `0`
- maximum: `2.0`

The admin enters the raw match rating on each player entry; performance points are computed from that rating on every score calculation, so a curve-config change propagates automatically.

## Scoring Slice V1

- Admins can upsert one player match entry per `(fixtureId, playerId)`.
- Player match entries reach `admin_match_entries` only through the match-data import lifecycle (upload, review, two-admin confirm, promote) — see `SOP_match_data_import.md`. The scoring engine reads `admin_match_entries` and is otherwise unaffected by that lifecycle.
- A player entry stores official-squad presence, minutes, goals, assists, clean-sheet eligibility, the match rating, and a source note. Performance points are not stored on the entry; they are derived from the rating via the performance curve at calculation time.
- Public league leaderboards are calculated from locked squads only.
- Starter slots score from their player match entries.
- Substitute slots score only when at least one starter in the same slot class is marked absent from the official squad.
- Nation leaderboards use each participant's full total score for primary and optional secondary nation entries.
- Nations qualify for the public table once they have at least two scored entries.
- The ownership boost is sourced from `participant_influence_snapshot` rows. The `bonusPercent` field on a slot is `0` when no snapshot row exists for that `(participant_id, fixture_id, player_id)` — unlinked Rookies always, linked participants for fixtures not yet promoted, linked participants with zero net post-cutoff buys.

## Late Entry

- A locked squad scores only from fixtures whose kickoff is strictly after the squad's lock timestamp. Earlier fixtures contribute zero score, even if the participant's drafted players appeared in them.
- The lock timestamp is captured on `POST /api/participant/squad/lock` as `squads.locked_at` and is immutable thereafter.
- The cutoff is **strict greater-than** against `fixtures.kickoff`. A fixture whose kickoff equals the lock instant does not score for that participant — eliminates the race-window edge.
- A squad locked before this rule existed has `locked_at = NULL`. NULL is treated as "no cutoff" — every fixture counts. New locks always carry a non-NULL `locked_at`.
- The rule applies uniformly across rookie, veteran, and nation leaderboards, since all three derive from the same per-participant row produced by the scoring engine.
- The substitution rule still operates per fixture inside the eligible set: a sub becomes active only if the linked starter is absent from a fixture that the squad is eligible for.
- The rule is participant-visible in the lock-confirmation copy so a late entrant understands what they will and will not score.

## Score Configuration

- Scoring values are stored in backend configuration.
- Admins may change scoring parameters only until the official 2026 World Cup kickoff timestamp.
- Every config change must be audited.

## League Rules

The two leagues divide the leaderboards (a participant appears on exactly one of the Rookie or Veteran table) but **do not** gate eligibility for the ownership boost. The boost is governed by whether the participant has a linked Soccerverse account, not by their league.

### Rookie

- A participant without a linked Soccerverse account at registration is a Rookie.
- A Rookie may link a Soccerverse account post-registration via `POST /api/participant/link-soccerverse` without being moved into the Veteran league — they keep their Rookie standing on the Rookie table.
- A linked Rookie earns the ownership boost on the same terms as a Veteran (see "Ownership boost" below). An unlinked Rookie earns no boost (no `soccerverse_username`, no snapshot row, `bonusPercent = 0`).

### Veteran

- A participant who registers with a Soccerverse username is a Veteran from registration. An admin may also move a linked Rookie into the Veteran league via `POST /api/admin/participants/:id/league`.
- A participant cannot be a Veteran without a linked Soccerverse account (`soccerverse_username IS NOT NULL` is enforced at the admin move endpoint).
- Veterans earn the ownership boost on the same terms as linked Rookies.

### Ownership boost (Rookie linked or Veteran)

- Gets `1%` score bonus for each `10` **net influence accumulated** in a drafted `playerId` since the participant's cutoff date. Bonus cap: `10%` (saturates at `100` net influence).
- **Cutoff date** per participant: `MAX(participants.created_at, participants.soccerverse_linked_at)` — the later of register-or-link. A participant who links their Soccerverse account weeks after registering starts counting trades from the link timestamp; a Veteran-from-registration starts counting from registration.
- **Net influence**: total `num` of player-share BUYS minus total `num` of player-share SELLS by the participant's `soccerverse_username` for that `playerId`, restricted to trades with `unix_time >= cutoff`. Floored at `0`. Pre-cutoff holdings do not count.
- **Per-fixture snapshot, lazily captured.** When match stats for a fixture are promoted via the match-data import pipeline, the boost is computed for every participant (any league) whose locked squad contains a player from that fixture AND who has a linked Soccerverse account, and stored in `participant_influence_snapshot(participant_id, fixture_id, player_id, bonus_percent)`. The scoring engine reads `bonus_percent` from the snapshot row keyed on `(participant_id, fixture_id, player_id)` and treats a missing row as `0`.
- **Boost is never retroactive.** Past fixtures keep the `bonus_percent` they captured at promotion time even if the participant later buys more shares. Each fixture snapshots independently from the trades that exist by the time that fixture's stats are promoted.

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
- Global reveal controls are stored as event-level configuration and do not mutate individual participant reveal flags.
- Public profile APIs must treat global profile reveal and global squad reveal as visibility overrides while preserving the participant's own reveal state.

## Edge Cases

- A participant without a linked `soccerverse_username` must always have `ownershipBoostPercent = 0` (no snapshot row gets written for them, the scoring engine treats missing as zero).
- Veteran entries without Soccerverse username are invalid (Veteran league membership requires a linked account).
- The match rating is optional. A player entry with no rating yields zero performance points but still earns appearance/minutes/goals/assists/clean-sheet contributions normally.
- All score calculations must be reproducible from stored match input and scoring config snapshots.
