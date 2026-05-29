import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { hasCompetitionStarted, hasRegistrationClosed } from '../data/competitionWindow.js'
import { STARTING_BUDGET, formationSlots, getBudgetOption, getScoreMultiplierForBudget, getSlotDefinition } from '../data/formation.js'
import { getPositionClasses, isEligibleForSlot } from '../data/positionClasses.js'
import { getCapCostForRating } from '../data/salaryTable.js'
import { getOpenSwapWindow } from '../data/swapWindows.js'
import type {
  AssignPlayerInput,
  ParticipantSquad,
  RoundLineupSlot,
  SwapPlayersInput,
  SwapRecord,
  SwapResultSummary,
  TeamPoolPlayer,
} from '../domain/types.js'
import { applySwap, type LineupSlot } from '../lib/swapEngine.js'
import { assertSwapAllowed } from '../lib/swapGate.js'
import type { TeamPoolRepository } from './teamPoolRepository.js'

// The round a squad's lock-time baseline lineup is keyed to (group matchday 1). Later rounds are
// written on swap-commit. See SOP_scoring_and_leagues.md "Per-Round Lineup Freeze".
const BASELINE_ROUND_KEY = 1

// Builds the 15-slot lineup composition from a squad's current slots (the lock-time baseline).
function lineupFromSquad(squad: ParticipantSquad): LineupSlot[] {
  return squad.slots
    .filter((slot) => slot.player)
    .map((slot) => ({
      slotKey: slot.key,
      slotGroup: slot.slotGroup,
      slotClass: slot.slotClass,
      playerId: slot.player!.playerId,
      positionCodes: slot.player!.positions ?? [],
    }))
}

function defaultPlayerImageUrl(playerId: number) {
  return `https://elrincondeldt.com/sv/photos/players/${playerId}.png`
}

export class SquadValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SquadValidationError'
  }
}

