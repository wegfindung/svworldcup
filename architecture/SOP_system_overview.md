# SOP System Overview

## Goal

Provide a secure Soccerverse World Cup event platform with:

- public landing page
- verified-email registration and participant session bootstrap
- rookie/veteran squad builder
- public scoreboards
- public profile/share pages
- protected admin backend for team preselection, result entry, reveal controls, and analytics

## Architecture

### Layer 1: Architecture

- `gemini.md` is the project map and state tracker.
- `architecture/` contains business logic SOPs.
- Any logic change must be documented here before code changes.

### Layer 2: Navigation

- HTTP API layer routes requests.
- Auth middleware protects admin routes and private participant mutations.
- Validation layer rejects malformed or unauthorized payloads before database access.

### Layer 3: Tools

- `tools/` contains deterministic scripts for environment checks, Soccerverse link checks, and seed/import tasks.
- All tools must be atomic and safe to rerun.

## Core Features

1. Landing page and conversion funnel.
2. Registration with double opt-in email verification.
3. Participant session creation after verification.
4. Squad builder with fixed `4-3-3` plus four locked substitutes.
5. Admin-curated World Cup team pools that drive builder eligibility.
6. Public standings for rookie, veteran, primary nation, and secondary nation tables.
7. Public profile pages and share links.
8. Admin backend for:
- email/password login
- World Cup team player-pool maintenance
- score parameter changes until kickoff
- match result entry
- match-data import lifecycle: upload, review, two-admin confirm, promote
- global squad reveal
- verification resend
- analytics overview
- operations overview for audit logs, pending import state, email queue health, scheduler runs, and Soccerverse API warnings/errors

## Security Rules

- No secrets in client bundles.
- All write endpoints require strict schema validation.
- All admin routes require authenticated admin role.
- Participant mutations require an authenticated participant session.
- Public APIs must be rate limited.
- Public read-only API requests may load automatically when they directly improve public screens, including event bootstrap, fixture results, public standings, and public profiles.
- Session restore checks may run automatically when they only read existing cookies and do not create, consume, or mutate sessions.
- Registration, email verification, protected builder data, admin tools, team-pool edits, and any write or import action must require explicit participant or admin intent.
- Static assets must not be blocked by API rate limiting or SPA fallback routing.
- Audit log entries are required for:
- admin login
- admin logout
- team-pool edits
- result edits
- reveal actions
- score-config changes
- verification resend actions
- match-data import
- pending match-stat edits
- match-stat fixture confirmations
- promotion of confirmed match stats
- player-name mapping corrections
- import skip-list changes
- pending match-stat batch discard

## Operations Observability

- Admins must have a protected operations screen that summarizes current event health without exposing secrets.
- The operations screen may compose existing admin data sources such as account counts, team-pool counts, pending match-import batches, email campaign queue counts, and audit log rows.
- Short-lived runtime events may be kept in process memory for low-friction visibility into scheduler runs and external Soccerverse API warnings/errors.
- Runtime events are operational signals, not a durable audit log. Durable admin writes still belong in `audit_logs`.

## i18n Rules

- English is the source language for code and default UI copy.
- All user-facing copy must be stored in translation dictionaries, not hardcoded inline in business logic.
- Planned locales: `en`, `es`, `de`, `fr`, `pt`, `ru`, `zh`.
