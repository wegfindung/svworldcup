import { randomUUID } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { canConfirm } from '../lib/confirmationRules.js'
import { MatchImportValidationError } from '../lib/matchImportError.js'
import type {
  CreateMatchBatchInput,
  PendingMatchBatch,
  PendingMatchConfirmation,
  PendingMatchStatRow,
  UpdateMatchRowInput,
} from '../domain/types.js'

export { MatchImportValidationError }

// D4: no resolved player may appear twice in one fixture. Unresolved rows (null playerId)
// are exempt — several may coexist in the same batch.
function assertNoDuplicatePlayers(playerIds: Array<number | null>) {
  const seen = new Set<number>()
  for (const playerId of playerIds) {
    if (playerId === null) {
      continue
    }
    if (seen.has(playerId)) {
      throw new MatchImportValidationError('A fixture cannot contain the same player twice.')
    }
    seen.add(playerId)
  }
}

// Pending batch lifecycle (D2/D4/D14/D17). Promotion into admin_match_entries is deliberately
// not part of this repository — it is cross-repository orchestration wired in the tracer-bullet
// step, so this repository never writes the confirmed scoring table.
export interface MatchImportRepository {
  storageKind: 'memory' | 'postgres'
  createBatch(input: CreateMatchBatchInput): Promise<PendingMatchBatch>
  getBatch(batchId: string): Promise<PendingMatchBatch | null>
  getBatchByFixture(fixtureId: string): Promise<PendingMatchBatch | null>
  listBatches(): Promise<PendingMatchBatch[]>
  replaceBatch(fixtureId: string, input: CreateMatchBatchInput): Promise<PendingMatchBatch>
  updateRow(rowId: string, edits: UpdateMatchRowInput, editorEmail: string): Promise<PendingMatchBatch>
  addConfirmation(batchId: string, adminEmail: string): Promise<PendingMatchBatch>
  deleteBatch(batchId: string): Promise<void>
}

export class MemoryMatchImportRepository implements MatchImportRepository {
  storageKind: 'memory' = 'memory'
  private readonly batches = new Map<string, PendingMatchBatch>()

  private snapshot(batch: PendingMatchBatch): PendingMatchBatch {
    return structuredClone(batch)
  }

  private requireBatch(batchId: string): PendingMatchBatch {
    const batch = this.batches.get(batchId)
    if (!batch) {
      throw new MatchImportValidationError('Pending batch not found.')
    }
    return batch
  }

  async createBatch(input: CreateMatchBatchInput) {
    for (const batch of this.batches.values()) {
      if (batch.fixtureId === input.fixtureId) {
        throw new MatchImportValidationError('A pending batch already exists for this fixture.')
      }
    }
    assertNoDuplicatePlayers(input.rows.map((row) => row.playerId))

    const batchId = randomUUID()
    const now = new Date().toISOString()
    const rows: PendingMatchStatRow[] = input.rows.map((row) => ({
      rowId: randomUUID(),
      batchId,
      sourceName: row.sourceName,
      teamCode: row.teamCode,
      playerId: row.playerId,
      lineupStatus: row.lineupStatus,
      minutes: row.minutes,
      goals: row.goals,
      assists: row.assists,
      rating: row.rating,
      cleanSheetEligible: row.cleanSheetEligible,
    }))
    const confirmations: PendingMatchConfirmation[] = [
      {
        confirmationId: randomUUID(),
        batchId,
        adminEmail: input.createdBy,
        dataVersion: 1,
        createdAt: now,
      },
    ]
    const batch: PendingMatchBatch = {
      batchId,
      fixtureId: input.fixtureId,
      sourceUrl: input.sourceUrl,
      homeGoals: input.homeGoals,
      awayGoals: input.awayGoals,
      dataVersion: 1,
      createdBy: input.createdBy,
      lastEditedBy: undefined,
      createdAt: now,
      updatedAt: now,
      rows,
      confirmations,
    }
    this.batches.set(batchId, batch)
    return this.snapshot(batch)
  }

  async getBatch(batchId: string) {
    const batch = this.batches.get(batchId)
    return batch ? this.snapshot(batch) : null
  }

