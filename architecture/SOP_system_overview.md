# SOP System Overview

## Goal

Provide a secure The Grand Tournament event platform with:

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
5. Admin-curated Grand Tournament team pools that drive builder eligibility.
6. Public standings for three tables: rookie, veteran, and a single combined nation table (each participant's full score is pooled into both their primary and optional secondary nation).
7. Public profile pages and share links.
8. Admin backend for:
- email/password login
- Grand Tournament team player-pool maintenance
- score parameter changes until kickoff
- match result entry
- match-data import lifecycle: upload, review, two-admin confirm, promote
- global squad reveal
- verification resend
- analytics overview
- multi-accounting review cases
- operations overview for audit logs, pending import state, email queue health, scheduler runs, and Soccerverse API warnings/errors
9. Web client render-failure isolation: a top-level React error boundary catches render-time throws and
shows a localized, retryable fallback instead of white-screening the whole app. Public pages must
defensively handle partial or malformed API payloads (optional chaining on nested data). When the
event bootstrap fetch fails, the client renders on safe defaults but must surface a localized
degraded-state notice rather than silently hiding the failure. Public read GETs go through a small
client-side cache + in-flight dedup so revisiting a page doesn't refetch just-loaded data; requests
that pass an AbortSignal bypass it to keep their cancellation semantics. Safe (GET/HEAD) reads retry a
transient failure — a network error, the client-side timeout, or a gateway 5xx (502/503/504) — up to a
small bounded count with a short backoff. A 4xx, a non-GET request, a malformed-body parse error, or a
caller-initiated abort is never retried, so the retry tolerates blips without amplifying load on real
errors or ever replaying a write. Views that load several independent
data sources at once (public standings, admin dashboard/operations, match-import team pools) must
fetch each source independently and render partially: one failed or slow fetch degrades only its own
block (its own load-error/"unavailable" state) and never drops the whole view. Use `Promise.allSettled`
with per-source state, not an all-or-nothing `Promise.all` + single `catch`. Sources that are only
meaningful together (e.g. the share composer needs both the participant session and their squad) stay
coupled by design — partial render does not apply there.
10. Logged-in participant ownership-boost view: a participant sees their current ownership-boost standing
per drafted player — influence bought, sold, net, and resulting % boost — computed live on demand and
cached per participant, linked accounts only. This is a current-standing indicator, distinct from the
frozen per-fixture scoring snapshot. See `SOP_scoring_and_leagues.md` "Participant boost view (live,
on-demand)".

## Security Rules

- No secrets in client bundles.
- All write endpoints require strict schema validation.
- All admin routes require authenticated admin role.
- Participant mutations require an authenticated participant session.
- Public APIs must be rate limited.
- Expensive public endpoints (player search, match results) must carry a tighter per-endpoint rate
  limit on top of the general public limit, since they are uncached and the costliest to hammer.
- The logged-in participant boost endpoint is likewise expensive (a cold read fans out one Soccerverse
  trade-history fetch per drafted player) and must carry a tighter per-endpoint rate limit on top of the
  participant limit. Its result is cached per participant so repeat views add no Soccerverse load.
- Rate limiting must key on the real client IP. In production the service runs behind a single
  trusted proxy (Traefik), so `trust proxy` defaults on in production (overridable via
  `RATE_LIMIT_TRUST_PROXY`); otherwise every visitor shares the proxy's IP and the limiter mis-keys.
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
- multi-accounting review status changes
- admin Soccerverse username correction
- match-data import
- pending match-stat edits
- match-stat fixture confirmations
- promotion of confirmed match stats
- player-name mapping corrections
- import skip-list changes
- pending match-stat batch discard
- email-marketing campaign create or edit
- email-marketing campaign deletion
- email-marketing campaign dispatch (manual send-now and the manual due-batch run)
- email-marketing campaign test sends
- participant squad lock
- participant password set or reset

## Operations Observability

- Admins must have a protected operations screen that summarizes current event health without exposing secrets.
- The operations screen may compose existing admin data sources such as account counts, team-pool counts, pending match-import batches, email campaign queue counts, and audit log rows.
- Short-lived runtime events may be kept in process memory for low-friction visibility into scheduler runs and external Soccerverse API warnings/errors.
- Runtime events are operational signals, not a durable audit log. Durable admin writes still belong in `audit_logs`.
- The server emits structured (JSON) logs via a single shared logger (`pino`), level controlled by
  `LOG_LEVEL` (silent under test). Request-timing middleware logs every request's method, path,
  status, and duration; slow (>1s) or 5xx responses are logged at `warn`. The global error handler
  logs unhandled 500s with request context.
