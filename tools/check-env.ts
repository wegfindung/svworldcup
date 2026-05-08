import dotenv from 'dotenv'

dotenv.config()

const required = ['PUBLIC_WEB_URL', 'SV_SERVICES_API_URL']
const optional = ['DATABASE_URL', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'ADMIN_API_TOKEN']

const missing = required.filter((key) => !process.env[key])

console.log('Required environment variables:')
for (const key of required) {
  console.log(`- ${key}: ${process.env[key] ? 'present' : 'missing'}`)
}

console.log('Optional environment variables:')
for (const key of optional) {
  console.log(`- ${key}: ${process.env[key] ? 'present' : 'missing'}`)
}

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`)
  process.exitCode = 1
}
