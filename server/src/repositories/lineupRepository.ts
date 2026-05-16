import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { STARTING_BUDGET, formationSlots, getSlotDefinition } from '../data/formation.js'
import { getPositionClasses, isEligibleForSlot } from '../data/positionClasses.js'
import { getCapCostForRating } from '../data/salaryTable.js'
import type { AssignPlayerInput, ParticipantLineup, TeamPoolPlayer, SlotClass } from '../domain/types.js'
import type { TeamPoolRepository } from './teamPoolRepository.js'

function defaultPlayerImageUrl(playerId: number) {
  return `https://elrincondeldt.com/sv/photos/players/${playerId}.png`
}

function buildSlotState(assignedPlayers: Map<string, TeamPoolPlayer | null>): ParticipantLineup['slots'] {
  return formationSlots.map((slot) => ({
    ...slot,
    player: assignedPlayers.get(slot.key) ?? null,
  }))
}

function createEmptyLineup(participantId: string, fixtureId: string): ParticipantLineup {
  const assignedPlayers = new Map<string, TeamPoolPlayer | null>()
  for (const slot of formationSlots) {
    assignedPlayers.set(slot.key, null)
  }

  return {
    lineupId: randomUUID(),
    participantId,
    fixtureId,
    budgetLimit: STARTING_BUDGET,
    budgetUsed: 0,
    budgetRemaining: STARTING_BUDGET,
    isLocked: false,
    slots: buildSlotState(assignedPlayers),
  }
}

export interface LineupScoreSlot {
  participantId: string
  fixtureId: string
  slotKey: string
  slotGroup: 'starter' | 'sub'
  slotClass: SlotClass
  playerId: number
}

export class LineupValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LineupValidationError'
  }
}

export interface LineupRepository {
  storageKind: 'memory' | 'postgres'
  getOrCreate(participantId: string, fixtureId: string): Promise<ParticipantLineup>
  assignPlayer(participantId: string, fixtureId: string, input: AssignPlayerInput): Promise<ParticipantLineup>
  removePlayer(participantId: string, fixtureId: string, slotKey: string): Promise<ParticipantLineup>
  resetLineup(participantId: string, fixtureId: string): Promise<ParticipantLineup>
  lockLineup(participantId: string, fixtureId: string): Promise<ParticipantLineup>
  listScoringSlots(): Promise<LineupScoreSlot[]>
}

export class MemoryLineupRepository implements LineupRepository {
  storageKind: 'memory' = 'memory'
  private readonly lineups = new Map<string, ParticipantLineup>()

  constructor(private readonly teamPoolRepository: TeamPoolRepository) {}

  private key(participantId: string, fixtureId: string) {
    return `${participantId}:${fixtureId}`
  }

  async getOrCreate(participantId: string, fixtureId: string) {
    const key = this.key(participantId, fixtureId)
    const existing = this.lineups.get(key)
    if (existing) {
      return existing
    }

    const lineup = createEmptyLineup(participantId, fixtureId)
    this.lineups.set(key, lineup)
    return lineup
  }

  async assignPlayer(participantId: string, fixtureId: string, input: AssignPlayerInput) {
    const lineup = await this.getOrCreate(participantId, fixtureId)
    if (lineup.isLocked) {
      throw new LineupValidationError('Lineup is locked.')
    }

    const slot = getSlotDefinition(input.slotKey)
    if (!slot) {
      throw new LineupValidationError('Unknown lineup slot.')
    }

    const player = await this.teamPoolRepository.getTeamPlayerById(input.playerId)
    if (!player) {
      throw new LineupValidationError('Player is not in the World Cup team pool.')
    }

    if (!isEligibleForSlot(player.positions, slot.slotClass)) {
      throw new LineupValidationError('Player is not eligible for this slot.')
    }

    if (lineup.slots.some((slotState) => slotState.player?.playerId === player.playerId)) {
      throw new LineupValidationError('Player is already in the lineup.')
    }

    const currentSlot = lineup.slots.find((slotState) => slotState.key === input.slotKey)
    if (currentSlot?.player) {
      throw new LineupValidationError('Slot is already filled.')
    }

    const nextBudgetUsed = lineup.budgetUsed + player.capCost
    if (nextBudgetUsed > lineup.budgetLimit) {
      throw new LineupValidationError('Player would push the lineup over budget.')
    }

    const nextLineup: ParticipantLineup = {
      ...lineup,
      budgetUsed: nextBudgetUsed,
      budgetRemaining: lineup.budgetLimit - nextBudgetUsed,
      slots: lineup.slots.map((slotState) => (slotState.key === slot.key ? { ...slotState, player } : slotState)),
    }
    this.lineups.set(this.key(participantId, fixtureId), nextLineup)
    return nextLineup
  }

