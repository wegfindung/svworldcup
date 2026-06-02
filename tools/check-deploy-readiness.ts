import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), process.argv[2] ?? '.env')
const envLines = readFileSync(envPath, 'utf8').split(/\r?\n/)
const fileEnv = new Map<string, string>()
for (const line of envLines) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  if (!match) continue
  const value = match[2].trim().replace(/^["']|["']$/g, '')
  fileEnv.set(match[1], value)
  if (process.env[match[1]] !== undefined) continue
  process.env[match[1]] = value
}

const requiredKeys = [
  'PUBLIC_WEB_URL',
  'SESSION_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
  'ADMIN_BOOTSTRAP_EMAILS',
  'ADMIN_BOOTSTRAP_PASSWORD',
  'ADMIN_API_TOKEN',
  'SV_SERVICES_API_URL',
  'COMMUNITY_PACK_URL',
  'SHARE_SNAPSHOT_SECRET',
  'CSRF_TOKEN_SECRET',
  'RISK_SIGNAL_SECRET',
]

const dbKeys = ['DB_NAME', 'DB_USER', 'DB_PASS']

function hasValue(key: string) {
  const value = fileEnv.get(key) ?? process.env[key]
  return typeof value === 'string' && value.trim() !== ''
}

function isPlaceholder(key: string) {
  const value = fileEnv.get(key) ?? process.env[key] ?? ''
  return /replace-with|example\.com/i.test(value)
}

const missingRequired = requiredKeys.filter((key) => !hasValue(key))
const missingDb = dbKeys.filter((key) => !hasValue(key))
const placeholderRequired = [...requiredKeys, ...dbKeys].filter((key) => hasValue(key) && isPlaceholder(key))

console.log(`Deploy readiness summary for ${envPath}:`)
for (const key of requiredKeys) {
  console.log(`- ${key}: ${hasValue(key) ? (isPlaceholder(key) ? 'placeholder' : 'present') : 'missing'}`)
}

for (const key of dbKeys) {
  console.log(`- ${key}: ${hasValue(key) ? (isPlaceholder(key) ? 'placeholder' : 'present') : 'missing'}`)
}

if (missingRequired.length > 0 || missingDb.length > 0 || placeholderRequired.length > 0) {
  const missing = [...missingRequired, ...missingDb]
  if (missing.length > 0) {
    console.error(`Missing deployment env keys: ${missing.join(', ')}`)
  }
  if (placeholderRequired.length > 0) {
    console.error(`Placeholder deployment env values: ${placeholderRequired.join(', ')}`)
  }
  process.exitCode = 1
} else {
  console.log('Deployment env keys look complete.')
}
