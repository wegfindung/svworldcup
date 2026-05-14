import { Pool } from 'pg'
import { env } from '../config/env.js'
import { MemoryAdminRepository, PostgresAdminRepository, type AdminRepository } from '../repositories/adminRepository.js'
import {
  MemoryRegistrationRepository,
  PostgresRegistrationRepository,
  type RegistrationRepository,
} from '../repositories/registrationRepository.js'
import {
  MemoryParticipantSessionRepository,
  PostgresParticipantSessionRepository,
  type ParticipantSessionRepository,
} from '../repositories/participantSessionRepository.js'
import {
  MemoryConfigRepository,
  PostgresConfigRepository,
  type ConfigRepository,
} from '../repositories/configRepository.js'
import { MemorySquadRepository, PostgresSquadRepository, type SquadRepository } from '../repositories/squadRepository.js'
import { MemoryTeamPoolRepository, PostgresTeamPoolRepository, type TeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { MemoryScoringRepository, PostgresScoringRepository, type ScoringRepository } from '../repositories/scoringRepository.js'
import {
  MemoryMatchImportRepository,
  PostgresMatchImportRepository,
  type MatchImportRepository,
} from '../repositories/matchImportRepository.js'
import {
  MemoryMatchMappingRepository,
  PostgresMatchMappingRepository,
  type MatchMappingRepository,
} from '../repositories/matchMappingRepository.js'

let pool: Pool | null = null
let registrationRepository: RegistrationRepository | null = null
let configRepository: ConfigRepository | null = null
let adminRepository: AdminRepository | null = null
let participantSessionRepository: ParticipantSessionRepository | null = null
let teamPoolRepository: TeamPoolRepository | null = null
let squadRepository: SquadRepository | null = null
let scoringRepository: ScoringRepository | null = null
let matchImportRepository: MatchImportRepository | null = null
let matchMappingRepository: MatchMappingRepository | null = null

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
  if (!registrationRepository) {
    const existingPool = getPool()
    registrationRepository = existingPool ? new PostgresRegistrationRepository(existingPool) : new MemoryRegistrationRepository()
  }
  return registrationRepository
}

export function createConfigRepository(): ConfigRepository {
  if (!configRepository) {
    const existingPool = getPool()
    configRepository = existingPool ? new PostgresConfigRepository(existingPool) : new MemoryConfigRepository()
  }
  return configRepository
}

export function createAdminRepository(): AdminRepository {
  if (!adminRepository) {
    const existingPool = getPool()
    adminRepository = existingPool ? new PostgresAdminRepository(existingPool) : new MemoryAdminRepository()
  }
  return adminRepository
}

export function createParticipantSessionRepository(): ParticipantSessionRepository {
  if (!participantSessionRepository) {
    const existingPool = getPool()
    participantSessionRepository = existingPool
      ? new PostgresParticipantSessionRepository(existingPool)
      : new MemoryParticipantSessionRepository(createRegistrationRepository())
  }
  return participantSessionRepository
}

export function createTeamPoolRepository(): TeamPoolRepository {
  if (!teamPoolRepository) {
    const existingPool = getPool()
    teamPoolRepository = existingPool ? new PostgresTeamPoolRepository(existingPool) : new MemoryTeamPoolRepository()
  }
  return teamPoolRepository
}

export function createSquadRepository(): SquadRepository {
  if (!squadRepository) {
    const existingPool = getPool()
    squadRepository = existingPool
      ? new PostgresSquadRepository(existingPool, createTeamPoolRepository())
      : new MemorySquadRepository(createTeamPoolRepository())
  }
  return squadRepository
}

export function createScoringRepository(): ScoringRepository {
  if (!scoringRepository) {
    const existingPool = getPool()
    scoringRepository = existingPool
      ? new PostgresScoringRepository(existingPool, createConfigRepository())
      : new MemoryScoringRepository(createConfigRepository(), createRegistrationRepository(), createSquadRepository())
  }
  return scoringRepository
}

export function createMatchImportRepository(): MatchImportRepository {
  if (!matchImportRepository) {
    const existingPool = getPool()
    matchImportRepository = existingPool
      ? new PostgresMatchImportRepository(existingPool)
      : new MemoryMatchImportRepository()
  }
  return matchImportRepository
}

export function createMatchMappingRepository(): MatchMappingRepository {
  if (!matchMappingRepository) {
    const existingPool = getPool()
    matchMappingRepository = existingPool
      ? new PostgresMatchMappingRepository(existingPool)
      : new MemoryMatchMappingRepository()
  }
  return matchMappingRepository
}