  async removePlayer(participantId: string, fixtureId: string, slotKey: string) {
    const lineup = await this.getOrCreate(participantId, fixtureId)
    if (lineup.isLocked) {
      throw new LineupValidationError('Lineup is locked.')
    }

    const slot = lineup.slots.find((slotState) => slotState.key === slotKey)
    if (!slot?.player) {
      return lineup
    }

    const nextBudgetUsed = Math.max(0, lineup.budgetUsed - slot.player.capCost)
    const nextLineup: ParticipantLineup = {
      ...lineup,
      budgetUsed: nextBudgetUsed,
      budgetRemaining: lineup.budgetLimit - nextBudgetUsed,
      slots: lineup.slots.map((slotState) => (slotState.key === slotKey ? { ...slotState, player: null } : slotState)),
    }
    this.lineups.set(this.key(participantId, fixtureId), nextLineup)
    return nextLineup
  }

  async resetLineup(participantId: string, fixtureId: string) {
    const lineup = await this.getOrCreate(participantId, fixtureId)
    if (lineup.isLocked) {
      throw new LineupValidationError('Lineup is locked.')
    }
    const resetLineup: ParticipantLineup = {
      ...lineup,
      budgetUsed: 0,
      budgetRemaining: lineup.budgetLimit,
      slots: lineup.slots.map((slot) => ({ ...slot, player: null })),
    }
    this.lineups.set(this.key(participantId, fixtureId), resetLineup)
    return resetLineup
  }

  async lockLineup(participantId: string, fixtureId: string) {
    const lineup = await this.getOrCreate(participantId, fixtureId)
    if (lineup.isLocked) {
      return lineup
    }
    if (lineup.slots.some((slot) => !slot.player)) {
      throw new LineupValidationError('Lineup must contain all 15 players before final submission.')
    }
    const lockedLineup = { ...lineup, isLocked: true }
    this.lineups.set(this.key(participantId, fixtureId), lockedLineup)
    return lockedLineup
  }

  async listScoringSlots() {
    const slots: LineupScoreSlot[] = []
    for (const lineup of this.lineups.values()) {
      if (!lineup.isLocked) {
        continue
      }
      for (const slot of lineup.slots) {
        if (slot.player) {
          slots.push({
            participantId: lineup.participantId,
            fixtureId: lineup.fixtureId,
            slotKey: slot.key,
            slotGroup: slot.slotGroup,
            slotClass: slot.slotClass,
            playerId: slot.player.playerId,
          })
        }
      }
    }
    return slots
  }
}

