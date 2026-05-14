import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import type { ParticipantProfile } from '../domain/types.js'
import { hashToken } from '../lib/tokens.js'
import type { RegistrationRepository } from './registrationRepository.js'

export interface ParticipantSessionRepository {
  storageKind: 'memory' | 'postgres'
  createSession(participantId: string, plainToken: string, ttlSeconds: number): Promise<void>
  getParticipantBySessionToken(plainToken: string): Promise<ParticipantProfile | null>
  revokeSession(plainToken: string): Promise<void>
}

interface MemorySessionRecord {
  sessionId: string
  participantId: string
  tokenHash: string
  expiresAt: string
}

export class MemoryParticipantSessionRepository implements ParticipantSessionRepository {
  storageKind: 'memory' = 'memory'
  private readonly sessions = new Map<string, MemorySessionRecord>()

  constructor(private readonly registrationRepository: RegistrationRepository) {}

  async createSession(participantId: string, plainToken: string, ttlSeconds: number) {
    const tokenHash = hashToken(plainToken)
    this.sessions.set(tokenHash, {
      sessionId: randomUUID(),
      participantId,
      tokenHash,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    })
  }

  async getParticipantBySessionToken(plainToken: string) {
    const tokenHash = hashToken(plainToken)
    const session = this.sessions.get(tokenHash)
    if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
      return null
    }

    return this.registrationRepository.getByParticipantId(session.participantId)
  }

  async revokeSession(plainToken: string) {
    this.sessions.delete(hashToken(plainToken))
  }
}

export class PostgresParticipantSessionRepository implements ParticipantSessionRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(private readonly pool: Pool) {}

  async createSession(participantId: string, plainToken: string, ttlSeconds: number) {
    const tokenHash = hashToken(plainToken)
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()

    await this.pool.query(
      `
        INSERT INTO participant_sessions (participant_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `,
      [participantId, tokenHash, expiresAt],
    )
  }

  async getParticipantBySessionToken(plainToken: string) {
    const tokenHash = hashToken(plainToken)
    const result = await this.pool.query<{
      participant_id: string
      email: string
      display_name: string
      soccerverse_username: string | null
      referrer_soccerverse_username: string | null
      marketing_opt_in: boolean
      marketing_unsubscribed_at: string | null
      marketing_unsubscribe_token: string | null
      league_type: ParticipantProfile['leagueType']
      primary_team_code: string
      secondary_team_code: string | null
      status: ParticipantProfile['status']
      verified_at: string | null
      has_password: boolean
    }>(
      `
        SELECT
          p.participant_id,
          p.email,
          p.display_name,
          p.soccerverse_username,
          p.referrer_soccerverse_username,
          p.marketing_opt_in,
          p.marketing_unsubscribed_at,
          p.marketing_unsubscribe_token,
          p.league_type,
          p.primary_team_code,
          p.secondary_team_code,
          p.status,
          p.verified_at,
          (p.password_hash IS NOT NULL) AS has_password
        FROM participant_sessions s
        JOIN participants p ON p.participant_id = s.participant_id
        WHERE s.token_hash = $1
          AND s.revoked_at IS NULL
          AND s.expires_at > NOW()
        LIMIT 1
      `,
      [tokenHash],
    )
    const row = result.rows[0]
    if (!row) {
      return null
    }

    return {
      participantId: row.participant_id,
      email: row.email,
      displayName: row.display_name,
      soccerverseUsername: row.soccerverse_username ?? undefined,
      referrerSoccerverseUsername: row.referrer_soccerverse_username ?? undefined,
      marketingOptIn: row.marketing_opt_in,
      marketingUnsubscribedAt: row.marketing_unsubscribed_at ?? undefined,
      marketingUnsubscribeToken: row.marketing_unsubscribe_token ?? undefined,
      leagueType: row.league_type,
      primaryTeamCode: row.primary_team_code,
      secondaryTeamCode: row.secondary_team_code ?? undefined,
      status: row.status,
      verifiedAt: row.verified_at ?? undefined,
      hasPassword: row.has_password,
    }
  }

  async revokeSession(plainToken: string) {
    await this.pool.query('UPDATE participant_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL', [
      hashToken(plainToken),
    ])
  }
}
