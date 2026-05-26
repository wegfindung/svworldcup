import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

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

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_WEB_URL: z.string().url().default('https://worldcup.svtool.info'),
  DATABASE_URL: optionalString,
  DB_HOST: optionalString,
  DB_PORT: optionalPositiveInt,
  DB_NAME: optionalString,
  DB_USER: optionalString,
  DB_PASS: optionalString,
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanFromString,
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_FROM: z.string().default('Soccerverse World Cup <mailer@example.com>'),
  SV_SERVICES_API_URL: z.string().url().default('https://services.soccerverse.com/api'),
  COMMUNITY_PACK_URL: z.string().url().default('https://elrincondeldt.com/sv/rincon_v2.json'),
  ADMIN_BOOTSTRAP_EMAILS: z.string().default(''),
  ADMIN_BOOTSTRAP_PASSWORD: optionalString,
  ADMIN_API_TOKEN: optionalString,
  SESSION_SECRET: optionalString,
  SHARE_SNAPSHOT_SECRET: optionalString,
  CSRF_TOKEN_SECRET: optionalString,
  RISK_SIGNAL_SECRET: optionalString,
  TOURNAMENT_KICKOFF_AT: optionalString,
  REGISTRATION_CLOSE_AT: optionalString,
  RATE_LIMIT_TRUST_PROXY: booleanFromString,
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
  SMTP_SECURE: parsed.SMTP_SECURE ?? false,
  ADMIN_BOOTSTRAP_EMAILS: parseAdminEmails(parsed.ADMIN_BOOTSTRAP_EMAILS),
  TOURNAMENT_KICKOFF_AT: parseInstant(parsed.TOURNAMENT_KICKOFF_AT),
  REGISTRATION_CLOSE_AT: parseInstant(parsed.REGISTRATION_CLOSE_AT),
  RATE_LIMIT_TRUST_PROXY: parsed.RATE_LIMIT_TRUST_PROXY ?? false,
}
