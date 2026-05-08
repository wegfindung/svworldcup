import dotenv from 'dotenv'

dotenv.config()

const baseUrl = process.env.SV_SERVICES_API_URL ?? 'https://services.soccerverse.com/api'

async function main() {
  const response = await fetch(`${baseUrl}/clubs/detailed?page=1&per_page=5`)
  if (!response.ok) {
    throw new Error(`Soccerverse services API returned ${response.status}`)
  }

  const payload = await response.json()
  console.log(JSON.stringify({
    ok: true,
    totalItems: Array.isArray(payload.items) ? payload.items.length : 0,
    endpoint: `${baseUrl}/clubs/detailed`,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
