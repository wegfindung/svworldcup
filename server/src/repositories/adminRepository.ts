import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { env } from '../config/env.js'
import type { AdminProfile } from '../domain/types.js'
import { hashPassword, verifyPassword } from '../lib/passwords.js'
import { hashToken } from '../lib/tokens.js'

interface AdminRow extends AdminProfile {
  passwordHash?: string
}

export interface AdminRepository {
  storageKind: 'memory' | 'postgres'
  authenticate(email: string, password: string): Promise<AdminProfile | null>
  createSession(adminId: string, plainToken: string, ttlSeconds: number): Promise<void>
  getAdminBySessionToken(plainToken: string): Promise<AdminProfile | null>
  revokeSession(plainToken: string): Promise<void>
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function isAllowlisted(email: string) {
  return env.ADMIN_BOOTSTRAP_EMAILS.includes(normalizeEmail(email))
}

function verifyBootstrapPassword(password: string) {
  return Boolean(env.ADMIN_BOOTSTRAP_PASSWORD && password === env.ADMIN_BOOTSTRAP_PASSWORD)
}

interface MemoryAdminSession {
  sessionId: string
  adminId: string
  tokenHash: string
  expiresAt: string
}

export class MemoryAdminRepository implements AdminRepository {
  storageKind: 'memory' = 'memory'
  private readonly admins = new Map<string, AdminRow>()
  private readonly sessions = new Map<string, MemoryAdminSession>()

  async authenticate(email: string, password: string) {
    const normalizedEmail = normalizeEmail(email)
    let admin = this.admins.get(normalizedEmail)

    if (!admin && isAllowlisted(normalizedEmail) && verifyBootstrapPassword(password)) {
      admin = {
        adminId: randomUUID(),
        email: normalizedEmail,
        isActive: true,
        passwordHash: hashPassword(password),
      }
      this.admins.set(normalizedEmail, admin)
    }

    if (!admin?.isActive) {
      return null
    }

    if (!verifyPassword(password, admin.passwordHash)) {
      if (isAllowlisted(normalizedEmail) && verifyBootstrapPassword(password)) {
        admin.passwordHash = hashPassword(password)
        this.admins.set(normalizedEmail, admin)
      } else {
        return null
      }
    }

    return {
      adminId: admin.adminId,
      email: admin.email,
      isActive: admin.isActive,
    }
  }

  async createSession(adminId: string, plainToken: string, ttlSeconds: number) {
    const tokenHash = hashToken(plainToken)
    this.sessions.set(tokenHash, {
      sessionId: randomUUID(),
      adminId,
      tokenHash,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    })
  }

  async getAdminBySessionToken(plainToken: string) {
    const tokenHash = hashToken(plainToken)
    const session = this.sessions.get(tokenHash)
    if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
      return null
    }

    const admin = [...this.admins.values()].find((item) => item.adminId === session.adminId)
    if (!admin?.isActive) {
      return null
    }

    return {
      adminId: admin.adminId,
      email: admin.email,
      isActive: admin.isActive,
    }
  }

  async revokeSession(plainToken: string) {
    this.sessions.delete(hashToken(plainToken))
  }
}

export class PostgresAdminRepository implements AdminRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(private readonly pool: Pool) {}

  async authenticate(email: string, password: string) {
    const normalizedEmail = normalizeEmail(email)
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const result = await client.query<{
        admin_id: string
        email: string
        password_hash: string | null
        is_active: boolean
      }>(
        `
          SELECT admin_id, email, password_hash, is_active
          FROM admins
          WHERE email = $1
          FOR UPDATE
        `,
        [normalizedEmail],
      )

      let admin = result.rows[0]
      if (!admin && isAllowlisted(normalizedEmail) && verifyBootstrapPassword(password)) {
        const inserted = await client.query<{
          admin_id: string
          email: string
          password_hash: string
          is_active: boolean
        }>(
          `
            INSERT INTO admins (email, password_hash, is_active, updated_at)
            VALUES ($1, $2, TRUE, NOW())
            RETURNING admin_id, email, password_hash, is_active
          `,
          [normalizedEmail, hashPassword(password)],
        )
        admin = inserted.rows[0]
      }

      if (!admin?.is_active) {
        await client.query('ROLLBACK')
        return null
      }

      let passwordValid = verifyPassword(password, admin.password_hash)
      if (!passwordValid && isAllowlisted(normalizedEmail) && verifyBootstrapPassword(password)) {
        const nextHash = hashPassword(password)
        const updated = await client.query<{
          admin_id: string
          email: string
          password_hash: string
          is_active: boolean
        }>(
          `
            UPDATE admins
            SET password_hash = $2, updated_at = NOW()
            WHERE admin_id = $1
            RETURNING admin_id, email, password_hash, is_active
          `,
          [admin.admin_id, nextHash],
        )
        admin = updated.rows[0]
        passwordValid = true
      }

      if (!passwordValid) {
        await client.query('ROLLBACK')
        return null
      }

      await client.query('COMMIT')
      return {
        adminId: admin.admin_id,
        email: admin.email,
        isActive: admin.is_active,
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async createSession(adminId: string, plainToken: string, ttlSeconds: number) {
    const tokenHash = hashToken(plainToken)
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()

    await this.pool.query(
      `
        INSERT INTO admin_sessions (admin_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `,
      [adminId, tokenHash, expiresAt],
    )
  }

  async getAdminBySessionToken(plainToken: string) {
    const result = await this.pool.query<{
      admin_id: string
      email: string
      is_active: boolean
    }>(
      `
        SELECT a.admin_id, a.email, a.is_active
        FROM admin_sessions s
        JOIN admins a ON a.admin_id = s.admin_id
        WHERE s.token_hash = $1
          AND s.revoked_at IS NULL
          AND s.expires_at > NOW()
        LIMIT 1
      `,
      [hashToken(plainToken)],
    )

    const row = result.rows[0]
    if (!row || !row.is_active) {
      return null
    }

    return {
      adminId: row.admin_id,
      email: row.email,
      isActive: row.is_active,
    }
  }

  async revokeSession(plainToken: string) {
    await this.pool.query('UPDATE admin_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL', [
      hashToken(plainToken),
    ])
  }
}
