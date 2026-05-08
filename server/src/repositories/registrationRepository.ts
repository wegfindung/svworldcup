import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { hashToken } from '../lib/tokens.js'
import type {
  LeagueType,
  RegistrationCreationResult,
  RegistrationInput,
  RegistrationRecord,
} from '../domain/types.js'

export interface RegistrationRepository {
  storageKind: 'memory' | 'postgres'
  createPending(input: RegistrationInput, plainToken: string): Promise<RegistrationCreationResult>
  verifyByPlainToken(plainToken: string): Promise<RegistrationRecord | null>
  resendVerification(email: string, plainToken: string): Promise<RegistrationCreationResult | null>
  getCounts(): Promise<{ pending: number; active: number }>
}

function deriveLeagueType(soccerverseUsername?: string): LeagueType {
  return soccerverseUsername?.trim() ? 'veteran' : 'rookie'
}

function expiryIso(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString()
}

export class MemoryRegistrationRepository implements RegistrationRepository {
  storageKind: 'memory' = 'memory'
  private readonly byEmail = new Map<string, RegistrationRecord>()
  private readonly byTokenHash = new Map<string, string>()

  async createPending(input: RegistrationInput, plainToken: string): Promise<RegistrationCreationResult> {
    const email = input.email.trim().toLowerCase()
    const tokenHash = hashToken(plainToken)
    const leagueType = deriveLeagueType(input.soccerverseUsername)
    const existing = this.byEmail.get(email)
    const participantId = existing?.participantId ?? randomUUID()

    const record: RegistrationRecord = {
      participantId,
      email,
      displayName: input.displayName.trim(),
      soccerverseUsername: input.soccerverseUsername?.trim() || undefined,
      leagueType,
      primaryTeamCode: input.primaryTeamCode,
      secondaryTeamCode: input.secondaryTeamCode,
      status: 'pending_verification',
      verificationTokenHash: tokenHash,
      verificationTokenExpiresAt: expiryIso(48),
      verifiedAt: existing?.verifiedAt,
    }

    this.byEmail.set(email, record)
    this.byTokenHash.set(tokenHash, email)

    return { record, plainToken }
  }

  async verifyByPlainToken(plainToken: string): Promise<RegistrationRecord | null> {
    const tokenHash = hashToken(plainToken)
    const email = this.byTokenHash.get(tokenHash)
    if (!email) {
      return null
    }

    const record = this.byEmail.get(email)
    if (!record || record.verificationTokenHash !== tokenHash) {
      return null
    }

    const nextRecord: RegistrationRecord = {
      ...record,
      status: 'active',
      verifiedAt: new Date().toISOString(),
    }
    this.byEmail.set(email, nextRecord)
    return nextRecord
  }

  async resendVerification(email: string, plainToken: string): Promise<RegistrationCreationResult | null> {
    const existing = this.byEmail.get(email.trim().toLowerCase())
    if (!existing) {
      return null
    }

    return this.createPending(
      {
        email: existing.email,
        displayName: existing.displayName,
        soccerverseUsername: existing.soccerverseUsername,
        primaryTeamCode: existing.primaryTeamCode,
        secondaryTeamCode: existing.secondaryTeamCode,
      },
      plainToken,
    )
  }

  async getCounts() {
    let pending = 0
    let active = 0
    for (const record of this.byEmail.values()) {
      if (record.status === 'pending_verification') {
        pending += 1
      }
      if (record.status === 'active') {
        active += 1
      }
    }
    return { pending, active }
  }
}

