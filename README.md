# The Grand Tournament

The Grand Tournament community event platform.

## Structure

- `gemini.md`: project map and state tracker
- `architecture/`: approved SOP layer
- `web/`: Vite + React + TypeScript frontend
- `server/`: Express + TypeScript backend
- `db/init/01-schema.sql`: PostgreSQL schema
- `tools/`: deterministic environment and Soccerverse checks

## Local setup

1. Copy `.env.example` to `.env` and fill in real values.
2. Start the backend:
   `cd server && npm install && npm run dev`
3. Start the frontend:
   `cd web && npm install && npm run dev`

The frontend proxies `/api` to `http://localhost:3000` in development.

## Verified stack

- Frontend: `vite`, `react`, `typescript`, `react-router-dom`, Tailwind CSS v4
- Backend: `express`, `pg`, `zod`, `nodemailer`, `helmet`, `express-rate-limit`, `pino`

## Current backend status

- Teams and first-matchday fixtures are seeded in English.
- Registration now runs as a registration-first flow with email verification and participant sessions.
- Admin backend access supports email + password login plus secure admin sessions.
- The public builder drafts from admin-curated Grand Tournament team pools, not arbitrary public search.
- Germany is included as the first bootstrap team pool seed through the backend startup bootstrap.
- A site-wide stability/load-resilience pass is in place: leaderboard read-cache, React error
  boundary, hardened DB pool + graceful shutdown, per-endpoint rate limits, static `Cache-Control`,
  pino structured logging + request-timing, observable background jobs, and a promotion fixture lock.
  See `architecture/SOP_system_overview.md` ("Runtime Resilience" + "Operations Observability") and
  `claude-docs/stabilization-plan.md`.

## Deployment

- `Dockerfile`: multi-stage build for `web` and `server`
- `docker-compose.yml`: Traefik-facing `app` plus PostgreSQL `db`
- `deploy.ps1`: Hetzner deployment script adapted from `SVtool`

Expected production env highlights:

- `PUBLIC_WEB_URL`
- `ADMIN_BOOTSTRAP_EMAILS`
- `ADMIN_BOOTSTRAP_PASSWORD`
- `ADMIN_API_TOKEN`
- `CLOSED_BETA_AUTH_ENABLED`
- `CLOSED_BETA_AUTH_USERNAME`
- `CLOSED_BETA_AUTH_PASSWORD`
- `SESSION_SECRET`
- `SHARE_SNAPSHOT_SECRET`
- `CSRF_TOKEN_SECRET`
- `COMMUNITY_PACK_URL`
- SMTP variables
- either `DATABASE_URL` or the discrete `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS`

Optional tuning (safe defaults apply when unset; `RATE_LIMIT_TRUST_PROXY` defaults on in production):

- `LOG_LEVEL`
- `DB_POOL_MAX` / `DB_CONNECTION_TIMEOUT_MS` / `DB_IDLE_TIMEOUT_MS` / `DB_STATEMENT_TIMEOUT_MS`
- `RATE_LIMIT_TRUST_PROXY`

SMTP sending limits for All-Inkl.com:

- Send volume: official limit is 1,000 emails per 10 minutes.
- Larger mailings must be staggered: send 1,000 emails, pause 10 minutes, then send the next 1,000.
- The practical ceiling is about 3,000 emails per hour only when those pauses are strictly observed.
- Connections: maximum 3 simultaneous SMTP connections. Newsletter jobs should send sequentially, ideally over one maintained SMTP connection.
- Scope: limits apply per webhosting package / KAS account, not per mailbox or domain. Splitting one mailing across sender addresses inside the same hosting package does not bypass the shared limit.

Database initialization:

- `db/init/01-schema.sql` creates the schema
- `db/init/02-seed-tournament.sql` seeds scoring config, 48 teams, and 24 opening fixtures
- `tools/apply-migrations.sh` records applied migration filenames and SHA-256 checksums in `schema_migrations`
- `db/migrations/2026-05-08-session-and-team-pools.sql` upgrades an existing database with admin sessions, participant sessions, and team-pool tables
- `db/migrations/2026-05-14-referrer-soccerverse-username.sql` stores optional `ref` campaign attribution on participant registrations
- `db/migrations/2026-05-14-marketing-consent-and-referral-analytics.sql` adds marketing consent, unsubscribe tokens, delivery throttling logs, and referral click analytics
- `tools/check-deploy-readiness.ts` validates the production env key set without printing secrets

## Runtime checks

- `cd server && npx tsx ../tools/check-env.ts`
- `cd server && npx tsx ../tools/check-soccerverse.ts`
- `npx --prefix server tsx tools/check-deploy-readiness.ts`
- `npm run test:e2e`

## Validation completed

- `web`: `npm run build`
- `web`: `npm run lint`
- `server`: `npm run build`
- `root`: `npm run test:e2e`
- Integrated production-style smoke test passed locally for `/` and `/api/public/health`