- Transient overload errors are surfaced as **503 with a `Retry-After` header**, not 500, so clients
  and proxies can back off during a load spike (e.g. the registration / squad-lock deadline rush). The
  two mapped cases are Postgres query cancellation (`statement_timeout` / `lock_timeout`, SQLSTATE
  `57014`) and the connection-pool acquisition timeout. These are "server busy", not "request broke",
  and are logged at `warn` rather than `error`.
- Background-job failures (snapshot capture, email scheduler, promotion) are both logged structurally
  AND recorded to `operationsMonitor` so the admin operations screen surfaces them live. The
  structured log is the durable trail; `operationsMonitor` is the at-a-glance view (lost on restart).
- Per-statement slow-query logging instruments the shared pool centrally — the pool's `connect`
  event patches each physical connection's `query` once, so both `pool.query` and transaction
  `client.query` calls are timed transparently (the patch delegates to the original and only observes
  the returned promise; no call site changes). A query whose duration meets `DB_SLOW_QUERY_MS`
  (default 500 ms) is logged at `warn` with the truncated SQL text and duration. This complements,
  not replaces, `statement_timeout` (hard cap on runaway queries) and end-to-end request-timing.
- The veteran influence-snapshot capture runs **off the request path** via a durable job queue. A
  successful promotion enqueues a snapshot job (`participant_influence_snapshot_jobs`) and the request
  returns immediately; an in-process background worker drains pending jobs **one fixture at a time**
  (so two near-simultaneous promotions can't pile parallel runs onto the paced Soccerverse gate),
  running the same I/O-bound capture. The queue is durable: a job survives a restart, the worker
  requeues any job a crash left `running` when it starts, and a job gets a bounded number of attempts
  before it is marked `failed` for admin visibility. Each run still records an `operationsMonitor`
  event. The capture's own in-flight guard + periodic yield remain as belt-and-suspenders. (The worker
  is in-process, not a separate OS process — appropriate for the single-process service; a separate
  worker process stays the long-term option if the job ever needs full CPU isolation.)

## Runtime Resilience

- The Postgres connection pool must cap its worst case explicitly, not rely on driver defaults:
  - a bounded `max` connection count,
  - a `connectionTimeoutMillis` so a request fails fast when the pool is saturated instead of hanging,
  - an `idleTimeoutMillis` to release idle connections,
  - a server-side `statement_timeout` so a single runaway query cannot pin a connection forever.
- These limits are environment-overridable (`DB_POOL_MAX`, `DB_CONNECTION_TIMEOUT_MS`,
  `DB_IDLE_TIMEOUT_MS`, `DB_STATEMENT_TIMEOUT_MS`) with safe defaults; deploys tune them to the
  database plan without a code change.
- On `SIGTERM`/`SIGINT` the process shuts down gracefully: stop accepting new connections, let
  in-flight requests drain, then close the database pool before exiting. A bounded timeout forces
  exit if draining stalls, so a deploy cannot hang.
- Static assets served by Node carry explicit `Cache-Control`: fingerprinted build assets (under
  `/assets/`) are `immutable` with a long max-age so browsers/CDN never re-fetch them; `index.html`
  (the SPA shell) is `no-cache` so a new deploy is picked up immediately; other static files get a
  short max-age. This keeps repeat asset loads off the Node process so they don't compete with API
  traffic.
- `unhandledRejection` and `uncaughtException` are logged as a last-resort net for visibility. The
  single-process service is kept running rather than crashed, so a stray error in a background path
  does not take the whole site down (route errors are already handled by the Express error handler).

## Testing

- **Server**: `vitest` unit/integration tests live next to source as `*.test.ts`. Run via `npm test` in `server`.
- **Web**: `vitest` + React Testing Library + jsdom. Tests live next to source as `*.test.ts`/`*.test.tsx`;
  the jsdom environment and `@testing-library/jest-dom` matchers are wired in `web/vitest.config.ts` +
  `web/src/test/setup.ts`. Test files are excluded from the `tsc -b` production build (mirrors the server).
  Run via `npm test` in `web`.
- **Both workspaces**: `npm test` at the repo root runs the server then the web suite.
- **End-to-end**: Playwright config at repo root (`playwright.config.ts`), run via `npm run test:e2e`.

## i18n Rules

- English is the source language for code and default UI copy.
- All user-facing copy must be stored in translation dictionaries, not hardcoded inline in business logic.
- Supported locales (9): `en`, `es`, `de`, `fr`, `pt`, `ru`, `zh`, `it`, `ja`.
