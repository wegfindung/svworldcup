# Matchday Lineups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let participants update a 4-3-3 + 4 substitutes lineup for each World Cup fixture/day instead of locking one static tournament squad.

**Architecture:** Keep the existing submitted squad flow as the legacy/base squad, then add fixture-scoped participant lineups with the same slot rules, budget checks, and team-pool validation. Scoring reads locked fixture lineups when present and falls back to the legacy locked squad for compatibility.

**Tech Stack:** TypeScript, Express, PostgreSQL, Vitest, React/Vite.

---

### Task 1: Matchday Periods

**Files:**
- Create: `server/src/lib/lineupPeriods.ts`
- Test: `server/src/lib/lineupPeriods.test.ts`

- [ ] Write tests proving fixtures are grouped by `kickoffDate`, sorted, and addressable by key.
- [ ] Implement `getLineupPeriods()` and `getFixturePeriodKey(fixtureId)`.
- [ ] Run `npm.cmd run test -- src/lib/lineupPeriods.test.ts`.

### Task 2: Fixture Lineup Repository

**Files:**
- Create: `server/src/repositories/lineupRepository.ts`
- Test: `server/src/repositories/lineupRepository.test.ts`
- Modify: `server/src/domain/types.ts`
- Modify: `db/init/01-schema.sql`
- Create: `db/migrations/2026-05-16-participant-fixture-lineups.sql`

- [ ] Write memory repository tests for create, assign, remove, reset, lock, slot eligibility, budget, duplicate player, and duplicate slot.
- [ ] Implement memory and PostgreSQL repositories with `participant_fixture_lineups` and `participant_fixture_lineup_slots`.
- [ ] Keep the response shape close to `ParticipantSquad`: `ParticipantLineup` with `fixtureId`, `isLocked`, `slots`.
- [ ] Run repository tests.

### Task 3: Participant API

**Files:**
- Modify: `server/src/routes/participant.ts`
- Modify: `server/src/services/repos.ts`
- Modify: `server/src/app.ts`

- [ ] Add `GET /api/participant/lineups/:fixtureId`.
- [ ] Add `POST /api/participant/lineups/:fixtureId/assign`.
- [ ] Add `DELETE /api/participant/lineups/:fixtureId/slots/:slotKey`.
- [ ] Add `POST /api/participant/lineups/:fixtureId/reset`.
- [ ] Add `POST /api/participant/lineups/:fixtureId/lock`.
- [ ] Return `422` for lineup validation errors, matching squad routes.

### Task 4: Scoring Uses Fixture Lineups

**Files:**
- Modify: `server/src/repositories/scoringRepository.ts`
- Test: `server/src/repositories/scoringRepository.test.ts`

- [ ] Write a failing test where one participant has different locked lineups for two fixtures and scores with the fixture-specific player each time.
- [ ] Add fixture-aware score slots.
- [ ] For each fixture entry map, use locked lineup slots for that fixture; if none exist, use the legacy locked squad slots.
- [ ] Run scoring tests and full server tests.

### Task 5: Builder UI

**Files:**
- Modify: `web/src/lib/types.ts`
- Modify: `web/src/lib/api.ts`
- Modify: `web/src/pages/BuilderPage.tsx`

- [ ] Add frontend types/API functions for participant fixture lineups.
- [ ] Add a fixture selector near the team-pool loader.
- [ ] When a fixture is selected, load and edit that fixture lineup instead of the legacy squad.
- [ ] Keep existing player-pool loading and slot buttons.
- [ ] Add copy that distinguishes “matchday lineup” from “final tournament squad”.
- [ ] Run `npm.cmd --prefix web run build`.

### Task 6: Verification

**Files:**
- No production file changes.

- [ ] Run `npm.cmd --prefix server run build`.
- [ ] Run `npm.cmd run test` from `server`.
- [ ] Run `npm.cmd --prefix web run build`.
- [ ] Report remaining product gaps, especially cutoff/lock timing around kickoff.
