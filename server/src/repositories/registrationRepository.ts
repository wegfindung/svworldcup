import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { verifyPassword } from '../lib/passwords.js'
import { hashToken } from '../lib/tokens.js'
import type {
  LeagueType,
  ParticipantProfile,
  RegistrationCreationResult,
  RegistrationInput,
  RegistrationRecord,
} from '../domain/types.js'

export class ActiveRegistrationExistsError extends Error {
  constructor(message = 'Registration is already active for this email address.') {
    super(message)
    this.name = 'ActiveRegistrationExistsError'
  }
}

export interface RegistrationRepository {
  storageKind: 'memory' | 'postgres'
  createPending(input: RegistrationInput, plainToken: string): Promise<RegistrationCreationResult>
  verifyByPlainToken(plainToken: string): Promise<ParticipantProfile | null>
  resendVerification(email: string, plainToken: string): Promise<RegistrationCreationResult | null>
  authenticateWithPassword(email: string, password: string): Promise<ParticipantProfile | null>
  setPassword(participantId: string, passwordHash: string): Promise<ParticipantProfile | null>
  createPasswordReset(email: string, plainToken: string): Promise<ParticipantProfile | null>
  resetPasswordByPlainToken(plainToken: string, passwordHash: string): Promise<ParticipantProfile | null>
  getByParticipantId(participantId: string): Promise<ParticipantProfile | null>
  getByEmail(email: string): Promise<ParticipantProfile | null>
  getCounts(): Promise<{ pending: number; active: number }>
}

interface ParticipantRow {
  participant_id: string
  email: string
  display_name: string
  soccerverse_username: string | null
  league_type: LeagueType
  primary_team_code: string
  secondary_team_code: string | null
  status: RegistrationRecord['status']
  verified_at: string | null
  has_password: boolean
}

interface MemoryPasswordResetRecord {
  participantId: string
  tokenHash: string
  expiresAt: string
}

function deriveLeagueType(soccerverseUsername?: string): LeagueType {
  return soccerverseUsername?.trim() ? 'veteran' : 'rookie'
}

