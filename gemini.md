# Soccerverse World Cup Community Event — Project Map

> Protocol: B.L.A.S.T. | Architecture: A.N.T. 3-Layer
> Created: 2026-05-08 | Status: Phase 3 Architect In Progress

---

## 1. Project State

- Project initialized.
- `tools/` scripting is unlocked.
- The 6 Discovery Questions were answered.
- The payload/data schema was confirmed.
- The Blueprint was approved by the user.
- Package installation is blocked until each dependency name is verified against its official registry/source.

## 2. Working Goal

Build a Soccerverse World Cup community event website using:

- `vite`
- `react`
- `typescript`
- Soccerverse player data
- Reusable community-sharing building blocks such as "Look at my World Cup Squad"

Primary growth goal:

- Attract 2,000 interested users

Product intent captured from user brief:

- Fair, beginner-friendly fantasy drafting experience
- Salary-cap squad builder
- One-time submission before tournament kickoff
- Optional Soccerverse ownership boost
- National team community meta-game

North Star confirmed by user:

- Launch a functioning Soccerverse World Cup event website with team selection and a social share function that helps grow reach.

## 3. Known Functional Rules

### Squad composition

| Slot Group | Class | Count | Notes |
|---|---|---:|---|
| Starters | GK | 1 | |
| Starters | DEF | 4 | Any eligible fine code in DEF class |
| Starters | MID | 3 | Any eligible fine code in MID class |
| Starters | FWD | 3 | Any eligible fine code in FWD class |
| Subs | GK | 1 | Locked to GK slot |
| Subs | DEF | 1 | Locked to DEF slot |
| Subs | MID | 1 | Locked to MID slot |
| Subs | FWD | 1 | Locked to FWD slot |
| Total | All | 15 | All count against cap |

### Submission model

- Entry is free.
- Set-and-forget.
- One submission only.
- Squad locks immediately before World Cup kickoff.
- No transfers in v1.
- No captain mechanic in v1.
- No chips in v1.

### Scoring model

Real World Cup performance only:

- Goals: `2`
- Assists: `2`
- Clean sheets: `3`
- Appearances: `0`
- Minutes: `0`
- Optional admin-entered performance score from `Sofascore`: `0.0` to `1.0`

Explicitly excluded in v1:

- Card penalties
- Maluses

Fixed formation rule:

- All teams use `4-3-3`.
- Scoring parameters must remain editable in the backend until the start of the 2026 FIFA World Cup.

### Substitution model

- A substitute scores only if the corresponding starter is absent from the official World Cup match squad list.
- Rotation or benching does not trigger substitution.
- A sub is locked to its own positional slot class.
- A sub becomes inactive again once the starter returns to the official squad list.

### Ownership boost

- Optional mechanic.
- `+0.1%` contribution per share.
- Cap: `10%` max boost at `100` shares.
- Window: only influence bought between Announcement and first World Cup kickoff counts.
- Net of sells in the same window.
- Clamped at `0`.
- Non-market transfers do not count.
- Freeze at first kickoff.

### League variants

- `Rookie` league: no ownership bonus.
- `Veteran` league: `1%` bonus for every `10` influence held in a drafted `playerId`, capped at `10%`.
- Ownership bonus handling is therefore league-specific.
- A participant is a `Veteran` if they provide a Soccerverse main account.
- A participant without a Soccerverse main account is a `Rookie`.
- A participant appears in up to three public tables:
- Rookie or Veteran league
- Primary country table
- Secondary country table

### Registration and access

- The primary CTA must start the registration flow.
- The registration flow must show `No multi-accounting allowed.` before submission.
- Users explicitly choose rookie or veteran path through account possession:
- no Soccerverse account => `Rookie`
- at least one Soccerverse account => `Veteran`
- Veteran registrations require a main Soccerverse account name.
- Email verification also establishes the participant session for squad building.
- Admin backend access must use email and password.

### Evaluation operations

- Match result evaluation is admin-only.
- Initial v1 workflow is manual admin input.
- Future automation may be added later via screenshots, vision extraction, JSON import, or similar assistive pipelines.

### Language rules

- Code, identifiers, architecture docs, and product copy default to English.
- The product must be structured for later localization into:
- Spanish
- German
- French
- Portuguese
- Russian
- Chinese

### Public sharing rules

- Public profile pages are required.
- Share links are required.
- Veteran profiles should expose the Soccerverse username when available.
- Statistics should be public.

### National league