  async getBatchByFixture(fixtureId: string) {
    for (const batch of this.batches.values()) {
      if (batch.fixtureId === fixtureId) {
        return this.snapshot(batch)
      }
    }
    return null
  }

  async listBatches() {
    return [...this.batches.values()].map((batch) => this.snapshot(batch))
  }

  async replaceBatch(fixtureId: string, input: CreateMatchBatchInput) {
    for (const [batchId, batch] of this.batches.entries()) {
      if (batch.fixtureId === fixtureId) {
        this.batches.delete(batchId)
      }
    }
    return this.createBatch({ ...input, fixtureId })
  }

  async updateRow(rowId: string, edits: UpdateMatchRowInput, editorEmail: string) {
    for (const batch of this.batches.values()) {
      const row = batch.rows.find((candidate) => candidate.rowId === rowId)
      if (!row) {
        continue
      }

      const nextPlayerId = edits.playerId === undefined ? row.playerId : edits.playerId
      assertNoDuplicatePlayers(
        batch.rows.map((candidate) => (candidate.rowId === rowId ? nextPlayerId : candidate.playerId)),
      )

      row.playerId = nextPlayerId
      if (edits.lineupStatus !== undefined) row.lineupStatus = edits.lineupStatus
      if (edits.minutes !== undefined) row.minutes = edits.minutes
      if (edits.goals !== undefined) row.goals = edits.goals
      if (edits.assists !== undefined) row.assists = edits.assists
      if (edits.rating !== undefined) row.rating = edits.rating
      if (edits.cleanSheetEligible !== undefined) row.cleanSheetEligible = edits.cleanSheetEligible

      batch.dataVersion += 1
      batch.lastEditedBy = editorEmail
      batch.updatedAt = new Date().toISOString()
      return this.snapshot(batch)
    }
    throw new MatchImportValidationError('Pending batch row not found.')
  }

  async addConfirmation(batchId: string, adminEmail: string) {
    const batch = this.requireBatch(batchId)
    const check = canConfirm(batch, adminEmail)
    if (!check.allowed) {
      throw new MatchImportValidationError(check.reason ?? 'This admin cannot confirm the batch.')
    }
    batch.confirmations.push({
      confirmationId: randomUUID(),
      batchId,
      adminEmail,
      dataVersion: batch.dataVersion,
      createdAt: new Date().toISOString(),
    })
    return this.snapshot(batch)
  }

  async deleteBatch(batchId: string) {
    this.batches.delete(batchId)
  }
}

interface BatchRow {
  batch_id: string
  fixture_id: string
  source_url: string
  home_goals: number | null
  away_goals: number | null
  data_version: number
  created_by: string
  last_edited_by: string | null
  created_at: string
  updated_at: string
}

interface StatRow {
  row_id: string
  batch_id: string
  source_name: string
  team_code: string
  player_id: string | null
  lineup_status: 'starter' | 'substitute'
  minutes: number
  goals: number
  assists: number
  rating: string | null
  clean_sheet_eligible: boolean
}

interface ConfirmationRow {
  confirmation_id: string
  batch_id: string
  admin_email: string
  data_version: number
  created_at: string
}

function mapStatRow(row: StatRow): PendingMatchStatRow {
  return {
    rowId: row.row_id,
    batchId: row.batch_id,
    sourceName: row.source_name,
    teamCode: row.team_code,
    playerId: row.player_id === null ? null : Number(row.player_id),
    lineupStatus: row.lineup_status,
    minutes: row.minutes,
    goals: row.goals,
    assists: row.assists,
    rating: row.rating === null ? undefined : Number(row.rating),
    cleanSheetEligible: row.clean_sheet_eligible,
  }
}

function mapConfirmationRow(row: ConfirmationRow): PendingMatchConfirmation {
  return {
    confirmationId: row.confirmation_id,
    batchId: row.batch_id,
    adminEmail: row.admin_email,
    dataVersion: row.data_version,
    createdAt: row.created_at,
  }
}

type Queryable = Pool | PoolClient

