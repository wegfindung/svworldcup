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
import { MemoryLineupRepository, PostgresLineupRepository, type LineupRepository } from '../repositories/lineupRepository.js'
import { MemoryFixtureRepository, PostgresFixtureRepository, type FixtureRepository } from '../repositories/fixtureRepository.js'
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
import { MemoryAuditRepository, PostgresAuditRepository, type AuditRepository } from '../repositories/auditRepository.js'
import {
  MemoryEmailMarketingRepository,
  PostgresEmailMarketingRepository,
  type EmailMarketingRepository,
} from '../repositories/emailMarketingRepository.js'
import {
  MemoryParticipantInfluenceSnapshotRepository,
  PostgresParticipantInfluenceSnapshotRepository,
  type ParticipantInfluenceSnapshotRepository,
} from '../repositories/participantInfluenceSnapshotRepository.js'
import {
  MemoryParticipantRiskRepository,
  PostgresParticipantRiskRepository,
  type ParticipantRiskRepository,
} from '../repositories/participantRiskRepository.js'
import { LeaderboardCache } from '../repositories/leaderboardCache.js'

let pool: Pool | null = null
let leaderboardCache: LeaderboardCache | null = null
let registrationRepository: RegistrationRepository | null = null
let configRepository: ConfigRepository | null = null
let adminRepository: AdminRepository | null = null
let participantSessionRepository: ParticipantSessionRepository | null = null
let teamPoolRepository: TeamPoolRepository | null = null
let squadRepository: SquadRepository | null = null
let lineupRepository: LineupRepository | null = null
let fixtureRepository: FixtureRepository | null = null
let scoringRepository: ScoringRepository | null = null
let matchImportRepository: MatchImportRepository | null = null
let matchMappingRepository: MatchMappingRepository | null = null
let auditRepository: AuditRepository | null = null
let emailMarketingRepository: EmailMarketingRepository | null = null
let participantInfluenceSnapshotRepository: ParticipantInfluenceSnapshotRepository | null = null
let participantRiskRepository: ParticipantRiskRepository | null = null

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

export async function closeRepositoryPool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

// One shared in-memory leaderboard cache injected into the scoring repo (read-through) and every
// board-input write repo (invalidate-on-write). See repositories/leaderboardCache.ts.
function getLeaderboardCache(): LeaderboardCache {
  if (!leaderboardCache) {
    leaderboardCache = new LeaderboardCache()
  }
  return leaderboardCache
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

export function createLineupRepository(): LineupRepository {
  if (!lineupRepository) {
    const existingPool = getPool()
    lineupRepository = existingPool
      ? new PostgresLineupRepository(existingPool, createTeamPoolRepository())
      : new MemoryLineupRepository(createTeamPoolRepository())
  }
  return lineupRepository
}

export function createFixtureRepository(): FixtureRepository {
  if (!fixtureRepository) {
    const existingPool = getPool()
    fixtureRepository = existingPool ? new PostgresFixtureRepository(existingPool) : new MemoryFixtureRepository()
  }
  return fixtureRepository
}

export function createScoringRepository(): ScoringRepository {
  if (!scoringRepository) {
    const existingPool = getPool()
    scoringRepository = existingPool
      ? new PostgresScoringRepository(existingPool, createConfigRepository(), getLeaderboardCache())
      : new MemoryScoringRepository(
          createConfigRepository(),
          createRegistrationRepository(),
          createSquadRepository(),
          createParticipantInfluenceSnapshotRepository(),
          getLeaderboardCache(),
        )
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

export function createAuditRepository(): AuditRepository {
  if (!auditRepository) {
    const existingPool = getPool()
    auditRepository = existingPool ? new PostgresAuditRepository(existingPool) : new MemoryAuditRepository()
  }
  return auditRepository
}

export function createEmailMarketingRepository(): EmailMarketingRepository {
  if (!emailMarketingRepository) {
    const existingPool = getPool()
    emailMarketingRepository = existingPool
      ? new PostgresEmailMarketingRepository(existingPool)
      : new MemoryEmailMarketingRepository()
  }
  return emailMarketingRepository
}

export function createParticipantInfluenceSnapshotRepository(): ParticipantInfluenceSnapshotRepository {
  if (!participantInfluenceSnapshotRepository) {
    const existingPool = getPool()
    participantInfluenceSnapshotRepository = existingPool
      ? new PostgresParticipantInfluenceSnapshotRepository(existingPool)
      : new MemoryParticipantInfluenceSnapshotRepository()
  }
  return participantInfluenceSnapshotRepository
}

export function createParticipantRiskRepository(): ParticipantRiskRepository {
  if (!participantRiskRepository) {
    const existingPool = getPool()
    participantRiskRepository = existingPool ? new PostgresParticipantRiskRepository(existingPool) : new MemoryParticipantRiskRepository()
  }
  return participantRiskRepository
}