- Each participant selects one primary nation and one optional secondary nation.
- A nation qualifies if combined primary + secondary entries >= 2.
- A participant contributes full score to both chosen nations.
- Winning nation = highest average score among qualified nations.
- Tiebreak = highest individual score inside tied nations.
- Pool split = equal split across all primary + secondary participants of the winning nation.

## 4. Security Rules

- No secrets in client-side code.
- All tokens/keys must come from server-side environment variables via `.env`.
- No package installs before registry/source verification.
- Protected routes, write endpoints, and admin actions must be explicitly listed before implementation.
- All server-side mutations must validate:
- payload shape
- field types
- authorization
- structural integrity
- No `tools/` scripts before Blueprint approval.
- Public squads remain hidden until participant reveal or global admin reveal at World Cup kickoff.

### Known protected surfaces

- Admin authentication area
- Admin-only World Cup squad preselection/import actions
- Admin-only results input actions
- Admin-only scoreboard recalculation or reveal actions
- Registration confirmation flow endpoints
- Submission create/update/finalize endpoints
- Any API route exposed to the public internet must enforce rate limiting and abuse controls

## 5. External Inputs We Can Verify So Far

### Local reference source

Sibling project found:

- `C:\Users\Wohlstandsgenerator\Documents\AI\SVtool`

Observed from local code:

- Soccerverse services API base default: `https://services.soccerverse.com/api`
- Soccerverse GSP fallback base default: `https://gsppub.soccerverse.io/`
- `SVtool` already documents a Soccerverse player object shape and uses public APIs with rate limiting.

### Conservative position-class reference from local code

The local `SVtool` app groups positions broadly as:

- GK: `GK`
- DEF: `RB`, `RWB`, `CB`, `LB`, `LWB`, `SW`
- MID: `DMC`, `DM`, `DMR`, `DML`, `CM`, `AMC`, `AM`, `AMR`, `AML`, `RM`, `LM`, `RW`, `LW`
- FWD: `FC`, `FR`, `FL`, `FW`, `ST`, `CF`, `SS`

Status:

- This is useful as a draft mapping.
- It is not yet accepted as final replacement for the user-referenced `REFERENCE_GLOSSARY.md`.

## 6. Remaining Unknowns and Future Inputs

- Exact World Cup data source for real-life fixtures, squads, and match stats
- Exact fine-code mapping source if different from the local `SVtool` grouping
- Exact admin bootstrap list

## 7. Initial Data Schema Draft

This schema reflects the approved blueprint and is now the active implementation contract.

### PlayerIngest

```json
{
  "playerId": 344557,
  "displayName": "Alexandros Robi",
  "source": "soccerverse",
  "rating": 65,
  "nationalityCode": "GRE",
  "clubId": 38019,
  "positionCodes": ["LB"],
  "positionClasses": ["DEF"],
  "isInSoccerverse": true
}
```

Validation draft:

- `playerId`: integer only
- `source`: must be `soccerverse`
- `rating`: integer `0..99`
- `positionCodes`: non-empty array of known codes
- `positionClasses`: subset of `GK | DEF | MID | FWD`
- non-Soccerverse players are forbidden in v1

### SalaryTable

```json
{
  "currency": "virtual",
  "version": "soccerverse-wiki-backend-game-logic",
  "rows": [
    { "rating": 50, "capCost": 1250 },
    { "rating": 99, "capCost": 1837214 }
  ]
}
```

Validation draft:

- unique `rating` rows from `50..99`
- every row must have exactly one `capCost`
- `capCost` must be positive integer
- cap cost source is the Soccerverse wiki wage table unless explicitly overridden later

### SquadSubmission

```json
{
  "participantId": "uuid",
  "email": "user@example.com",
  "displayName": "manager-name",
  "primaryNation": "SWE",
  "secondaryNation": "BRA",
  "roster": {
    "starters": {
      "gk": ["344557"],
      "def": ["1", "2", "3", "4"],
      "mid": ["5", "6", "7"],
      "fwd": ["8", "9", "10"]
    },
    "subs": {
      "gk": "11",
      "def": "12",
      "mid": "13",
      "fwd": "14"
    }
  },
  "budgetLimit": 1000,
  "budgetUsed": 987,
  "ownershipBoostOptIn": true,
  "status": "draft"
}
```

Validation draft:

- exactly 15 unique player ids
- starters shape must equal `1/4/3/3`
- subs must contain exactly `1` per class
- every selected player must be eligible for assigned slot class
- `budgetUsed <= budgetLimit`
- submissions immutable after deadline
- one active submission per participant
- email must be verified via double opt-in before final submission is accepted
- squad visibility defaults to hidden