function expiryIso(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString()
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function toParticipantProfile(record: RegistrationRecord): ParticipantProfile {
  return {
    participantId: record.participantId,
    email: record.email,
    displayName: record.displayName,
    soccerverseUsername: record.soccerverseUsername,
    leagueType: record.leagueType,
    primaryTeamCode: record.primaryTeamCode,
    secondaryTeamCode: record.secondaryTeamCode,
    status: record.status,
    verifiedAt: record.verifiedAt,
    hasPassword: record.hasPassword,
  }
}

function mapParticipantRow(row: ParticipantRow): ParticipantProfile {
  return {
    participantId: row.participant_id,
    email: row.email,
    displayName: row.display_name,
    soccerverseUsername: row.soccerverse_username ?? undefined,
    leagueType: row.league_type,
    primaryTeamCode: row.primary_team_code,
    secondaryTeamCode: row.secondary_team_code ?? undefined,
    status: row.status,
    verifiedAt: row.verified_at ?? undefined,
    hasPassword: row.has_password,
  }
}

export class MemoryRegistrationRepository implements RegistrationRepository {
  storageKind: 'memory' = 'memory'
  private readonly byEmail = new Map<string, RegistrationRecord>()
  private readonly byTokenHash = new Map<string, string>()
  private readonly passwordHashes = new Map<string, string>()
  private readonly passwordResetByTokenHash = new Map<string, MemoryPasswordResetRecord>()

  private attachPasswordState(record: RegistrationRecord): RegistrationRecord {
    return {
      ...record,
      hasPassword: this.passwordHashes.has(record.participantId),
    }
  }

  async createPending(input: RegistrationInput, plainToken: string): Promise<RegistrationCreationResult> {
    const email = normalizeEmail(input.email)
    const tokenHash = hashToken(plainToken)
    const leagueType = deriveLeagueType(input.soccerverseUsername)
    const existing = this.byEmail.get(email)

    if (existing?.status === 'active') {
      throw new ActiveRegistrationExistsError()
    }

    const participantId = existing?.participantId ?? randomUUID()
    const record = this.attachPasswordState({
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
      hasPassword: false,
    })

    this.byEmail.set(email, record)
    this.byTokenHash.set(tokenHash, email)
    return { record, plainToken }
  }

  async verifyByPlainToken(plainToken: string): Promise<ParticipantProfile | null> {
    const tokenHash = hashToken(plainToken)
    const email = this.byTokenHash.get(tokenHash)
    if (!email) {
      return null
    }

    const record = this.byEmail.get(email)
    if (!record || record.verificationTokenHash !== tokenHash) {
      return null
    }

    if (new Date(record.verificationTokenExpiresAt).getTime() < Date.now()) {
      return null
    }

    const nextRecord = this.attachPasswordState({
      ...record,
      status: record.status === 'pending_verification' ? 'active' : record.status,
      verifiedAt: record.verifiedAt ?? new Date().toISOString(),
    })
    this.byEmail.set(email, nextRecord)
    return toParticipantProfile(nextRecord)
  }

  async resendVerification(email: string, plainToken: string): Promise<RegistrationCreationResult | null> {
    const normalizedEmail = normalizeEmail(email)
    const existing = this.byEmail.get(normalizedEmail)
    if (!existing) {
      return null
    }

    const tokenHash = hashToken(plainToken)
    const nextRecord = this.attachPasswordState({
      ...existing,
      verificationTokenHash: tokenHash,
      verificationTokenExpiresAt: expiryIso(48),
    })

    this.byEmail.set(normalizedEmail, nextRecord)
    this.byTokenHash.set(tokenHash, normalizedEmail)
    return { record: nextRecord, plainToken }
  }

  async authenticateWithPassword(email: string, password: string) {
    const record = this.byEmail.get(normalizeEmail(email))
    if (!record || record.status !== 'active') {
      return null
    }

    const passwordHash = this.passwordHashes.get(record.participantId)
    if (!verifyPassword(password, passwordHash)) {
      return null
    }

    return toParticipantProfile(this.attachPasswordState(record))
  }

  async setPassword(participantId: string, passwordHash: string) {
    const record = [...this.byEmail.values()].find((item) => item.participantId === participantId)
    if (!record) {
      return null
    }

    this.passwordHashes.set(participantId, passwordHash)
    const nextRecord = this.attachPasswordState(record)
    this.byEmail.set(nextRecord.email, nextRecord)
    return toParticipantProfile(nextRecord)
  }

  async createPasswordReset(email: string, plainToken: string) {
    const record = this.byEmail.get(normalizeEmail(email))
    if (!record || record.status !== 'active') {
      return null
    }

    const tokenHash = hashToken(plainToken)
    this.passwordResetByTokenHash.set(tokenHash, {
      participantId: record.participantId,
      tokenHash,
      expiresAt: expiryIso(2),
    })

    return toParticipantProfile(this.attachPasswordState(record))
  }

  async resetPasswordByPlainToken(plainToken: string, passwordHash: string) {
    const tokenHash = hashToken(plainToken)
    const tokenRecord = this.passwordResetByTokenHash.get(tokenHash)
    if (!tokenRecord || new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
      return null
    }

    const record = [...this.byEmail.values()].find((item) => item.participantId === tokenRecord.participantId)
    if (!record) {
      return null
    }

    this.passwordHashes.set(record.participantId, passwordHash)
    this.passwordResetByTokenHash.delete(tokenHash)
    const nextRecord = this.attachPasswordState(record)
    this.byEmail.set(nextRecord.email, nextRecord)
    return toParticipantProfile(nextRecord)
  }

  async getByParticipantId(participantId: string) {
    const record = [...this.byEmail.values()].find((item) => item.participantId === participantId)
    return record ? toParticipantProfile(this.attachPasswordState(record)) : null
  }

  async getByEmail(email: string) {
    const record = this.byEmail.get(normalizeEmail(email))
    return record ? toParticipantProfile(this.attachPasswordState(record)) : null
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
    const email = normalizeEmail(input.email)
    const tokenHash = hashToken(plainToken)
    const leagueType = deriveLeagueType(input.soccerverseUsername)
    const expiresAt = expiryIso(48)
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const existingResult = await client.query<{
        participant_id: string
        status: RegistrationRecord['status']
      }>(
        `
          SELECT participant_id, status
          FROM participants
          WHERE email = $1
          FOR UPDATE
        `,
        [email],
      )

      const existing = existingResult.rows[0]
      if (existing?.status === 'active') {
        throw new ActiveRegistrationExistsError()
      }

      const participantResult = await client.query<
        ParticipantRow & {
          verification_token_hash: string
          verification_token_expires_at: string
        }
      >(
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
          RETURNING
            participant_id,
            email,
            display_name,
            soccerverse_username,
            league_type,
            primary_team_code,
            secondary_team_code,
            status,
            verified_at,
            (password_hash IS NOT NULL) AS has_password
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
          verifiedAt: participant.verified_at ?? undefined,
          hasPassword: participant.has_password,
        },
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async verifyByPlainToken(plainToken: string): Promise<ParticipantProfile | null> {
    const tokenHash = hashToken(plainToken)
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const tokenResult = await client.query<
        ParticipantRow & {
          expires_at: string
        }
      >(
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
            p.verified_at,
            (p.password_hash IS NOT NULL) AS has_password,
            vt.expires_at
          FROM verification_tokens vt
          JOIN participants p ON p.participant_id = vt.participant_id
          WHERE vt.token_hash = $1
            AND vt.consumed_at IS NULL
          FOR UPDATE
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

      let profile = mapParticipantRow(tokenRow)
      if (tokenRow.status === 'pending_verification') {
        const updated = await client.query<ParticipantRow>(
          `
            UPDATE participants
            SET status = 'active', verified_at = NOW(), updated_at = NOW()
            WHERE participant_id = $1
            RETURNING
              participant_id,
              email,
              display_name,
              soccerverse_username,
              league_type,
              primary_team_code,
              secondary_team_code,
              status,
              verified_at,
              (password_hash IS NOT NULL) AS has_password
          `,
          [tokenRow.participant_id],
        )
        profile = mapParticipantRow(updated.rows[0])
      }

      await client.query('COMMIT')
      return profile
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async resendVerification(email: string, plainToken: string): Promise<RegistrationCreationResult | null> {
    const normalizedEmail = normalizeEmail(email)
    const tokenHash = hashToken(plainToken)
    const expiresAt = expiryIso(48)
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const existing = await client.query<ParticipantRow>(
        `
          SELECT
            participant_id,
            email,
            display_name,
            soccerverse_username,
            league_type,
            primary_team_code,
            secondary_team_code,
            status,
            verified_at,
            (password_hash IS NOT NULL) AS has_password
          FROM participants
          WHERE email = $1
          FOR UPDATE
        `,
        [normalizedEmail],
      )

      const participant = existing.rows[0]
      if (!participant) {
        await client.query('ROLLBACK')
        return null
      }

      await client.query('UPDATE verification_tokens SET consumed_at = NOW() WHERE participant_id = $1 AND consumed_at IS NULL', [
        participant.participant_id,
      ])
      await client.query('UPDATE participants SET verification_sent_at = NOW(), updated_at = NOW() WHERE participant_id = $1', [
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
          verifiedAt: participant.verified_at ?? undefined,
          hasPassword: participant.has_password,
        },
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async authenticateWithPassword(email: string, password: string) {
    const result = await this.pool.query<
      ParticipantRow & {
        password_hash: string | null
      }
    >(
      `
        SELECT
          participant_id,
          email,
          display_name,
          soccerverse_username,
          league_type,
          primary_team_code,
          secondary_team_code,
          status,
          verified_at,
          password_hash,
          (password_hash IS NOT NULL) AS has_password
        FROM participants
        WHERE email = $1
          AND status = 'active'
        LIMIT 1
      `,
      [normalizeEmail(email)],
    )
    const row = result.rows[0]
    if (!row || !verifyPassword(password, row.password_hash)) {
      return null
    }

    return mapParticipantRow(row)
  }

  async setPassword(participantId: string, passwordHash: string) {
    const result = await this.pool.query<ParticipantRow>(
      `
        UPDATE participants
        SET password_hash = $2, password_set_at = NOW(), updated_at = NOW()
        WHERE participant_id = $1
        RETURNING
          participant_id,
          email,
          display_name,
          soccerverse_username,
          league_type,
          primary_team_code,
          secondary_team_code,
          status,
          verified_at,
          (password_hash IS NOT NULL) AS has_password
      `,
      [participantId, passwordHash],
    )
    const row = result.rows[0]
    return row ? mapParticipantRow(row) : null
  }

  async createPasswordReset(email: string, plainToken: string) {
    const normalizedEmail = normalizeEmail(email)
    const tokenHash = hashToken(plainToken)
    const expiresAt = expiryIso(2)
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const existing = await client.query<ParticipantRow>(
        `
          SELECT
            participant_id,
            email,
            display_name,
            soccerverse_username,
            league_type,
            primary_team_code,
            secondary_team_code,
            status,
            verified_at,
            (password_hash IS NOT NULL) AS has_password
          FROM participants
          WHERE email = $1
            AND status = 'active'
          FOR UPDATE
        `,
        [normalizedEmail],
      )

      const participant = existing.rows[0]
      if (!participant) {
        await client.query('ROLLBACK')
        return null
      }

      await client.query(
        'UPDATE participant_password_reset_tokens SET consumed_at = NOW() WHERE participant_id = $1 AND consumed_at IS NULL',
        [participant.participant_id],
      )
      await client.query(
        `
          INSERT INTO participant_password_reset_tokens (participant_id, token_hash, expires_at)
          VALUES ($1, $2, $3)
        `,
        [participant.participant_id, tokenHash, expiresAt],
      )
      await client.query('COMMIT')

      return mapParticipantRow(participant)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async resetPasswordByPlainToken(plainToken: string, passwordHash: string) {
    const tokenHash = hashToken(plainToken)
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const tokenResult = await client.query<
        ParticipantRow & {
          expires_at: string
        }
      >(
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
            p.verified_at,
            (p.password_hash IS NOT NULL) AS has_password,
            prt.expires_at
          FROM participant_password_reset_tokens prt
          JOIN participants p ON p.participant_id = prt.participant_id
          WHERE prt.token_hash = $1
            AND prt.consumed_at IS NULL
          FOR UPDATE
        `,
        [tokenHash],
      )

      const tokenRow = tokenResult.rows[0]
      if (!tokenRow || new Date(tokenRow.expires_at).getTime() < Date.now()) {
        await client.query('ROLLBACK')
        return null
      }

      await client.query(
        'UPDATE participant_password_reset_tokens SET consumed_at = NOW() WHERE token_hash = $1 AND consumed_at IS NULL',
        [tokenHash],
      )
      const updated = await client.query<ParticipantRow>(
        `
          UPDATE participants
          SET password_hash = $2, password_set_at = NOW(), updated_at = NOW()
          WHERE participant_id = $1
          RETURNING
            participant_id,
            email,
            display_name,
            soccerverse_username,
            league_type,
            primary_team_code,
            secondary_team_code,
            status,
            verified_at,
            (password_hash IS NOT NULL) AS has_password
        `,
        [tokenRow.participant_id, passwordHash],
      )
      await client.query('COMMIT')
      return mapParticipantRow(updated.rows[0])
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async getByParticipantId(participantId: string) {
    const result = await this.pool.query<ParticipantRow>(
      `
        SELECT
          participant_id,
          email,
          display_name,
          soccerverse_username,
          league_type,
          primary_team_code,
          secondary_team_code,
          status,
          verified_at,
          (password_hash IS NOT NULL) AS has_password
        FROM participants
        WHERE participant_id = $1
      `,
      [participantId],
    )
    const row = result.rows[0]
    return row ? mapParticipantRow(row) : null
  }

  async getByEmail(email: string) {
    const result = await this.pool.query<ParticipantRow>(
      `
        SELECT
          participant_id,
          email,
          display_name,
          soccerverse_username,
          league_type,
          primary_team_code,
          secondary_team_code,
          status,
          verified_at,
          (password_hash IS NOT NULL) AS has_password
        FROM participants
        WHERE email = $1
      `,
      [normalizeEmail(email)],
    )
    const row = result.rows[0]
    return row ? mapParticipantRow(row) : null
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