async function loadBatch(executor: Queryable, batchId: string): Promise<PendingMatchBatch | null> {
  const batchResult = await executor.query<BatchRow>(
    `
      SELECT batch_id, fixture_id, source_url, home_goals, away_goals, data_version,
             created_by, last_edited_by, created_at, updated_at
      FROM pending_match_batches
      WHERE batch_id = $1
    `,
    [batchId],
  )
  const batch = batchResult.rows[0]
  if (!batch) {
    return null
  }

  const rowsResult = await executor.query<StatRow>(
    `
      SELECT row_id, batch_id, source_name, team_code, player_id, lineup_status, minutes, goals, assists, rating, clean_sheet_eligible
      FROM pending_match_stat_rows
      WHERE batch_id = $1
      ORDER BY created_at, row_id
    `,
    [batchId],
  )
  const confirmationsResult = await executor.query<ConfirmationRow>(
    `
      SELECT confirmation_id, batch_id, admin_email, data_version, created_at
      FROM pending_match_confirmations
      WHERE batch_id = $1
      ORDER BY created_at
    `,
    [batchId],
  )

  return {
    batchId: batch.batch_id,
    fixtureId: batch.fixture_id,
    sourceUrl: batch.source_url,
    homeGoals: batch.home_goals ?? 0,
    awayGoals: batch.away_goals ?? 0,
    dataVersion: batch.data_version,
    createdBy: batch.created_by,
    lastEditedBy: batch.last_edited_by ?? undefined,
    createdAt: batch.created_at,
    updatedAt: batch.updated_at,
    rows: rowsResult.rows.map(mapStatRow),
    confirmations: confirmationsResult.rows.map(mapConfirmationRow),
  }
}

