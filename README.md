# SV World Cup

Soccerverse World Cup community event platform.

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
- Backend: `express`, `pg`, `zod`, `nodemailer`, `helmet`, `express-rate-limit`

## Current backend status

- Teams and first-matchday fixtures are seeded in English.
- Registration and verification flow works with in-memory fallback when `DATABASE_URL` is missing.
- Admin scoring updates are protected by bearer token plus allowlisted admin email.
- Soccerverse player search is proxied through the backend.

## Deployment

- `Dockerfile`: multi-stage build for `web` and `server`
- `docker-compose.yml`: Traefik-facing `app` plus PostgreSQL `db`
- `deploy.ps1`: Hetzner deployment script adapted from `SVtool`

Expected production env highlights:

- `PUBLIC_WEB_URL`
- `ADMIN_BOOTSTRAP_EMAILS`
- `ADMIN_API_TOKEN`
- SMTP variables
- either `DATABASE_URL` or the discrete `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS`

Database initialization:

- `db/init/01-schema.sql` creates the schema
- `db/init/02-seed-tournament.sql` seeds scoring config, 48 teams, and 24 opening fixtures
- `tools/check-deploy-readiness.ts` validates the production env key set without printing secrets

## Runtime checks

- `cd server && npx tsx ../tools/check-env.ts`
- `cd server && npx tsx ../tools/check-soccerverse.ts`
- `npx --prefix server tsx tools/check-deploy-readiness.ts`

## Validation completed

- `web`: `npm run build`
- `web`: `npm run lint`
- `server`: `npm run build`
- Integrated production-style smoke test passed locally for `/` and `/api/public/health`
