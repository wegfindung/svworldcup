# SOP System Overview

## Goal

Provide a secure Soccerverse World Cup event platform with:

- public landing page
- verified-email registration
- rookie/veteran squad builder
- public scoreboards
- public profile/share pages
- protected admin backend for squad imports, result entry, reveal controls, and analytics

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
3. Squad builder with fixed `4-3-3` plus four locked substitutes.
4. Public standings for rookie, veteran, primary nation, and secondary nation tables.
5. Public profile pages and share links.
6. Admin backend for:
- World Cup player pool maintenance
- match result entry
- score parameter changes until kickoff
- global squad reveal
- verification resend

## Security Rules

- No secrets in client bundles.
- All write endpoints require strict schema validation.
- All admin routes require authenticated admin role.
- Public APIs must be rate limited.
- Audit log entries are required for:
- result edits
- reveal actions
- score-config changes
- verification resend actions

## i18n Rules

- English is the source language for code and default UI copy.
- All user-facing copy must be stored in translation dictionaries, not hardcoded inline in business logic.
- Planned locales: `en`, `es`, `de`, `fr`, `pt`, `ru`, `zh`.