### MatchPerformance

```json
{
  "matchId": "wc-2026-001",
  "playerId": "344557",
  "inOfficialSquad": true,
  "minutes": 90,
  "goals": 1,
  "assists": 0,
  "cleanSheetEligible": true,
  "performancePoints": 0.5
}
```

Validation draft:

- non-negative integer metrics
- `minutes` range `0..130`
- `cleanSheetEligible` allowed only for relevant roles per scoring rules
- player must exist in Soccerverse by API player id
- `performancePoints` optional, numeric, and constrained to `0.5..1.0`

### ScoreBreakdown

```json
{
  "participantId": "uuid",
  "playerId": "344557",
  "rawPoints": 6,
  "leagueType": "veteran",
  "ownershipBoostPercent": 1.0,
  "boostedPoints": 6.084,
  "substitutedForPlayerId": null,
  "performancePoints": 0.5
}
```

Validation draft:

- boost percent range `0..10`
- substitution only allowed against designated slot partner
- `leagueType` enum `rookie | veteran`
- `ownershipBoostPercent` must be `0` for rookie league entries

### Registration

```json
{
  "email": "user@example.com",
  "displayName": "manager-name",
  "soccerverseUsername": "manager_sv",
  "primaryNation": "SWE",
  "secondaryNation": "BRA",
  "doubleOptInToken": "opaque-token",
  "leagueType": "veteran",
  "status": "pending_verification"
}
```

Validation draft:

- `email` must be normalized and unique per active registration
- `displayName` must be trimmed and length-limited
- `soccerverseUsername` is required for veteran registrations and must be empty for rookie registrations
- `primaryNation` required
- `secondaryNation` optional and may equal a different FIFA nation code only
- `leagueType` enum `rookie | veteran`
- `status` enum `pending_verification | active | locked | withdrawn`

### ParticipantSession

```json
{
  "participantId": "uuid",
  "email": "user@example.com",
  "displayName": "manager-name",
  "leagueType": "rookie",
  "budgetLimit": 3000000,
  "status": "active"
}
```

Validation draft:

- created only after successful email verification
- bound to one server-issued httpOnly session token
- must never expose token hashes to the client
- revoked sessions must immediately lose builder mutation access

### AdminSession

```json
{
  "adminId": "uuid",
  "email": "admin@example.com",
  "role": "admin",
  "status": "active"
}
```

Validation draft:

- requires allowed admin email plus valid password
- password stored as server-side hash only
- session token stored and validated server-side

### TeamPlayerPoolEntry

```json
{
  "teamCode": "BRA",
  "playerId": 762,
  "displayName": "Vinicius Paixao",
  "rating": 93,
  "capCost": 615279,
  "positionCodes": ["AML", "FL", "FC"],
  "positionClasses": ["MID", "FWD"],
  "imageUrl": "https://elrincondeldt.com/sv/photos/players/762.png"
}
```

Validation draft:

- player must exist in Soccerverse API by `playerId`
- player identity may be enriched from the community datapack when the API omits names
- `teamCode` must be one of the 48 seeded World Cup teams
- only admin-authenticated routes may mutate the team player pool

### AdminResultInput

```json
{
  "adminUserId": "uuid",
  "matchId": "wc-2026-001",
  "entries": [
    {
      "playerId": 344557,
      "inOfficialSquad": true,
      "minutes": 90,
      "goals": 1,
      "assists": 0,
      "cleanSheetEligible": true,
      "performancePoints": 0.5
    }
  ],
  "sourceNote": "manual admin entry"
}
```

Validation draft:

- admin auth required
- all player ids must exist
- all metric fields non-negative
- batch must be idempotent by match and player
- `performancePoints` optional and limited to `0.5..1.0`
- admin UI must allow score parameter changes only until tournament kickoff

## 8. Proposed Blueprint

### Delivery surfaces

- Public landing page
- Public registration flow with double opt-in email
- Public squad builder app backed by Soccerverse player data
- Public scoreboards for `rookies`, `veterans`, and `nations`
- Localized UI architecture with English default and future language packs
- Public hidden-squad state until self-reveal or admin reveal
- Protected admin backend for:
- preselecting World Cup squads by Soccerverse player id
- entering official match results
- revealing all squads at kickoff
- viewing basic stats

### Infrastructure

- Host: `https://worldcup.svtool.info`
- Server: Hetzner
- Database: PostgreSQL
- Email: All-Inkl SMTP

