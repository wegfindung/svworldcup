import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { STARTING_BUDGET, formationSlots, getBudgetOption, getScoreMultiplierForBudget, getSlotDefinition } from '../data/formation.js'
import { getPositionClasses, isEligibleForSlot } from '../data/positionClasses.js'
import { getCapCostForRating } from '../data/salaryTable.js'
import type { AssignPlayerInput, ParticipantSquad, TeamPoolPlayer } from '../domain/types.js'
import type { TeamPoolRepository } from './teamPoolRepository.js'

function defaultPlayerImageUrl(playerId: number) {
  return `https://elrincondeldt.com/sv/photos/players/${playerId}.png`
}

export class SquadValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SquadValidationError'
  }
}

function buildSlotState(assignedPlayers: Map<string, TeamPoolPlayer | null>): ParticipantSquad['slots'] {
  return formationSlots.map((slot) => ({
    ...slot,
    player: assignedPlayers.get(slot.key) ?? null,
  }))
}

function createEmptySquad(participantId: string): ParticipantSquad {
  const assignedPlayers = new Map<string, TeamPoolPlayer | null>()
  for (const slot of formationSlots) {
    assignedPlayers.set(slot.key, null)
  }

  return {
    squadId: randomUUID(),
    participantId,
    budgetLimit: STARTING_BUDGET,
    scoreMultiplier: getScoreMultiplierForBudget(STARTING_BUDGET),
    budgetUsed: 0,
    budgetRemaining: STARTING_BUDGET,
    isLocked: false,
    lockedAt: null,
    slots: buildSlotState(assignedPlayers),
  }
}

export interface SquadRepository {
  storageKind: 'memory' | 'postgres'
  getOrCreate(participantId: string): Promise<ParticipantSquad>
  setBudget(participantId: string, budgetLimit: number): Promise<ParticipantSquad>
  assignPlayer(participantId: string, input: AssignPlayerInput): Promise<ParticipantSquad>
  removePlayer(participantId: string, slotKey: string): Promise<ParticipantSquad>
  resetSquad(participantId: string): Promise<ParticipantSquad>
  lockSquad(participantId: string): Promise<ParticipantSquad>
}

export class MemorySquadRepository implements SquadRepository {
  storageKind: 'memory' = 'memory'
  private readonly squads = new Map<string, ParticipantSquad>()

  constructor(private readonly teamPoolRepository: TeamPoolRepository) {}

  async getOrCreate(participantId: string) {
    const existing = this.squads.get(participantId)
    if (existing) {
      return existing
    }

    const squad = createEmptySquad(participantId)
    this.squads.set(participantId, squad)
    return squad
  }

  async assignPlayer(participantId: string, input: AssignPlayerInput) {
    const squad = await this.getOrCreate(participantId)
    if (squad.isLocked) {
      throw new SquadValidationError('Squad is locked.')
    }

    const slot = getSlotDefinition(input.slotKey)
    if (!slot) {
      throw new SquadValidationError('Unknown squad slot.')
    }

    const player = await this.teamPoolRepository.getTeamPlayerById(input.playerId)
    if (!player) {
      throw new SquadValidationError('Player is not in the World Cup team pool.')
    }

    if (!isEligibleForSlot(player.positions, slot.slotClass)) {
      throw new SquadValidationError('Player is not eligible for this slot.')
    }

    const alreadyAssigned = squad.slots.find((slotState) => slotState.player?.playerId === player.playerId)
    if (alreadyAssigned) {
      throw new SquadValidationError('Player is already in the squad.')
    }

    const currentSlot = squad.slots.find((slotState) => slotState.key === input.slotKey)
    if (currentSlot?.player) {
      throw new SquadValidationError('Slot is already filled.')
    }

    const nextBudgetUsed = squad.budgetUsed + player.capCost
    if (nextBudgetUsed > squad.budgetLimit) {
      throw new SquadValidationError('Player would push the squad over budget.')
    }

    const nextSlots = squad.slots.map((slotState) => (slotState.key === input.slotKey ? { ...slotState, player } : slotState))
    const nextSquad: ParticipantSquad = {
      ...squad,
      budgetUsed: nextBudgetUsed,
      budgetRemaining: squad.budgetLimit - nextBudgetUsed,
      slots: nextSlots,
    }
    this.squads.set(participantId, nextSquad)
    return nextSquad
  }

