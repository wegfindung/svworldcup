import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()
dotenv.config({ path: '../.env' })

const optionalString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value
  }
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}, z.string().optional())

const optionalPositiveInt = z.preprocess((value) => {
  if (value === '') {
    return undefined
  }
  return value
}, z.coerce.number().int().positive().optional())

const booleanFromString = z
  .string()
  .optional()
  .transform((value) => value === 'true')

const optionalBooleanFromString = z
  .string()
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'))

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  // Structured-logging level (see SOP_system_overview.md "Operations Observability"). Silent under
  // test regardless of this value.
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  PUBLIC_WEB_URL: z.string().url().default('https://worldcup.svtool.info'),
  DATABASE_URL: optionalString,
  DB_HOST: optionalString,
  DB_PORT: optionalPositiveInt,
  DB_NAME: optionalString,
  DB_USER: optionalString,
  DB_PASS: optionalString,
  // Connection-pool hardening (see SOP_system_overview.md "Runtime Resilience"). Optional —
  // safe defaults apply when unset; deploys tune to the database plan without a code change.
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  // Slow-query logging threshold (see SOP_system_overview.md "Operations Observability"). A query at
  // or above this duration is logged at warn with its truncated SQL. Tunable per deploy.
  DB_SLOW_QUERY_MS: z.coerce.number().int().positive().default(500),
  SMTP_HOST: optionalString,
  SMTP_PORT: optionalPositiveInt,
  SMTP_SECURE: optionalBooleanFromString,
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_FROM: optionalString,
  SSMTP_HOST: optionalString,
  SSMTP_PORT: optionalPositiveInt,
  SSMTP_SECURE: optionalBooleanFromString,
  SSMTP_USER: optionalString,
  SSMTP_PASSWORD: optionalString,
  SSMTP_FROM: optionalString,
  SV_SERVICES_API_URL: z.string().url().default('https://services.soccerverse.com/api'),
  COMMUNITY_PACK_URL: z.string().url().default('https://elrincondeldt.com/sv/rincon_s4.json'),
  ADMIN_BOOTSTRAP_EMAILS: z.string().default(''),
  ADMIN_BOOTSTRAP_PASSWORD: optionalString,
  ADMIN_API_TOKEN: optionalString,
  SESSION_SECRET: optionalString,
  SHARE_SNAPSHOT_SECRET: optionalString,
  CSRF_TOKEN_SECRET: optionalString,
  RISK_SIGNAL_SECRET: optionalString,
  TOURNAMENT_KICKOFF_AT: optionalString,
  REGISTRATION_CLOSE_AT: optionalString,
  // Player-swap windows (see SOP_scoring_and_leagues.md "Player Swaps"). W1/W2 open/close instants
  // are derived from the fixtures table; only the fixed W3 epoch and the per-window limits / in-match
  // duration are overridable here. All optional — code defaults apply when unset.
  SWAP_W3_OPENS_AT: optionalString,
  SWAP_W3_CLOSES_AT: optionalString,
  SWAP_LIMIT_W1: optionalPositiveInt,
  SWAP_LIMIT_W2: optionalPositiveInt,
  SWAP_LIMIT_W3: optionalPositiveInt,
  SWAP_IN_MATCH_HOURS: optionalPositiveInt,
  CLOSED_BETA_AUTH_ENABLED: optionalBooleanFromString,
  CLOSED_BETA_AUTH_USERNAME: z.string().default('soccerverse'),
  CLOSED_BETA_AUTH_PASSWORD: z.string().default('soccerverse'),
  RATE_LIMIT_TRUST_PROXY: optionalBooleanFromString,
})

const parsed = envSchema.parse(process.env)

function parseAdminEmails(raw: string): string[] {
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

function parseInstant(raw?: string): Date | null {
  if (!raw) {
    return null
  }

  const parsedDate = new Date(raw)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

export const env = {
  ...parsed,
  SMTP_HOST: parsed.SMTP_HOST ?? parsed.SSMTP_HOST,
  SMTP_PORT: parsed.SMTP_PORT ?? parsed.SSMTP_PORT ?? 587,
  SMTP_SECURE: parsed.SMTP_SECURE ?? parsed.SSMTP_SECURE ?? false,
  SMTP_USER: parsed.SMTP_USER ?? parsed.SSMTP_USER,
  SMTP_PASSWORD: parsed.SMTP_PASSWORD ?? parsed.SSMTP_PASSWORD,
  SMTP_FROM: parsed.SMTP_FROM ?? parsed.SSMTP_FROM ?? 'Soccerverse Community Event <support@svtool.info>',
  ADMIN_BOOTSTRAP_EMAILS: parseAdminEmails(parsed.ADMIN_BOOTSTRAP_EMAILS),
  TOURNAMENT_KICKOFF_AT: parseInstant(parsed.TOURNAMENT_KICKOFF_AT),
  REGISTRATION_CLOSE_AT: parseInstant(parsed.REGISTRATION_CLOSE_AT),
  SWAP_W3_OPENS_AT: parseInstant(parsed.SWAP_W3_OPENS_AT),
  SWAP_W3_CLOSES_AT: parseInstant(parsed.SWAP_W3_CLOSES_AT),
  CLOSED_BETA_AUTH_ENABLED: parsed.CLOSED_BETA_AUTH_ENABLED ?? false,
  RATE_LIMIT_TRUST_PROXY: parsed.RATE_LIMIT_TRUST_PROXY ?? parsed.NODE_ENV === 'production',
}