export class PostgresLineupRepository implements LineupRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(
    private readonly pool: Pool,
    private readonly teamPoolRepository: TeamPoolRepository,
  ) {}

  async getOrCreate(participantId: string, fixtureId: string) {
    await this.pool.query(
      `
        INSERT INTO participant_fixture_lineups (participant_id, fixture_id, budget_limit, budget_used, updated_at)
        VALUES ($1, $2, $3, 0, NOW())
        ON CONFLICT (participant_id, fixture_id)
        DO NOTHING
      `,
      [participantId, fixtureId, STARTING_BUDGET],
    )

    return this.loadLineup(participantId, fixtureId)
  }

  async assignPlayer(participantId: string, fixtureId: string, input: AssignPlayerInput) {
    const slot = getSlotDefinition(input.slotKey)
    if (!slot) {
      throw new LineupValidationError('Unknown lineup slot.')
    }

    const player = await this.teamPoolRepository.getTeamPlayerById(input.playerId)
    if (!player) {
      throw new LineupValidationError('Player is not in the World Cup team pool.')
    }

    if (!isEligibleForSlot(player.positions, slot.slotClass)) {
      throw new LineupValidationError('Player is not eligible for this slot.')
    }

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `
          INSERT INTO participant_fixture_lineups (participant_id, fixture_id, budget_limit, budget_used, updated_at)
          VALUES ($1, $2, $3, 0, NOW())
          ON CONFLICT (participant_id, fixture_id)
          DO NOTHING
        `,
        [participantId, fixtureId, STARTING_BUDGET],
      )
      const lineupResult = await client.query<{ lineup_id: string; budget_limit: number; budget_used: number; is_locked: boolean }>(
        'SELECT lineup_id, budget_limit, budget_used, is_locked FROM participant_fixture_lineups WHERE participant_id = $1 AND fixture_id = $2 FOR UPDATE',
        [participantId, fixtureId],
      )
      const lineup = lineupResult.rows[0]
      if (lineup.is_locked) {
        throw new LineupValidationError('Lineup is locked.')
      }

      const slotsResult = await client.query<{ slot_key: string; player_id: string }>(
        'SELECT slot_key, player_id FROM participant_fixture_lineup_slots WHERE lineup_id = $1 FOR UPDATE',
        [lineup.lineup_id],
      )
      if (slotsResult.rows.some((row) => row.slot_key === input.slotKey)) {
        throw new LineupValidationError('Slot is already filled.')
      }
      if (slotsResult.rows.some((row) => Number(row.player_id) === input.playerId)) {
        throw new LineupValidationError('Player is already in the lineup.')
      }

      const nextBudgetUsed = lineup.budget_used + player.capCost
      if (nextBudgetUsed > lineup.budget_limit) {
        throw new LineupValidationError('Player would push the lineup over budget.')
      }

      await client.query(
        `
          INSERT INTO participant_fixture_lineup_slots (lineup_id, slot_key, slot_group, slot_class, player_id)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [lineup.lineup_id, slot.key, slot.slotGroup, slot.slotClass, player.playerId],
      )
      await client.query('UPDATE participant_fixture_lineups SET budget_used = $2, updated_at = NOW() WHERE lineup_id = $1', [
        lineup.lineup_id,
        nextBudgetUsed,
      ])
      await client.query('COMMIT')
      return this.getOrCreate(participantId, fixtureId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async removePlayer(participantId: string, fixtureId: string, slotKey: string) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const lineupResult = await client.query<{ lineup_id: string; budget_used: number; is_locked: boolean }>(
        'SELECT lineup_id, budget_used, is_locked FROM participant_fixture_lineups WHERE participant_id = $1 AND fixture_id = $2 FOR UPDATE',
        [participantId, fixtureId],
      )
      const lineup = lineupResult.rows[0]
      if (!lineup) {
        await client.query('ROLLBACK')
        return this.getOrCreate(participantId, fixtureId)
      }
      if (lineup.is_locked) {
        throw new LineupValidationError('Lineup is locked.')
      }
      const slotResult = await client.query<{ player_id: string; rating: number | null }>(
        `
          SELECT s.player_id, p.rating
          FROM participant_fixture_lineup_slots s
          JOIN world_cup_players p ON p.player_id = s.player_id
          WHERE s.lineup_id = $1 AND s.slot_key = $2
          LIMIT 1
        `,
        [lineup.lineup_id, slotKey],
      )
      const existing = slotResult.rows[0]
      if (!existing) {
        await client.query('ROLLBACK')
        return this.getOrCreate(participantId, fixtureId)
      }
      await client.query('DELETE FROM participant_fixture_lineup_slots WHERE lineup_id = $1 AND slot_key = $2', [lineup.lineup_id, slotKey])
      const nextBudgetUsed = Math.max(0, lineup.budget_used - getCapCostForRating(existing.rating ?? 50))
      await client.query('UPDATE participant_fixture_lineups SET budget_used = $2, updated_at = NOW() WHERE lineup_id = $1', [
        lineup.lineup_id,
        nextBudgetUsed,
      ])
      await client.query('COMMIT')
      return this.getOrCreate(participantId, fixtureId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async resetLineup(participantId: string, fixtureId: string) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const lineupResult = await client.query<{ lineup_id: string; is_locked: boolean }>(
        'SELECT lineup_id, is_locked FROM participant_fixture_lineups WHERE participant_id = $1 AND fixture_id = $2 FOR UPDATE',
        [participantId, fixtureId],
      )
      const lineup = lineupResult.rows[0]
      if (!lineup) {
        await client.query('ROLLBACK')
        return this.getOrCreate(participantId, fixtureId)
      }
      if (lineup.is_locked) {
        throw new LineupValidationError('Lineup is locked.')
      }
      await client.query('DELETE FROM participant_fixture_lineup_slots WHERE lineup_id = $1', [lineup.lineup_id])
      await client.query('UPDATE participant_fixture_lineups SET budget_used = 0, updated_at = NOW() WHERE lineup_id = $1', [lineup.lineup_id])
      await client.query('COMMIT')
      return this.getOrCreate(participantId, fixtureId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async lockLineup(participantId: string, fixtureId: string) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `
          INSERT INTO participant_fixture_lineups (participant_id, fixture_id, budget_limit, budget_used, updated_at)
          VALUES ($1, $2, $3, 0, NOW())
          ON CONFLICT (participant_id, fixture_id)
          DO NOTHING
        `,
        [participantId, fixtureId, STARTING_BUDGET],
      )
      const lineupResult = await client.query<{ lineup_id: string; is_locked: boolean }>(
        'SELECT lineup_id, is_locked FROM participant_fixture_lineups WHERE participant_id = $1 AND fixture_id = $2 FOR UPDATE',
        [participantId, fixtureId],
      )
      const lineup = lineupResult.rows[0]
      if (lineup.is_locked) {
        await client.query('COMMIT')
        return this.getOrCreate(participantId, fixtureId)
      }

      const slotCount = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM participant_fixture_lineup_slots WHERE lineup_id = $1',
        [lineup.lineup_id],
      )
      if (Number(slotCount.rows[0]?.count ?? 0) !== formationSlots.length) {
        throw new LineupValidationError('Lineup must contain all 15 players before final submission.')
      }

      await client.query('UPDATE participant_fixture_lineups SET is_locked = TRUE, updated_at = NOW() WHERE lineup_id = $1', [lineup.lineup_id])
      await client.query('COMMIT')
      return this.getOrCreate(participantId, fixtureId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async listScoringSlots() {
    const result = await this.pool.query<{
      participant_id: string
      fixture_id: string
      slot_key: string
      slot_group: 'starter' | 'sub'
      slot_class: SlotClass
      player_id: string
    }>(
      `
        SELECT l.participant_id, l.fixture_id, s.slot_key, s.slot_group, s.slot_class, s.player_id
        FROM participant_fixture_lineups l
        JOIN participant_fixture_lineup_slots s ON s.lineup_id = l.lineup_id
        WHERE l.is_locked = TRUE
      `,
    )
    return result.rows.map((row) => ({
      participantId: row.participant_id,
      fixtureId: row.fixture_id,
      slotKey: row.slot_key,
      slotGroup: row.slot_group,
      slotClass: row.slot_class,
      playerId: Number(row.player_id),
    }))
  }

  private async loadLineup(participantId: string, fixtureId: string) {
    const lineupResult = await this.pool.query<{
      lineup_id: string
      participant_id: string
      fixture_id: string
      budget_limit: number
      budget_used: number
      is_locked: boolean
    }>(
      'SELECT lineup_id, participant_id, fixture_id, budget_limit, budget_used, is_locked FROM participant_fixture_lineups WHERE participant_id = $1 AND fixture_id = $2',
      [participantId, fixtureId],
    )
    const lineup = lineupResult.rows[0]

    const slotResult = await this.pool.query<{
      slot_key: string
      slot_group: 'starter' | 'sub'
      slot_class: SlotClass
      player_id: string
      display_name: string
      nationality_code: string | null
      rating: number | null
      position_codes: string[] | null
      position_main: string | null
      image_url: string | null
    }>(
      `
        SELECT s.slot_key, s.slot_group, s.slot_class, p.player_id, p.display_name, p.nationality_code, p.rating, p.position_codes, p.position_main, p.image_url
        FROM participant_fixture_lineup_slots s
        JOIN world_cup_players p ON p.player_id = s.player_id
        WHERE s.lineup_id = $1
      `,
      [lineup.lineup_id],
    )

    const assignedPlayers = new Map<string, TeamPoolPlayer | null>()
    for (const slot of formationSlots) {
      assignedPlayers.set(slot.key, null)
    }
    for (const row of slotResult.rows) {
      assignedPlayers.set(row.slot_key, {
        teamCode: row.nationality_code ?? '',
        playerId: Number(row.player_id),
        displayName: row.display_name,
        nationalityCode: row.nationality_code ?? '',
        rating: row.rating ?? 50,
        capCost: getCapCostForRating(row.rating ?? 50),
        positions: row.position_codes ?? [],
        positionMain: row.position_main ?? undefined,
        positionClasses: getPositionClasses(row.position_codes ?? []),
        imageUrl: row.image_url ?? defaultPlayerImageUrl(Number(row.player_id)),
      })
    }

    return {
      lineupId: lineup.lineup_id,
      participantId: lineup.participant_id,
      fixtureId: lineup.fixture_id,
      budgetLimit: lineup.budget_limit,
      budgetUsed: lineup.budget_used,
      budgetRemaining: Math.max(0, lineup.budget_limit - lineup.budget_used),
      isLocked: lineup.is_locked,
      slots: buildSlotState(assignedPlayers),
    }
  }
}