  async setBudget(participantId: string, budgetLimit: number) {
    const option = getBudgetOption(budgetLimit)
    if (!option) {
      throw new SquadValidationError('Unknown budget option.')
    }

    const squad = await this.getOrCreate(participantId)
    if (squad.isLocked) {
      throw new SquadValidationError('Squad is locked.')
    }
    if (squad.budgetUsed > option.budgetLimit) {
      throw new SquadValidationError('Remove drafted players before lowering the budget.')
    }

    const nextSquad: ParticipantSquad = {
      ...squad,
      budgetLimit: option.budgetLimit,
      scoreMultiplier: option.scoreMultiplier,
      budgetRemaining: option.budgetLimit - squad.budgetUsed,
    }
    this.squads.set(participantId, nextSquad)
    return nextSquad
  }

  async removePlayer(participantId: string, slotKey: string) {
    const squad = await this.getOrCreate(participantId)
    if (squad.isLocked) {
      throw new SquadValidationError('Squad is locked.')
    }

    const slot = squad.slots.find((slotState) => slotState.key === slotKey)
    if (!slot?.player) {
      return squad
    }

    const nextBudgetUsed = Math.max(0, squad.budgetUsed - slot.player.capCost)
    const nextSquad: ParticipantSquad = {
      ...squad,
      budgetUsed: nextBudgetUsed,
      budgetRemaining: squad.budgetLimit - nextBudgetUsed,
      slots: squad.slots.map((slotState) => (slotState.key === slotKey ? { ...slotState, player: null } : slotState)),
    }
    this.squads.set(participantId, nextSquad)
    return nextSquad
  }

  async resetSquad(participantId: string) {
    const squad = await this.getOrCreate(participantId)
    if (squad.isLocked) {
      throw new SquadValidationError('Squad is locked.')
    }
    const resetSquad: ParticipantSquad = {
      ...squad,
      budgetUsed: 0,
      budgetRemaining: squad.budgetLimit,
      slots: squad.slots.map((slot) => ({ ...slot, player: null })),
    }
    this.squads.set(participantId, resetSquad)
    return resetSquad
  }

  async lockSquad(participantId: string) {
    const squad = await this.getOrCreate(participantId)
    if (squad.isLocked) {
      return squad
    }

    const missingSlot = squad.slots.find((slot) => !slot.player)
    if (missingSlot) {
      throw new SquadValidationError('Squad must contain all 15 players before final submission.')
    }

    const lockedSquad: ParticipantSquad = {
      ...squad,
      isLocked: true,
      lockedAt: new Date().toISOString(),
    }
    this.squads.set(participantId, lockedSquad)
    return lockedSquad
  }
}

