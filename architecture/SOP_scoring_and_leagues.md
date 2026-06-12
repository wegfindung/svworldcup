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
- DEF: `3`
- MID: `1` — paid only when the slot's **snapshot** position codes include a defensive midfielder
  variant (`DML`, `DMR`, `DMC`, or plain `DM`). A MID slot whose snapshot does not contain any of
  these earns `0` clean-sheet points regardless of the entry flag.
- FWD: `0`

Clean-sheet points are awarded only when the entry's `clean_sheet_eligible` flag is set. That flag is
auto-derived during match import — `true` when the player lasted 60+ minutes **and** their team conceded
none — and is admin-overridable in review (see `SOP_match_data_import.md` "Clean Sheet"). The scoring
engine itself does not re-check minutes or goals conceded; it trusts the (possibly admin-corrected) flag,
then applies the slot-class weight above, the MID DM-eligibility predicate, and the reserve half-weight
where applicable.

### Position snapshot

Each `squad_slots` row stores `position_codes TEXT[]`, a copy of the player's Soccerverse `positions`
list at the moment the slot was written. The snapshot is refreshed on every slot assign/replace and is
permanently frozen once `assertSquadEditable` blocks further edits (at registration close on
`2026-07-04T00:00:00Z` or at competition start). Each per-round lineup snapshot copies the slot's
frozen `position_codes` forward, so scoring reads the codes from the round snapshot (see "Per-Round
Lineup Freeze"), never the live `world_cup_players.position_codes`. A Soccerverse season-transition
rewrite of positions therefore cannot change which MID slots earn the clean-sheet bonus, in any round.

Performance points — derived from the admin-entered match rating via a continuous piecewise-linear curve:

- anchors: `(6.0 → 0.5)`, `(8.0 → 1.0)`, `(9.5 → 1.5)`, `(10.0 → 2.0)`
- rating below `6.0` → `0`
- rating null / unrated → `0`
- maximum: `2.0`

The admin enters the raw match rating on each player entry; performance points are computed from that rating on every score calculation, so a curve-config change propagates automatically.

## Salary Budget Multiplier

Each participant selects a salary budget when building their squad. The chosen budget sets both the spending cap and a fixed score multiplier applied to the squad's output — spending less earns a points boost, spending more incurs a penalty. This is a deliberate strategic lever: a dream team of high-rated players is allowed, but it scores a fraction of the points it generates.

- The budget options and their multipliers (`server/src/data/formation.ts`, mirrored in `web/src/data/eventConfig.ts`):

  | Budget | Multiplier |
  |---|---|
  | 1,500,000 | 1.50 |
  | 2,000,000 | 1.25 |
  | 2,500,000 | 1.12 |
  | 3,000,000 | 1.00 (default / neutral) |
  | 3,500,000 | 0.87 |
  | 4,000,000 | 0.80 |
  | 4,500,000 | 0.70 |
  | 5,000,000 | 0.60 |
  | 5,500,000 | 0.52 |
  | 6,000,000 | 0.45 |
  | 8,000,000 | 0.28 |
  | 9,000,000 | 0.20 |

- The default budget is `3,000,000` (multiplier `1.00`). A participant changes it via the squad budget endpoint; an unrecognised budget falls back to multiplier `1.00`.
- Order of operations per participant: `totalScore = (baseScore + ownershipBoost) * multiplier`. The multiplier is applied last, to the boosted base — it scales both the rubric points and the ownership boost.
- The multiplier is keyed to the **selected budget tier**, not to actual spend within it: selecting the `9,000,000` budget yields `0.20` even if the squad costs less.

## Scoring Slice V1

- Admins can upsert one player match entry per `(fixtureId, playerId)`.
- Player match entries reach `admin_match_entries` only through the match-data import lifecycle (upload, review, two-admin confirm, promote) — see `SOP_match_data_import.md`. The scoring engine reads `admin_match_entries` and is otherwise unaffected by that lifecycle.
- A player entry stores official-squad presence, minutes, goals, assists, clean-sheet eligibility, the match rating, and a source note. Performance points are not stored on the entry; they are derived from the rating via the performance curve at calculation time.
- Public league leaderboards are calculated from locked squads only.
- Starter/substitute status is read **per round** from the round lineup snapshot, not from the live
  squad slots — see "Per-Round Lineup Freeze". A slot that is a starter in the snapshot for the round
  a fixture belongs to scores at full weight; a substitute slot scores at half weight (`0.5`).
- Substitute slots always score, at half weight: every point a reserve earns from its own match entry is multiplied by `0.5`. There is no auto-activation and no dependency on starter absence or official-squad presence (see "Substitution Rules").
- Nation leaderboards use each participant's full total score for primary and optional secondary nation entries.
- Nations qualify for the public table once they have at least two member entries — counted by participation (`participantCount >= 2`), not by points scored, so two zero-point members still qualify.
- The ownership boost is sourced from `participant_influence_snapshot` rows. The `bonusPercent` field on a slot is `0` when no snapshot row exists for that `(participant_id, fixture_id, player_id)` — unlinked Rookies always, linked participants for fixtures not yet promoted, linked participants with zero net post-cutoff buys.
- **Individual ranking tiebreak:** within the Rookie and Veteran tables, participants level on `totalScore` are ordered by **earliest registration** (`registeredAt`, i.e. `created_at`), then by display name — implemented in `rankParticipants` (`scoringRepository.ts`). A manager who registered earlier outranks a later registrant on the same score, even with an identical squad.

## Public Match Results Page

The public results page (`/match-results`, `services/matchResults.ts → buildPublicFixtureResults`) shows
each promoted player's match performance. It has no squad context, so it cannot show a single per-player
total — a player's banked points depend on the slot class the participant placed them in, the budget
multiplier, the ownership boost, and the reserve half-weight, none of which exist here. The page therefore
splits the scoring into the squad-independent part and the position-dependent part:

- **Base points** (squad-independent, one figure per player): goal, assist, appearance, minutes, and
  performance points, computed from the entry exactly as the scoring engine does (shared helpers in
  `lib/matchScoring.ts`). This is the headline number on each player row.
- **Clean sheet by position** (the only position-dependent component): shown only when the entry's
  `clean_sheet_eligible` flag is set, and only for the slot classes the player actually qualifies for
  (`world_cup_players.positions` → `getPositionClasses`). Each eligible class is paired with the
  clean-sheet points it would earn under the standard rule (GK `4`, DEF `3`, MID `1` only with a
  `DML`/`DMR`/`DMC`/`DM` position, FWD `0`), and a per-position total (`base + that class's clean sheet`).
  A versatile player (e.g. eligible at DEF and a DM-MID) shows one line per eligible class; a single-class
  player shows one line.
- **Goalkeeper fold (display exception):** a goalkeeper qualifies for exactly one slot class (GK), so the
  clean sheet is not slot-ambiguous — it is deterministic. For a single-class GK the clean sheet is folded
  **into** the base figure (`base + GK clean sheet`) on both the results row and the player card, instead
  of being shown as a separate by-position line. The row's "Base" number therefore reads as the keeper's
  full per-match score, and the modal lists the clean sheet as one more factor in the base breakdown.
  Outfield players are unaffected (their clean sheet varies by slot class and stays separate). The CS badge
  still appears on the keeper's row. This is the convention the per-position base-points views follow too:
  once a position is fixed, its clean sheet is deterministic and folds into that position's base figure.
- **Clean-sheet badge:** the row's CS badge appears only when the player would earn clean-sheet points in
  at least one eligible class — i.e. `clean_sheet_eligible` AND some eligible class pays more than `0`. A
  forward (or a non-DM central midfielder with no other eligible class) who kept a clean sheet shows no
  badge, because the clean sheet earns them nothing.

These figures are **base points only**. The page makes clear that a participant's own score additionally
applies their budget multiplier and any ownership boost, and halves for a reserve — so the public number
is intentionally not equal to any individual manager's banked total. This is the same per-participant
divergence the import engine refuses to collapse into one number (`SOP_match_data_import.md` "Rating").

## Stats — Player Points Leaderboard

The public Stats page (`/stats`) has two tabs: **Usage** (revealed-squad pick rate) and **Points**
(`/stats/points`, `services/playerPointsLeaderboard.ts → buildPlayerPointsLeaderboard`, served by
`/api/public/player-points`). The Points tab ranks every player who has a promoted match entry by the base
points they have produced **in a chosen position**:

- Per player, the squad-independent base components (goal/assist/appearance/minutes/performance) are summed
  across all promoted entries using the shared `lib/matchScoring.ts` helpers, so the figures match the
  Results page and the scoring engine exactly.
- The clean sheet is accumulated **per eligible slot class** (`cleanSheetByPosition`). Selecting a position
  tab (GK/DEF/MID/FWD) ranks the players eligible for it by `base + that position's clean sheet`. This is
  the same fold the Results page applies to a goalkeeper, generalised: once the position is fixed the clean
  sheet is deterministic. A versatile player appears under each position they qualify for, with a different
  total in each.
- The list is paginated at 50 players per page and supports a name / team / ID search.
- These are **base points only** — a participant's personal score additionally applies their budget
  multiplier, ownership boost, and reserve half-weight, so the figures here are not any manager's banked
  total (the same caveat as the Results page and the import engine).

## Leaderboard Read Cache

Public leaderboard reads (`/leaderboards/rookie|veteran|nations`) and `/profiles/:slug` are served
from an in-memory read-through cache of the computed participant rows.

- **Compute once per payload.** All three boards derive from a single `calculateRows()` result (the
  6-query + scoring loop). Rookie/veteran/nations no longer recompute independently.
- **The board is a pure function of stored rows** (no wall-clock term), so write-triggered
  invalidation is sufficient for correctness; a short TTL (default 10s) is only a backstop.
- **Invalidation is hooked at the repository layer** — every write method that mutates a board-input
  table clears the cache: squad lock/swap/assign/remove/budget/reset, registration
  create/verify/link-soccerverse/league-change, scoring config change, team-pool re-import, match-entry
  promotion (`upsertMatchEntry`), and the per-fixture influence snapshot upsert. Reveal flags,
  marketing, password, referral, and event-control writes are deliberately not hooked — they do not
  change a board.
- **Profile score reads the cached rows too.** `/profiles/:slug` resolves a participant's rank/score
  by reading the same cached league board (`getLeagueLeaderboard`) and picking their row, rather than
  recomputing a whole league per profile view. Profile score and the public leaderboard therefore
  always derive from one computation and can never diverge.
- **Ordering trap.** The Veteran influence snapshot is written fire-and-forget *after* promotion. The
  snapshot repo's `upsert` invalidates the cache, and a generation guard prevents an in-flight
  recompute (started before the snapshot landed) from caching a board missing the not-yet-written
  bonus. Net: the veteran board self-corrects as soon as each snapshot row lands, never serving stale.
- **Single process only.** The cache is in-process (matches the single-process deployment). If the
  server is ever scaled horizontally, each instance caches independently and the TTL bounds staleness.
- **Tradeoff:** during a snapshot capture the cache is repeatedly invalidated, so reads recompute until
  capture settles — correctness (never stale) over peak performance during that brief window.

## Per-Round Lineup Freeze

The unit of scoring is the **round** (group matchday 1/2/3, then round of 32, round of 16,
quarter-final, semi-final, third-place, final). A fixture's round is the matchday/round it belongs to;
in the group stage both teams in a fixture play the same matchday, so the mapping is unambiguous.

- **One lineup snapshot per round.** For each round, exactly which 11 of a participant's 15 are
  starters (1 GK / 4 DEF / 3 MID / 3 FWD) and which 4 are reserves is captured as a single immutable
  snapshot in `squad_round_lineup`, keyed by `(squad_id, round_key)`. Each snapshot row records the
  slot, slot group (starter/sub), slot class, player, and the `position_codes` that apply for the MID
  clean-sheet predicate.
- **The snapshot locks at the round's first kickoff** and never changes after. This is the FPL
  gameweek-deadline model: every staggered fixture inside a round scores against the one lineup that
  was frozen when the round's first match kicked off.
- **≤ 11 full-point players per round, by construction.** Because each round has exactly one lineup
  snapshot with exactly 11 starters, no participant can earn full points for more than 11 players in a
  round — even across staggered matchdays. A reserve promoted mid-tournament earns full points only
  from the round its promotion takes effect onward, and the starter it replaced drops to half weight
  from that same round; neither banks full points for a round the other already owns.
- **No retroactive recompute.** A swap only sets the lineup for the next round whose first match has
  not yet kicked off. A round whose first match has already started is frozen and is never re-weighted
  by a later swap. This satisfies the rule that already-earned points are never recomputed.
- **As-of-round lookup.** Scoring resolves a fixture's weight and `position_codes` by reading the
  snapshot with the greatest `round_key ≤ the fixture's round`. Rounds with no swap window (e.g. round
  of 32, round of 16) therefore **inherit** the previous round's lineup with no extra rows written.
- **Baseline snapshot at squad lock.** The round-1 baseline is materialized when the squad locks
  (`squads.locked_at`); later snapshots are written when a swap commits for the round that swap
  targets. There is no scheduled job — snapshots exist by the time scoring reads them because they are
  written on the squad-lock and swap-commit paths. A swap targeting a round copies the current lineup
  forward and applies the one slot-group exchange. This mirrors the per-fixture
  `participant_influence_snapshot` read-model one level up (at the round grain).
- The per-round freeze generalises the squad lock to every round: the squad composition is fixed at
  registration close (no wage-affecting edits), and the starter/reserve split is fixed per round at
  that round's first kickoff.

## Late Entry

- A locked squad scores only from fixtures whose kickoff is strictly after the squad's lock timestamp. Earlier fixtures contribute zero score, even if the participant's drafted players appeared in them.
- The lock timestamp is captured on `POST /api/participant/squad/lock` as `squads.locked_at` and is immutable thereafter.
- The cutoff is **strict greater-than** against `fixtures.kickoff`. A fixture whose kickoff equals the lock instant does not score for that participant — eliminates the race-window edge.
- A locked squad must have a non-NULL `locked_at`. Rows without that timestamp are invalid production data and do not score.
- The rule applies uniformly across rookie, veteran, and nation leaderboards, since all three derive from the same per-participant row produced by the scoring engine.
- Reserves score at half weight per fixture inside the eligible set, exactly as in steady state; the late-entry cutoff just controls which fixtures are eligible at all.
- The rule is participant-visible in the lock-confirmation copy so a late entrant understands what they will and will not score.

## Score Configuration

- Scoring values are stored in backend configuration.
- Admins may change scoring parameters only until the official 2026 Grand Tournament kickoff timestamp.
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
- **Net influence**: total `num` of player-share BUYS minus total `num` of player-share SELLS by the participant's `soccerverse_username` for that `playerId`, restricted to trades with `cutoff <= unix_time <= fixture_kickoff`. Floored at `0`. Pre-cutoff holdings do not count, and trades made *after* the fixture's kickoff do not count toward that fixture's snapshot.
- **Per-fixture snapshot, frozen at the fixture's kickoff timestamp.** When match stats for a fixture are promoted via the match-data import pipeline, the boost is computed for every participant (any league) whose locked squad contains a player from that fixture AND who has a linked Soccerverse account, and stored in `participant_influence_snapshot(participant_id, fixture_id, player_id, bonus_percent)`. The scoring engine reads `bonus_percent` from the snapshot row keyed on `(participant_id, fixture_id, player_id)` and treats a missing row as `0`.
- **Time-invariant capture.** Because the trade-history fetch is bounded by `fixture_kickoff` on the upper side, the snapshot is identical regardless of when it is computed — at promotion time, days later, or via an admin re-run. The "frozen at kickoff" semantic is enforced by the data filter, not by the scheduling of the capture job.
- **Boost is never retroactive.** Past fixtures keep the `bonus_percent` they captured. Each fixture snapshots independently from the trades that existed at *that* fixture's kickoff instant; a participant who keeps buying influence sees the new total in subsequent fixtures' snapshots but never on past ones.

### Participant boost view (live, on-demand)

A logged-in participant can see their **current** ownership-boost standing per drafted player. This is a
participant-facing read surface, distinct from the per-fixture scoring snapshot above.

- **Per drafted player it shows:** influence **bought**, influence **sold**, **net** (`max(0, bought −
  sold)`), and the resulting **% boost** (`floor(net / 10)`, capped at `10%`, reached at `100` net). Both
  buys and sells are shown because net — not gross holdings — drives the boost.
- **Counted from the event-link cutoff.** Only influence bought **after the Soccerverse account was
  linked to the event** counts. For a Rookie who links after registering, the cutoff is the link
  timestamp (`soccerverse_linked_at`); influence bought before linking does not count. A Veteran who
  registered already carrying a username has **no separate link timestamp** (`soccerverse_linked_at` is
  null — it is only ever set by the link action), so their cutoff is their registration time. This is the
  same cutoff the per-fixture scoring snapshot uses, so the live view and the points actually scored
  agree on where counting begins.
- **Live, not frozen.** Trades are counted up to **now** (no upper kickoff bound). It is a *current
  standing* indicator, separate from `participant_influence_snapshot`, which freezes each fixture's boost
  at that fixture's kickoff. The view's number for a player can therefore exceed what was actually applied
  to an already-played fixture; the view is informational and **never retroactive** to past scoring. This
  distinction must be surfaced to the participant (a short note), so the live number is not mistaken for
  the frozen per-fixture value.
- **Linked accounts only.** A participant without a linked `soccerverse_username` has no boost; the view
  shows a prompt to link, not numbers.
- **"What is Soccerverse?" explainer (rookies).** Because the boost view is the one participant surface
  driven directly by Soccerverse, it carries an optional info modal for participants who may not know the
  game the event is built on. It is shown **only to Rookies** (`league_type === 'rookie'`); Veterans
  already own a Soccerverse account. The explainer states, in plain language, what Soccerverse is, that
  the event is built on it but **you do not need to play it to take part or compete for prizes**, and that
  prizes are awarded **inside** Soccerverse — so a Soccerverse account is needed to **receive** winnings,
  though a prize can be sold directly to other Soccerverse users straight away. It is purely informational
  (no action) and does not change boost eligibility, which still requires a linked account.
- **Also on the public landing.** The same explainer copy is surfaced on the landing page for **any**
  visitor (newcomer onboarding), independent of login or league — newcomers meet the term "Soccerverse"
  there first. The rookie-only gate above still governs only the in-builder boost-panel instance.
- **On-demand + cached.** Computed on request — one Soccerverse trade-history fetch per drafted player,
  paced by the shared Soccerverse gate — then cached in-process per participant for a short TTL.
  Recomputed when the participant's drafted set changes or on an explicit refresh. It is never computed
  in the background for non-viewers, so it adds no standing load.
- **Expensive endpoint.** The participant boost endpoint carries a tighter per-endpoint rate limit on top
  of the participant limit, since a cold read is uncached and is the costliest participant call.

## National Tables

- Each participant chooses one primary country.
- Each participant may choose one optional secondary country.
- Countries are drawn from the full Soccerverse nation set (`server/src/data/soccerverseNations.ts`), not just the 48 Grand Tournament teams — a participant can represent any nation the game recognises, independent of which Grand Tournament pools they draft from.
- Participants contribute to:
- rookie or veteran table
- primary country table
- optional secondary country table

### Nation winner determination

(Canonical rule — previously only recorded in the stale `gemini.md` §3. Recorded here so the SOP layer owns it.)

- A nation **qualifies** for the public table once it has at least two member entries (`participantCount >= 2`), counted by participation, not by points — two zero-point members still qualify (see "Scoring Slice V1").
- The **winning nation** is the qualified nation with the **highest average score** across its member entries (primary + secondary).
- **Nation tiebreak:** if two or more qualified nations are level on average, the nation containing the **highest individual member score** wins.
- **Prize-pool payout:** each paying nation's pool is split **equally among its top 10 managers**, paid **as if every nation had 10 managers**. If a nation has **fewer than 10** qualifying managers, the leftover share **spills to the next ranked nation(s)**, with a **minimum payout of 10 SVV**. The exact wording mirrors the prize-distribution graphic on the Prizes page: *"Prize distribution equally among top 10 managers of each winning nation. If <10 managers, the budget spills to next ranked nation(s) (min 10 SVV payout)."*
- A participant contributes their **full** total score to both their primary and their optional secondary nation (the contribution is not halved or split between the two).

## Prize Pool

The event has a total prize pool of **$5,000 in Soccerverse Vouchers (SVV)**. **Entry is free — there
is no entry fee.** The full pool activates once the event reaches **1,000 participants**.

The pool is split across the three leaderboards:

| League | Share | Total | Places |
|---|---|---|---|
| Veteran | 50% | $2,500 | 1st $1,000 + shirt · 2nd $500 + lanyard · 3rd $300 + lanyard · 4th–10th $100 each |
| Nations | 30% | $1,500 | Nation champion $750 · runner-up $450 · third place $300 |
| Rookie | 20% | $1,000 | 1st $350 + shirt · 2nd $200 + lanyard · 3rd $100 + lanyard · 4th–10th $50 each |

- The **Veteran** and **Rookie** prizes go to the top finishers on each league leaderboard (ordering
  per "Individual ranking tiebreak").
- The **Nations** pool ($1,500) is awarded by nation rank (champion / runner-up / third); each winning
  nation's amount is then split among its members per "National Tables → Nation winner determination"
  (equally among the top 10 managers, paid as if every nation had 10 managers; if a nation has fewer
  than 10 qualifying managers the leftover spills to the next ranked nation(s), minimum 10 SVV payout).
- These figures are the **canonical source** for the prize copy on `/` and `/prizes`. The prize
  graphic (`web/public/prizes/final_prize_distribution.webp`) mirrors them; if the figures change,
  update this section and the on-site text together.

## Substitution Rules

- One substitute per class: `GK`, `DEF`, `MID`, `FWD`. Subs are locked to their slot class.
- **Every reserve always contributes 50% of the points it earns from its own match entries** — controlled by `SUBSTITUTE_POINT_WEIGHT` in `scoringRepository.ts`. Starters contribute 100%.
- There is no auto-activation: a reserve's contribution does not depend on whether a starter played, was rotated, benched, or absent from the official squad. A reserve with no match entry for a fixture simply scores nothing for it.
- This is a deliberate temporary failsafe. It removes the need for a live player-availability/injury feed (whose data source is not yet guaranteed) and avoids per-matchday activation bookkeeping across a Grand Tournament round's staggered kickoffs. It may be replaced by an availability-driven model later; if so, update `SUBSTITUTE_POINT_WEIGHT` and this section together.
- Point counts on the score breakdown (goals, assists, appearances) remain the true match counts; only the *points* are halved for reserves.

## Player Swaps

A swap is a **mid-tournament reshuffle within the already-drafted 15-man squad**: a manager exchanges a
**reserve** with the **starter of the same slot class** (GK / DEF / MID / FWD — one reserve per class).
The two players trade `slot_group` (starter ↔ sub). It pulls no new players from the pool and
recomputes no budget or wage, because both players are already in the squad and already paid for. A
swap's only effect is which player scores at full weight vs reserve half weight, and which slot's
frozen `position_codes` apply (the MID clean-sheet predicate), from the target round onward.

### Why swaps bypass the registration freeze

The registration-close freeze (`2026-07-04T00:00:00Z`) exists for **wage fairness**: at the Soccerverse
season transition every rating is rewritten, and ratings drive the wage/cap table, so no squad may be
*built or re-priced* against a different wage table than everyone else's. A swap re-prices nothing — it
only reorders players already inside a locked, paid-for squad. Therefore swaps are a **separate
mutation path** that deliberately does **not** go through `assertSquadEditable`. The squad builder
methods (`assignPlayer` / `removePlayer` / `setBudget` / `resetSquad` / initial `lockSquad`) keep
`assertSquadEditable` unchanged; swaps run through a dedicated `assertSwapAllowed` gate instead.

### Swap windows

Swaps are only allowed inside timed windows, defined as **data, not hardcoded constants** (a list of
`{ key, opens, closes, swapLimit }`), so adding or retiming a window is a config change. Each window
**closes at the next round's first kickoff** — this is forced by the ≤ 11-full-points-per-round rule
(a window that stayed open into the next round could set a lineup after that round had already
started). All times UTC:

| Window | Opens | Closes | Swap limit |
|---|---|---|---|
| W1 | `2026-06-18 05:00` | `2026-06-18 16:00` (round 2 first kickoff) | 2 |
| W2 | `2026-06-24 05:00` | `2026-06-24 19:00` (round 3 first kickoff) | 2 |
| W3 | `2026-07-08` (rest day before quarter-finals) | end of that day = **hard stop** | 4 |

- W1/W2 open instants are derived from the fixtures table: window N opens at
  `max over all 48 teams of (their Nth group fixture's kickoff + D)`, `D = 3h` (completion basis — a
  team has "played N" once its Nth match has had time to finish, not at kickoff). Deriving from
  fixtures keeps the windows self-correcting if a kickoff is rescheduled. W3 is a fixed env-overridable
  epoch (`2026-07-08`), same pattern as `REGISTRATION_CLOSE_AT`.
- There is deliberately **no window at group-stage completion**; the swap-free stretch from W2 through
  the round of 32 and round of 16 is intended. W3 is the final swap opportunity; its close is the
  tournament-wide hard stop after which no swap is ever allowed.
- A swap made in a window sets the lineup for the **next not-yet-locked round** (the round whose first
  kickoff has not yet passed). It never alters a round already in progress.
- Round ordinals: group matchdays = `1/2/3`, round of 32 = `4`, round of 16 = `5`, quarter-final =
  `6`, semi-final = `7`, final/third-place = `8`. **W1 targets round 2, W2 targets round 3, W3 targets
  the quarter-final (round 6).** The round of 32 and round of 16 (rounds 4-5) run swap-free and
  inherit the round-3 lineup via the as-of-round lookup — which is the intended W2→W3 coverage gap.

### Per-window swap limits

Per-window caps: **W1 = 2, W2 = 2, W3 = 4** (product parameters; stored as env-overridable config).

- One swap = one reserve ↔ starter exchange within a slot class.
- Limits are **per window, no roll-over** — unused W1 swaps do not carry into W2.
- A **reversal counts** as a swap (undoing a swap spends another of the window's allowance).
- This cap (swap *actions per window*) is independent of the ≤ 11-full-points-*per-round* cap.
- The limit is enforced by counting the participant's `squad_swaps` rows in the current window.

### In-match lock

A swap is blocked while either involved player's national team is mid-match, detected as
`kickoff ≤ now < kickoff + D` with `D = 3h` (one tier; no live feed exists — kickoff + a conservative
fixed duration). This is a **UX/product guard, not a scoring-correctness guard**: scoring is already
protected because a swap only affects rounds whose first kickoff is still in the future. Under the
final window design every window sits in a match-free gap, so this lock is **dormant** — requirement
holds by construction — and fires only if a window is ever reconfigured to overlap live matches.

### The `assertSwapAllowed` gate

A swap is permitted only when **all** hold:

1. the squad is **locked and complete** (all 15 slots filled);
2. **now is inside an open swap window**;
3. **neither involved player's nation is in-match** (`D = 3h`);
4. the participant is **under the current window's swap limit**;
5. **now is before the hard stop** (the W3 close).

Each allowed swap, in one transaction: writes/updates the `squad_round_lineup` snapshot for the target
round, appends a `squad_swaps` event row (`swap_id, squad_id, participant_id, window_key, round_key,
slot_out, slot_in, player_out, player_in, applied_at`), and writes an `audit_logs` entry. The
`squad_swaps` table is the authoritative event log — it serves as the queryable per-participant /
per-window history, the per-window limit counter, and the domain side of the audit trail.

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
