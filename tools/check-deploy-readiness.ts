import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env')
const envLines = readFileSync(envPath, 'utf8').split(/\r?\n/)
for (const line of envLines) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  if (!match) continue
  if (process.env[match[1]] !== undefined) continue
  process.env[match[1]] = match[2]
}

const requiredKeys = [
  'PUBLIC_WEB_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
  'ADMIN_BOOTSTRAP_EMAILS',
  'ADMIN_API_TOKEN',
  'SV_SERVICES_API_URL',
]

const dbKeys = ['DB_NAME', 'DB_USER', 'DB_PASS']

function hasValue(key: string) {
  const value = process.env[key]
  return typeof value === 'string' && value.trim() !== ''
}

const missingRequired = requiredKeys.filter((key) => !hasValue(key))
const missingDb = dbKeys.filter((key) => !hasValue(key))

console.log('Deploy readiness summary:')
for (const key of requiredKeys) {
  console.log(`- ${key}: ${hasValue(key) ? 'present' : 'missing'}`)
}

for (const key of dbKeys) {
  console.log(`- ${key}: ${hasValue(key) ? 'present' : 'missing'}`)
}

if (missingRequired.length > 0 || missingDb.length > 0) {
  const missing = [...missingRequired, ...missingDb]
  console.error(`Missing deployment env keys: ${missing.join(', ')}`)
  process.exitCode = 1
} else {
  console.log('Deployment env keys look complete.')
}
