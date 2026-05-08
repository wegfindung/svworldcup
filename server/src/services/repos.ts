import { Pool } from 'pg'
import { env } from '../config/env.js'
import {
  MemoryRegistrationRepository,
  PostgresRegistrationRepository,
  type RegistrationRepository,
} from '../repositories/registrationRepository.js'
import {
  MemoryConfigRepository,
  PostgresConfigRepository,
  type ConfigRepository,
} from '../repositories/configRepository.js'

let pool: Pool | null = null

function resolveConnectionString(): string | null {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL
  }

  if (!env.DB_HOST || !env.DB_PORT || !env.DB_NAME || !env.DB_USER || !env.DB_PASS) {
    return null
  }

  return `postgresql://${encodeURIComponent(env.DB_USER)}:${encodeURIComponent(env.DB_PASS)}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`
}

function getPool(): Pool | null {
  const connectionString = resolveConnectionString()
  if (!connectionString) {
    return null
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
    })
  }

  return pool
}

export function createRegistrationRepository(): RegistrationRepository {
  const existingPool = getPool()
  return existingPool ? new PostgresRegistrationRepository(existingPool) : new MemoryRegistrationRepository()
}

export function createConfigRepository(): ConfigRepository {
  const existingPool = getPool()
  return existingPool ? new PostgresConfigRepository(existingPool) : new MemoryConfigRepository()
}