### Data flow proposal

- Soccerverse API ingests eligible player catalogue
- Admin preselects all World Cup squads by `playerId`
- Public users register with email and double opt-in
- Verified users enter a participant session and build one hidden squad under salary cap
- Admin enters official match performance data
- Server recalculates participant, league, and nation scoreboards
- Public share pages expose selected squad views only after reveal rules are satisfied

### Navigation and auth proposal

- Public routes:
- landing page
- registration
- email confirmation
- squad builder for verified users
- public scoreboards
- public shared squad pages
- Admin routes:
- admin login
- admin dashboard
- world cup squad import/preselect
- results input
- reveal controls
- analytics overview

### Security posture

- `.env` only for secrets
- no client-side secret exposure
- all mutation endpoints server-validated
- admin role checks on all backend routes
- rate limiting on auth, registration, and public API routes
- audit logging for admin result edits and reveal actions
- all translatable copy must be separated from business logic
- verified email is required for participant sessions
- admins must be able to resend verification mail
- admin access must support email and password login before production rollout

## 9. Blueprint Approval Gate

No `tools/` scripts may be created until this section is marked approved.

- Blueprint approved: `YES`
- Schema approved: `YES`
- Discovery complete: `YES`

## 10. Research Queue

- Verify Taste skill source and installation path
- Verify `vite`, `react`, and `typescript` official package names before install
- Inspect `SVtool` for reusable Soccerverse API patterns
- Find Soccerverse Office `wageUtils.js` source
- Identify official or reliable World Cup match/squad/stat data sources

### Verified dependency names

Verified on 2026-05-08 via `npm view`:

- `vite`
- `react`
- `react-dom`
- `typescript`
- `skills`

### UI skill note

- `taste-skill` installed from `Leonxlnx/taste-skill` into `C:\Users\Wohlstandsgenerator\.codex\skills\taste-skill`
- Current Codex session has already been restarted and can follow the installed skill directly

### Source-verifiable rules confirmed

- Wage table source confirmed from Soccerverse wiki `Backend Game Logic`
- Soccerverse Datacentre API documents `/players/detailed`, `/share_trade_history`, and `/share_balances`
- `taste-skill` is available locally for frontend implementation guidance

## 11. Git and Secret Hygiene

- Local repo initialized as a Git repository on branch `main`
- Before first push:
- initialize local Git
- add `.gitignore`
- add `.env.example`
- never commit `.env`
- remote `origin` configured: `https://github.com/wegfindung/svworldcup.git`
- GitHub CLI is not installed in the current environment

## 12. Maintenance Log

| Date | Phase | Note |
|---|---|---|
| 2026-05-08 | Protocol 0 | `gemini.md` initialized |
| 2026-05-08 | Phase 1 | Local discovery started; `SVtool` found as reusable reference |
| 2026-05-08 | Protocol 0 | Verified `vite`, `react`, `react-dom`, `typescript`, and `skills` package names against npm registry |
| 2026-05-08 | Phase 1 | User answered core blueprint questions: Hetzner + PostgreSQL + All-Inkl SMTP + hidden squads + admin backend |
| 2026-05-08 | Phase 1 | Wage table source confirmed from Soccerverse wiki |
| 2026-05-08 | Protocol 0 | Added `.gitignore` and `.env.example` for secret hygiene |
| 2026-05-08 | Protocol 0 | Initialized local Git repository on `main` |
| 2026-05-08 | Phase 1 | Scoring weights, optional performance points, league split, and i18n baseline captured |
| 2026-05-08 | Protocol 0 | Connected local repo to GitHub remote `wegfindung/svworldcup` |
| 2026-05-08 | Protocol 0 | Installed `taste-skill` from `Leonxlnx/taste-skill` |
| 2026-05-08 | Phase 1 | Blueprint approved by user |
| 2026-05-08 | Phase 1 | Schema approved by user |
| 2026-05-08 | Phase 3 | Architecture layer created |
| 2026-05-08 | Phase 3 | Frontend and backend scaffolded, verified build clean |
| 2026-05-08 | Phase 3 | Registration-first builder workflow and email/password admin access approved for implementation |
| 2026-05-08 | Phase 5 | Docker, Compose, SQL seeds, and Hetzner deploy script added |
| 2026-05-08 | Phase 5 | Integrated production-style smoke test passed locally |
| 2026-05-08 | Phase 5 | Compose DB override hardened and deploy-readiness check added |