export class PostgresRegistrationRepository implements RegistrationRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(private readonly pool: Pool) {}

  async createPending(input: RegistrationInput, plainToken: string): Promise<RegistrationCreationResult> {
    const email = input.email.trim().toLowerCase()
    const tokenHash = hashToken(plainToken)
    const leagueType = deriveLeagueType(input.soccerverseUsername)
    const expiresAt = expiryIso(48)
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const participantResult = await client.query<{
        participant_id: string
        email: string
        display_name: string
        soccerverse_username: string | null
        league_type: LeagueType
        primary_team_code: string
        secondary_team_code: string | null
        status: RegistrationRecord['status']
      }>(
        `
          INSERT INTO participants (
            email, display_name, soccerverse_username, league_type, primary_team_code, secondary_team_code, status, verification_sent_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'pending_verification', NOW())
          ON CONFLICT (email)
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            soccerverse_username = EXCLUDED.soccerverse_username,
            league_type = EXCLUDED.league_type,
            primary_team_code = EXCLUDED.primary_team_code,
            secondary_team_code = EXCLUDED.secondary_team_code,
            status = 'pending_verification',
            verification_sent_at = NOW(),
            updated_at = NOW()
          RETURNING participant_id, email, display_name, soccerverse_username, league_type, primary_team_code, secondary_team_code, status
        `,
        [
          email,
          input.displayName.trim(),
          input.soccerverseUsername?.trim() || null,
          leagueType,
          input.primaryTeamCode,
          input.secondaryTeamCode ?? null,
        ],
      )

      const participant = participantResult.rows[0]
      await client.query('UPDATE verification_tokens SET consumed_at = NOW() WHERE participant_id = $1 AND consumed_at IS NULL', [
        participant.participant_id,
      ])
      await client.query(
        `
          INSERT INTO verification_tokens (participant_id, token_hash, expires_at)
          VALUES ($1, $2, $3)
        `,
        [participant.participant_id, tokenHash, expiresAt],
      )
      await client.query('COMMIT')

      return {
        plainToken,
        record: {
          participantId: participant.participant_id,
          email: participant.email,
          displayName: participant.display_name,
          soccerverseUsername: participant.soccerverse_username ?? undefined,
          leagueType: participant.league_type,
          primaryTeamCode: participant.primary_team_code,
          secondaryTeamCode: participant.secondary_team_code ?? undefined,
          status: participant.status,
          verificationTokenHash: tokenHash,
          verificationTokenExpiresAt: expiresAt,
        },
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async verifyByPlainToken(plainToken: string): Promise<RegistrationRecord | null> {
    const tokenHash = hashToken(plainToken)
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const tokenResult = await client.query<{
        participant_id: string
        email: string
        display_name: string
        soccerverse_username: string | null
        league_type: LeagueType
        primary_team_code: string
        secondary_team_code: string | null
        status: RegistrationRecord['status']
        expires_at: string
      }>(
        `
          SELECT
            p.participant_id,
            p.email,
            p.display_name,
            p.soccerverse_username,
            p.league_type,
            p.primary_team_code,
            p.secondary_team_code,
            p.status,
            vt.expires_at
          FROM verification_tokens vt
          JOIN participants p ON p.participant_id = vt.participant_id
          WHERE vt.token_hash = $1
            AND vt.consumed_at IS NULL
        `,
        [tokenHash],
      )
      const tokenRow = tokenResult.rows[0]
      if (!tokenRow) {
        await client.query('ROLLBACK')
        return null
      }

      if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
        await client.query('ROLLBACK')
        return null
      }

      await client.query('UPDATE verification_tokens SET consumed_at = NOW() WHERE token_hash = $1', [tokenHash])
      await client.query("UPDATE participants SET status = 'active', verified_at = NOW(), updated_at = NOW() WHERE participant_id = $1", [
        tokenRow.participant_id,
      ])
      await client.query('COMMIT')

      return {
        participantId: tokenRow.participant_id,
        email: tokenRow.email,
        displayName: tokenRow.display_name,
        soccerverseUsername: tokenRow.soccerverse_username ?? undefined,
        leagueType: tokenRow.league_type,
        primaryTeamCode: tokenRow.primary_team_code,
        secondaryTeamCode: tokenRow.secondary_team_code ?? undefined,
        status: 'active',
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: tokenRow.expires_at,
        verifiedAt: new Date().toISOString(),
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async resendVerification(email: string, plainToken: string): Promise<RegistrationCreationResult | null> {
    const existing = await this.pool.query<{
      email: string
      display_name: string
      soccerverse_username: string | null
      primary_team_code: string
      secondary_team_code: string | null
    }>(
      `
        SELECT email, display_name, soccerverse_username, primary_team_code, secondary_team_code
        FROM participants
        WHERE email = $1
      `,
      [email.trim().toLowerCase()],
    )

    const participant = existing.rows[0]
    if (!participant) {
      return null
    }

    return this.createPending(
      {
        email: participant.email,
        displayName: participant.display_name,
        soccerverseUsername: participant.soccerverse_username ?? undefined,
        primaryTeamCode: participant.primary_team_code,
        secondaryTeamCode: participant.secondary_team_code ?? undefined,
      },
      plainToken,
    )
  }

  async getCounts() {
    const result = await this.pool.query<{ status: RegistrationRecord['status']; count: string }>(
      `
        SELECT status, COUNT(*)::text AS count
        FROM participants
        GROUP BY status
      `,
    )
    const counts = Object.fromEntries(result.rows.map((row) => [row.status, Number(row.count)]))
    return {
      pending: counts.pending_verification ?? 0,
      active: counts.active ?? 0,
    }
  }
}