export class PostgresSquadRepository implements SquadRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(
    private readonly pool: Pool,
    private readonly teamPoolRepository: TeamPoolRepository,
  ) {}

  async getOrCreate(participantId: string) {
    await this.pool.query(
      `
        INSERT INTO squads (participant_id, budget_limit, budget_used, updated_at)
        VALUES ($1, $2, 0, NOW())
        ON CONFLICT (participant_id)
        DO NOTHING
      `,
      [participantId, STARTING_BUDGET],
    )

    const squadResult = await this.pool.query<{
      squad_id: string
      budget_limit: number
      budget_used: number
      is_locked: boolean
      locked_at: string | null
    }>('SELECT squad_id, budget_limit, budget_used, is_locked, locked_at FROM squads WHERE participant_id = $1', [participantId])
    const squad = squadResult.rows[0]

    const slotResult = await this.pool.query<{
      slot_key: string
      slot_group: 'starter' | 'sub'
      slot_class: 'GK' | 'DEF' | 'MID' | 'FWD'
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
        FROM squad_slots s
        JOIN world_cup_players p ON p.player_id = s.player_id
        WHERE s.squad_id = $1
      `,
      [squad.squad_id],
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
      squadId: squad.squad_id,
      participantId,
      budgetLimit: squad.budget_limit,
      scoreMultiplier: getScoreMultiplierForBudget(squad.budget_limit),
      budgetUsed: squad.budget_used,
      budgetRemaining: Math.max(0, squad.budget_limit - squad.budget_used),
      isLocked: squad.is_locked,
      lockedAt: squad.locked_at,
      slots: buildSlotState(assignedPlayers),
    }
  }

  async assignPlayer(participantId: string, input: AssignPlayerInput) {
    const slot = getSlotDefinition(input.slotKey)
    if (!slot) {
      throw new SquadValidationError('Unknown squad slot.')
    }

    const player = await this.teamPoolRepository.getTeamPlayerById(input.playerId)
    if (!player) {
      throw new SquadValidationError('Player is not in the World Cup team pool.')
    }

    if (!isEligibleForSlot(player.positions, slot.slotClass)) {
      throw new SquadValidationError('Player is not eligible for this slot.')
    }

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `
          INSERT INTO squads (participant_id, budget_limit, budget_used, updated_at)
          VALUES ($1, $2, 0, NOW())
          ON CONFLICT (participant_id)
          DO NOTHING
        `,
        [participantId, STARTING_BUDGET],
      )

      const squadResult = await client.query<{ squad_id: string; budget_limit: number; budget_used: number; is_locked: boolean }>(
        'SELECT squad_id, budget_limit, budget_used, is_locked FROM squads WHERE participant_id = $1 FOR UPDATE',
        [participantId],
      )
      const squad = squadResult.rows[0]
      if (squad.is_locked) {
        throw new SquadValidationError('Squad is locked.')
      }

      const slotsResult = await client.query<{ slot_key: string; player_id: string }>(
        'SELECT slot_key, player_id FROM squad_slots WHERE squad_id = $1 FOR UPDATE',
        [squad.squad_id],
      )
      if (slotsResult.rows.some((row) => row.slot_key === input.slotKey)) {
        throw new SquadValidationError('Slot is already filled.')
      }
      if (slotsResult.rows.some((row) => Number(row.player_id) === input.playerId)) {
        throw new SquadValidationError('Player is already in the squad.')
      }

      const nextBudgetUsed = squad.budget_used + player.capCost
      if (nextBudgetUsed > squad.budget_limit) {
        throw new SquadValidationError('Player would push the squad over budget.')
      }

      await client.query(
        `
          INSERT INTO squad_slots (squad_id, slot_key, slot_group, slot_class, player_id)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [squad.squad_id, slot.key, slot.slotGroup, slot.slotClass, player.playerId],
      )
      await client.query('UPDATE squads SET budget_used = $2, updated_at = NOW() WHERE squad_id = $1', [squad.squad_id, nextBudgetUsed])
      await client.query('COMMIT')
      return this.getOrCreate(participantId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async setBudget(participantId: string, budgetLimit: number) {
    const option = getBudgetOption(budgetLimit)
    if (!option) {
      throw new SquadValidationError('Unknown budget option.')
    }

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `
          INSERT INTO squads (participant_id, budget_limit, budget_used, updated_at)
          VALUES ($1, $2, 0, NOW())
          ON CONFLICT (participant_id)
          DO NOTHING
        `,
        [participantId, STARTING_BUDGET],
      )

      const squadResult = await client.query<{ squad_id: string; budget_used: number; is_locked: boolean }>(
        'SELECT squad_id, budget_used, is_locked FROM squads WHERE participant_id = $1 FOR UPDATE',
        [participantId],
      )
      const squad = squadResult.rows[0]
      if (squad.is_locked) {
        throw new SquadValidationError('Squad is locked.')
      }
      if (squad.budget_used > option.budgetLimit) {
        throw new SquadValidationError('Remove drafted players before lowering the budget.')
      }

      await client.query('UPDATE squads SET budget_limit = $2, updated_at = NOW() WHERE squad_id = $1', [squad.squad_id, option.budgetLimit])
      await client.query('COMMIT')
      return this.getOrCreate(participantId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async removePlayer(participantId: string, slotKey: string) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const squadResult = await client.query<{ squad_id: string; budget_limit: number; budget_used: number; is_locked: boolean }>(
        'SELECT squad_id, budget_limit, budget_used, is_locked FROM squads WHERE participant_id = $1 FOR UPDATE',
        [participantId],
      )
      const squad = squadResult.rows[0]
      if (!squad) {
        await client.query('ROLLBACK')
        return this.getOrCreate(participantId)
      }
      if (squad.is_locked) {
        throw new SquadValidationError('Squad is locked.')
      }

      const slotResult = await client.query<{ player_id: string; rating: number | null }>(
        `
          SELECT s.player_id, p.rating
          FROM squad_slots s
          JOIN world_cup_players p ON p.player_id = s.player_id
          WHERE s.squad_id = $1 AND s.slot_key = $2
          LIMIT 1
        `,
        [squad.squad_id, slotKey],
      )
      const existing = slotResult.rows[0]
      if (!existing) {
        await client.query('ROLLBACK')
        return this.getOrCreate(participantId)
      }

      await client.query('DELETE FROM squad_slots WHERE squad_id = $1 AND slot_key = $2', [squad.squad_id, slotKey])
      const nextBudgetUsed = Math.max(0, squad.budget_used - getCapCostForRating(existing.rating ?? 50))
      await client.query('UPDATE squads SET budget_used = $2, updated_at = NOW() WHERE squad_id = $1', [squad.squad_id, nextBudgetUsed])
      await client.query('COMMIT')
      return this.getOrCreate(participantId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async resetSquad(participantId: string) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const squadResult = await client.query<{ squad_id: string; is_locked: boolean }>(
        'SELECT squad_id, is_locked FROM squads WHERE participant_id = $1 FOR UPDATE',
        [participantId],
      )
      const squad = squadResult.rows[0]
      if (!squad) {
        await client.query('ROLLBACK')
        return this.getOrCreate(participantId)
      }
      if (squad.is_locked) {
        throw new SquadValidationError('Squad is locked.')
      }

      await client.query('DELETE FROM squad_slots WHERE squad_id = $1', [squad.squad_id])
      await client.query('UPDATE squads SET budget_used = 0, updated_at = NOW() WHERE squad_id = $1', [squad.squad_id])
      await client.query('COMMIT')
      return this.getOrCreate(participantId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async lockSquad(participantId: string) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `
          INSERT INTO squads (participant_id, budget_limit, budget_used, updated_at)
          VALUES ($1, $2, 0, NOW())
          ON CONFLICT (participant_id)
          DO NOTHING
        `,
        [participantId, STARTING_BUDGET],
      )

      const squadResult = await client.query<{ squad_id: string; is_locked: boolean }>(
        'SELECT squad_id, is_locked FROM squads WHERE participant_id = $1 FOR UPDATE',
        [participantId],
      )
      const squad = squadResult.rows[0]
      if (squad.is_locked) {
        await client.query('COMMIT')
        return this.getOrCreate(participantId)
      }

      const slotCount = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM squad_slots WHERE squad_id = $1', [
        squad.squad_id,
      ])
      if (Number(slotCount.rows[0]?.count ?? 0) !== formationSlots.length) {
        throw new SquadValidationError('Squad must contain all 15 players before final submission.')
      }

      await client.query('UPDATE squads SET is_locked = TRUE, locked_at = NOW(), updated_at = NOW() WHERE squad_id = $1', [squad.squad_id])
      await client.query('COMMIT')
      return this.getOrCreate(participantId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}