async function insertBatch(client: PoolClient, input: CreateMatchBatchInput): Promise<string> {
  assertNoDuplicatePlayers(input.rows.map((row) => row.playerId))

  const batchResult = await client.query<{ batch_id: string }>(
    `
      INSERT INTO pending_match_batches (fixture_id, source_url, home_goals, away_goals, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING batch_id
    `,
    [input.fixtureId, input.sourceUrl, input.homeGoals, input.awayGoals, input.createdBy],
  )
  const batchId = batchResult.rows[0].batch_id

  for (const row of input.rows) {
    await client.query(
      `
        INSERT INTO pending_match_stat_rows (
          batch_id, source_name, team_code, player_id, lineup_status, minutes, goals, assists, rating, clean_sheet_eligible
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        batchId,
        row.sourceName,
        row.teamCode,
        row.playerId,
        row.lineupStatus,
        row.minutes,
        row.goals,
        row.assists,
        row.rating ?? null,
        row.cleanSheetEligible,
      ],
    )
  }

  // D5: importing counts as the importer's confirmation, recorded at data version 1.
  await client.query(
    `
      INSERT INTO pending_match_confirmations (batch_id, admin_email, data_version)
      VALUES ($1, $2, 1)
    `,
    [batchId, input.createdBy],
  )

  return batchId
}

export class PostgresMatchImportRepository implements MatchImportRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(private readonly pool: Pool) {}

  async createBatch(input: CreateMatchBatchInput) {
    const existing = await this.pool.query<{ batch_id: string }>(
      'SELECT batch_id FROM pending_match_batches WHERE fixture_id = $1',
      [input.fixtureId],
    )
    if (existing.rows.length > 0) {
      throw new MatchImportValidationError('A pending batch already exists for this fixture.')
    }

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const batchId = await insertBatch(client, input)
      await client.query('COMMIT')
      return (await loadBatch(this.pool, batchId)) as PendingMatchBatch
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async getBatch(batchId: string) {
    return loadBatch(this.pool, batchId)
  }

  async getBatchByFixture(fixtureId: string) {
    const result = await this.pool.query<{ batch_id: string }>(
      'SELECT batch_id FROM pending_match_batches WHERE fixture_id = $1',
      [fixtureId],
    )
    const batchId = result.rows[0]?.batch_id
    return batchId ? loadBatch(this.pool, batchId) : null
  }

  async listBatches() {
    const result = await this.pool.query<{ batch_id: string }>(
      'SELECT batch_id FROM pending_match_batches ORDER BY created_at',
    )
    const batches: PendingMatchBatch[] = []
    for (const row of result.rows) {
      const batch = await loadBatch(this.pool, row.batch_id)
      if (batch) {
        batches.push(batch)
      }
    }
    return batches
  }

  async replaceBatch(fixtureId: string, input: CreateMatchBatchInput) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM pending_match_batches WHERE fixture_id = $1', [fixtureId])
      const batchId = await insertBatch(client, { ...input, fixtureId })
      await client.query('COMMIT')
      return (await loadBatch(this.pool, batchId)) as PendingMatchBatch
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async updateRow(rowId: string, edits: UpdateMatchRowInput, editorEmail: string) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const rowResult = await client.query<StatRow>(
        `
          SELECT row_id, batch_id, source_name, team_code, player_id, lineup_status, minutes, goals, assists, rating, clean_sheet_eligible
          FROM pending_match_stat_rows
          WHERE row_id = $1
          FOR UPDATE
        `,
        [rowId],
      )
      const current = rowResult.rows[0]
      if (!current) {
        throw new MatchImportValidationError('Pending batch row not found.')
      }
      const row = mapStatRow(current)
      const next: PendingMatchStatRow = {
        ...row,
        playerId: edits.playerId === undefined ? row.playerId : edits.playerId,
        lineupStatus: edits.lineupStatus ?? row.lineupStatus,
        minutes: edits.minutes ?? row.minutes,
        goals: edits.goals ?? row.goals,
        assists: edits.assists ?? row.assists,
        rating: edits.rating === undefined ? row.rating : edits.rating,
        cleanSheetEligible: edits.cleanSheetEligible ?? row.cleanSheetEligible,
      }

      const siblingResult = await client.query<{ player_id: string | null }>(
        'SELECT player_id FROM pending_match_stat_rows WHERE batch_id = $1 AND row_id <> $2',
        [row.batchId, rowId],
      )
      assertNoDuplicatePlayers([
        next.playerId,
        ...siblingResult.rows.map((sibling) => (sibling.player_id === null ? null : Number(sibling.player_id))),
      ])

      await client.query(
        `
          UPDATE pending_match_stat_rows
          SET player_id = $2, lineup_status = $3, minutes = $4, goals = $5, assists = $6,
              rating = $7, clean_sheet_eligible = $8, updated_at = NOW()
          WHERE row_id = $1
        `,
        [
          rowId,
          next.playerId,
          next.lineupStatus,
          next.minutes,
          next.goals,
          next.assists,
          next.rating ?? null,
          next.cleanSheetEligible,
        ],
      )
      // D17: every edit bumps the version, which staleness-voids all prior confirmations.
      await client.query(
        `
          UPDATE pending_match_batches
          SET data_version = data_version + 1, last_edited_by = $2, updated_at = NOW()
          WHERE batch_id = $1
        `,
        [row.batchId, editorEmail],
      )
      await client.query('COMMIT')
      return (await loadBatch(this.pool, row.batchId)) as PendingMatchBatch
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async addConfirmation(batchId: string, adminEmail: string) {
    const batch = await loadBatch(this.pool, batchId)
    if (!batch) {
      throw new MatchImportValidationError('Pending batch not found.')
    }
    const check = canConfirm(batch, adminEmail)
    if (!check.allowed) {
      throw new MatchImportValidationError(check.reason ?? 'This admin cannot confirm the batch.')
    }
    await this.pool.query(
      `
        INSERT INTO pending_match_confirmations (batch_id, admin_email, data_version)
        VALUES ($1, $2, $3)
        ON CONFLICT (batch_id, admin_email, data_version) DO NOTHING
      `,
      [batchId, adminEmail, batch.dataVersion],
    )
    return (await loadBatch(this.pool, batchId)) as PendingMatchBatch
  }

  async deleteBatch(batchId: string) {
    await this.pool.query('DELETE FROM pending_match_batches WHERE batch_id = $1', [batchId])
  }
}