function assertSquadEditable(isLocked: boolean, now = Date.now()) {
  if (hasRegistrationClosed(now)) {
    throw new SquadValidationError('Squad is locked because registration has closed.')
  }
  if (isLocked && hasCompetitionStarted(now)) {
    throw new SquadValidationError('Squad is locked because the competition has started.')
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
  swapPlayers(participantId: string, input: SwapPlayersInput): Promise<SwapResultSummary>
  listRoundLineupSlots(participantId: string): Promise<RoundLineupSlot[]>
  listSwaps(participantId: string): Promise<SwapRecord[]>
}

export class MemorySquadRepository implements SquadRepository {
  storageKind: 'memory' = 'memory'
  private readonly squads = new Map<string, ParticipantSquad>()
  // participantId -> roundKey -> the 15-slot snapshot for that round.
  private readonly roundLineups = new Map<string, Map<number, RoundLineupSlot[]>>()
  // participantId -> ordered swap history.
  private readonly swaps = new Map<string, SwapRecord[]>()

  constructor(
    private readonly teamPoolRepository: TeamPoolRepository,
    private readonly now: () => number = () => Date.now(),
  ) {}

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
    assertSquadEditable(squad.isLocked, this.now())

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
    assertSquadEditable(squad.isLocked, this.now())
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
    assertSquadEditable(squad.isLocked, this.now())

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
    assertSquadEditable(squad.isLocked, this.now())
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
    assertSquadEditable(squad.isLocked, this.now())

    const missingSlot = squad.slots.find((slot) => !slot.player)
    if (missingSlot) {
      throw new SquadValidationError('Squad must contain all 15 players before final submission.')
    }

    const lockedSquad: ParticipantSquad = {
      ...squad,
      isLocked: true,
      lockedAt: new Date(this.now()).toISOString(),
    }
    this.squads.set(participantId, lockedSquad)
    this.writeRoundSnapshot(participantId, BASELINE_ROUND_KEY, lineupFromSquad(lockedSquad))
    return lockedSquad
  }

  private writeRoundSnapshot(participantId: string, roundKey: number, slots: LineupSlot[]) {
    const byRound = this.roundLineups.get(participantId) ?? new Map<number, RoundLineupSlot[]>()
    byRound.set(
      roundKey,
      slots.map((slot) => ({ participantId, roundKey, ...slot })),
    )
    this.roundLineups.set(participantId, byRound)
  }

  // The lineup currently in effect for the target round: the snapshot with the greatest
  // round_key <= targetRound (so a second swap in the same window stacks on the first), falling back
  // to the lock-time baseline derived from the squad if no snapshot exists yet.
  private workingLineupForRound(participantId: string, targetRound: number, squad: ParticipantSquad): LineupSlot[] {
    const byRound = this.roundLineups.get(participantId)
    if (byRound) {
      const roundKey = [...byRound.keys()].filter((key) => key <= targetRound).sort((left, right) => right - left)[0]
      if (roundKey !== undefined) {
        return byRound.get(roundKey)!.map((slot) => ({
          slotKey: slot.slotKey,
          slotGroup: slot.slotGroup,
          slotClass: slot.slotClass,
          playerId: slot.playerId,
          positionCodes: slot.positionCodes,
        }))
      }
    }
    return lineupFromSquad(squad)
  }

  async swapPlayers(participantId: string, input: SwapPlayersInput): Promise<SwapResultSummary> {
    const squad = await this.getOrCreate(participantId)
    const now = this.now()

    const inPlayer = squad.slots.find((slot) => slot.player?.playerId === input.playerInId)?.player
    const outPlayer = squad.slots.find((slot) => slot.player?.playerId === input.playerOutId)?.player
    if (!inPlayer || !outPlayer) {
      throw new SquadValidationError('Both players must be in your squad to swap them.')
    }

    const history = this.swaps.get(participantId) ?? []
    const openWindow = getOpenSwapWindow(now)
    const swapsUsedInWindow = history.filter((record) => record.windowKey === openWindow?.key).length

    const window = assertSwapAllowed({
      isLocked: squad.isLocked,
      isComplete: squad.slots.every((slot) => slot.player),
      nationsInvolved: [inPlayer.nationalityCode, outPlayer.nationalityCode],
      swapsUsedInWindow,
      now,
    })

    const base = this.workingLineupForRound(participantId, window.targetRound, squad)
    const applied = applySwap(base, input.playerInId, input.playerOutId)
    this.writeRoundSnapshot(participantId, window.targetRound, applied.slots)

    const record: SwapRecord = {
      swapId: randomUUID(),
      squadId: squad.squadId,
      participantId,
      windowKey: window.key,
      roundKey: window.targetRound,
      slotClass: applied.slotClass,
      slotIn: applied.slotIn,
      slotOut: applied.slotOut,
      playerInId: input.playerInId,
      playerOutId: input.playerOutId,
      appliedAt: new Date(now).toISOString(),
    }
    this.swaps.set(participantId, [...history, record])

    return {
      swap: record,
      windowKey: window.key,
      targetRound: window.targetRound,
      swapsUsedInWindow: swapsUsedInWindow + 1,
      swapLimit: window.swapLimit,
    }
  }

  async listRoundLineupSlots(participantId: string): Promise<RoundLineupSlot[]> {
    const byRound = this.roundLineups.get(participantId)
    if (!byRound) {
      return []
    }
    return [...byRound.values()].flat()
  }

  async listSwaps(participantId: string): Promise<SwapRecord[]> {
    return [...(this.swaps.get(participantId) ?? [])]
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
      assertSquadEditable(squad.is_locked)

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
          INSERT INTO squad_slots (squad_id, slot_key, slot_group, slot_class, player_id, position_codes)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [squad.squad_id, slot.key, slot.slotGroup, slot.slotClass, player.playerId, player.positions],
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
      assertSquadEditable(squad.is_locked)
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
      assertSquadEditable(squad.is_locked)

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
      assertSquadEditable(squad.is_locked)

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
      assertSquadEditable(squad.is_locked)

      const slotCount = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM squad_slots WHERE squad_id = $1', [
        squad.squad_id,
      ])
      if (Number(slotCount.rows[0]?.count ?? 0) !== formationSlots.length) {
        throw new SquadValidationError('Squad must contain all 15 players before final submission.')
      }

      await client.query('UPDATE squads SET is_locked = TRUE, locked_at = NOW(), updated_at = NOW() WHERE squad_id = $1', [squad.squad_id])
      // Materialize the round-1 baseline lineup snapshot from the squad as it locks.
      await client.query(
        `
          INSERT INTO squad_round_lineup (squad_id, round_key, slot_key, slot_group, slot_class, player_id, position_codes)
          SELECT squad_id, $2, slot_key, slot_group, slot_class, player_id, position_codes
          FROM squad_slots WHERE squad_id = $1
          ON CONFLICT (squad_id, round_key, slot_key) DO NOTHING
        `,
        [squad.squad_id, BASELINE_ROUND_KEY],
      )
      await client.query('COMMIT')
      return this.getOrCreate(participantId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async swapPlayers(participantId: string, input: SwapPlayersInput): Promise<SwapResultSummary> {
    const now = Date.now()
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const squadResult = await client.query<{ squad_id: string; is_locked: boolean }>(
        'SELECT squad_id, is_locked FROM squads WHERE participant_id = $1 FOR UPDATE',
        [participantId],
      )
      const squad = squadResult.rows[0]
      if (!squad) {
        throw new SquadValidationError('Both players must be in your squad to swap them.')
      }

      // Current squad slots (the lock-time composition) keyed by player, with nationality + codes.
      const slotRows = await client.query<{
        slot_key: string
        slot_group: 'starter' | 'sub'
        slot_class: 'GK' | 'DEF' | 'MID' | 'FWD'
        player_id: string
        nationality_code: string | null
        position_codes: string[] | null
      }>(
        `
          SELECT s.slot_key, s.slot_group, s.slot_class, s.player_id, p.nationality_code, s.position_codes
          FROM squad_slots s
          JOIN world_cup_players p ON p.player_id = s.player_id
          WHERE s.squad_id = $1
        `,
        [squad.squad_id],
      )
      const nationByPlayer = new Map<number, string>()
      for (const row of slotRows.rows) {
        nationByPlayer.set(Number(row.player_id), row.nationality_code ?? '')
      }
      const inNation = nationByPlayer.get(input.playerInId)
      const outNation = nationByPlayer.get(input.playerOutId)
      if (inNation === undefined || outNation === undefined) {
        throw new SquadValidationError('Both players must be in your squad to swap them.')
      }

      const history = await client.query<{ window_key: string }>('SELECT window_key FROM squad_swaps WHERE participant_id = $1', [participantId])
      const openWindow = getOpenSwapWindow(now)
      const swapsUsedInWindow = history.rows.filter((row) => row.window_key === openWindow?.key).length

      const window = assertSwapAllowed({
        isLocked: squad.is_locked,
        isComplete: slotRows.rows.length === formationSlots.length,
        nationsInvolved: [inNation, outNation],
        swapsUsedInWindow,
        now,
      })

      // Working lineup for the target round: the snapshot with the greatest round_key <= targetRound,
      // else the lock-time squad composition (also covers squads locked before this feature existed).
      const snapshotRows = await client.query<{
        slot_key: string
        slot_group: 'starter' | 'sub'
        slot_class: 'GK' | 'DEF' | 'MID' | 'FWD'
        player_id: string
        position_codes: string[] | null
      }>(
        `
          SELECT slot_key, slot_group, slot_class, player_id, position_codes
          FROM squad_round_lineup
          WHERE squad_id = $1 AND round_key = (
            SELECT MAX(round_key) FROM squad_round_lineup WHERE squad_id = $1 AND round_key <= $2
          )
        `,
        [squad.squad_id, window.targetRound],
      )
      const sourceRows = snapshotRows.rows.length > 0 ? snapshotRows.rows : slotRows.rows
      const base: LineupSlot[] = sourceRows.map((row) => ({
        slotKey: row.slot_key,
        slotGroup: row.slot_group,
        slotClass: row.slot_class,
        playerId: Number(row.player_id),
        positionCodes: row.position_codes ?? [],
      }))

      const applied = applySwap(base, input.playerInId, input.playerOutId)

      await client.query('DELETE FROM squad_round_lineup WHERE squad_id = $1 AND round_key = $2', [squad.squad_id, window.targetRound])
      for (const slot of applied.slots) {
        await client.query(
          `
            INSERT INTO squad_round_lineup (squad_id, round_key, slot_key, slot_group, slot_class, player_id, position_codes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [squad.squad_id, window.targetRound, slot.slotKey, slot.slotGroup, slot.slotClass, slot.playerId, slot.positionCodes],
        )
      }

      const swapResult = await client.query<{ swap_id: string; applied_at: string }>(
        `
          INSERT INTO squad_swaps (squad_id, participant_id, window_key, round_key, slot_class, slot_in, slot_out, player_in, player_out)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING swap_id, applied_at
        `,
        [squad.squad_id, participantId, window.key, window.targetRound, applied.slotClass, applied.slotIn, applied.slotOut, input.playerInId, input.playerOutId],
      )
      await client.query('COMMIT')

      const swapRow = swapResult.rows[0]
      return {
        swap: {
          swapId: swapRow.swap_id,
          squadId: squad.squad_id,
          participantId,
          windowKey: window.key,
          roundKey: window.targetRound,
          slotClass: applied.slotClass,
          slotIn: applied.slotIn,
          slotOut: applied.slotOut,
          playerInId: input.playerInId,
          playerOutId: input.playerOutId,
          appliedAt: typeof swapRow.applied_at === 'string' ? swapRow.applied_at : new Date(swapRow.applied_at).toISOString(),
        },
        windowKey: window.key,
        targetRound: window.targetRound,
        swapsUsedInWindow: swapsUsedInWindow + 1,
        swapLimit: window.swapLimit,
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async listRoundLineupSlots(participantId: string): Promise<RoundLineupSlot[]> {
    const result = await this.pool.query<{
      round_key: number
      slot_key: string
      slot_group: 'starter' | 'sub'
      slot_class: 'GK' | 'DEF' | 'MID' | 'FWD'
      player_id: string
      position_codes: string[] | null
    }>(
      `
        SELECT rl.round_key, rl.slot_key, rl.slot_group, rl.slot_class, rl.player_id, rl.position_codes
        FROM squad_round_lineup rl
        JOIN squads s ON s.squad_id = rl.squad_id
        WHERE s.participant_id = $1
      `,
      [participantId],
    )
    return result.rows.map((row) => ({
      participantId,
      roundKey: Number(row.round_key),
      slotKey: row.slot_key,
      slotGroup: row.slot_group,
      slotClass: row.slot_class,
      playerId: Number(row.player_id),
      positionCodes: row.position_codes ?? [],
    }))
  }

  async listSwaps(participantId: string): Promise<SwapRecord[]> {
    const result = await this.pool.query<{
      swap_id: string
      squad_id: string
      window_key: string
      round_key: number
      slot_class: 'GK' | 'DEF' | 'MID' | 'FWD'
      slot_in: string
      slot_out: string
      player_in: string
      player_out: string
      applied_at: string
    }>(
      'SELECT swap_id, squad_id, window_key, round_key, slot_class, slot_in, slot_out, player_in, player_out, applied_at FROM squad_swaps WHERE participant_id = $1 ORDER BY applied_at ASC',
      [participantId],
    )
    return result.rows.map((row) => ({
      swapId: row.swap_id,
      squadId: row.squad_id,
      participantId,
      windowKey: row.window_key,
      roundKey: Number(row.round_key),
      slotClass: row.slot_class,
      slotIn: row.slot_in,
      slotOut: row.slot_out,
      playerInId: Number(row.player_in),
      playerOutId: Number(row.player_out),
      appliedAt: typeof row.applied_at === 'string' ? row.applied_at : new Date(row.applied_at).toISOString(),
    }))
  }
}
