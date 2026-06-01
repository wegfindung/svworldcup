import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import type { Queryable } from '../lib/db.js'
import type { AuditLogEntry, AuditLogInput } from '../domain/types.js'

// Append-only audit log for durable admin/participant writes. The actions that must be recorded
// here are enumerated in architecture/SOP_system_overview.md ("Audit log entries are required for"):
// the match-import lifecycle, admin login/logout, team-pool edits, reveal actions, score-config
// changes, verification resends, multi-accounting review status changes, league changes, and
// email-marketing campaign writes (save/delete/send-now/run-due/test).
export interface AuditRepository {
  storageKind: 'memory' | 'postgres'
  // executor lets promotion write the `match_import.promote` row on its transactional client, so the
  // audit row commits atomically with the promoted rows + batch delete — see matchPromotion.ts.
  record(input: AuditLogInput, executor?: Queryable): Promise<AuditLogEntry>
  list(): Promise<AuditLogEntry[]>
}

export class MemoryAuditRepository implements AuditRepository {
  storageKind: 'memory' = 'memory'
  private readonly entries: AuditLogEntry[] = []

  async record(input: AuditLogInput) {
    const entry: AuditLogEntry = {
      auditId: randomUUID(),
      actorEmail: input.actorEmail,
      actionKey: input.actionKey,
      entityType: input.entityType,
      entityId: input.entityId,
      detail: input.detail ?? {},
      createdAt: new Date().toISOString(),
    }
    this.entries.push(entry)
    return entry
  }

  async list() {
    return [...this.entries]
  }
}

interface AuditRow {
  audit_id: string
  actor_email: string
  action_key: string
  entity_type: string
  entity_id: string
  detail_json: Record<string, unknown>
  created_at: string
}

function mapAuditRow(row: AuditRow): AuditLogEntry {
  return {
    auditId: row.audit_id,
    actorEmail: row.actor_email,
    actionKey: row.action_key,
    entityType: row.entity_type,
    entityId: row.entity_id,
    detail: row.detail_json,
    createdAt: row.created_at,
  }
}

export class PostgresAuditRepository implements AuditRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(private readonly pool: Pool) {}

  async record(input: AuditLogInput, executor?: Queryable) {
    const result = await (executor ?? this.pool).query<AuditRow>(
      `
        INSERT INTO audit_logs (actor_email, action_key, entity_type, entity_id, detail_json)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING audit_id, actor_email, action_key, entity_type, entity_id, detail_json, created_at
      `,
      [input.actorEmail, input.actionKey, input.entityType, input.entityId, input.detail ?? {}],
    )
    return mapAuditRow(result.rows[0])
  }

  async list() {
    const result = await this.pool.query<AuditRow>(
      `
        SELECT audit_id, actor_email, action_key, entity_type, entity_id, detail_json, created_at
        FROM audit_logs
        ORDER BY created_at
      `,
    )
    return result.rows.map(mapAuditRow)
  }
}
