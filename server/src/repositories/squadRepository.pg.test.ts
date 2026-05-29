import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PostgresSquadRepository } from './squadRepository.js'
import { PostgresTeamPoolRepository } from './teamPoolRepository.js'

// Postgres integration check for the swap path. Skipped unless RUN_PG_TESTS=1 (normal `vitest run`
// has no database). Run against the local dev DB with a swap window open around "now":
//
//   RUN_PG_TESTS=1 \
//   SWAP_W3_OPENS_AT=2020-01-01T00:00:00Z SWAP_W3_CLOSES_AT=2030-01-01T00:00:00Z \
//   npx vitest run src/repositories/squadRepository.pg.test.ts
//
// It targets an existing locked demo squad (no pre-existing snapshot — exercises the lazy baseline),
// commits one swap, asserts the snapshot + swap log, then deletes only the rows it created.
const shouldRun = process.env.RUN_PG_TESTS === '1' && Boolean(process.env.DATABASE_URL)

describe.skipIf(!shouldRun)('PostgresSquadRepository swap path (live DB)', () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const squads = new PostgresSquadRepository(pool, new PostgresTeamPoolRepository(pool))
  let participantId = ''
  let squadId = ''

  beforeAll(async () => {
    const locked = await pool.query<{ participant_id: string; squad_id: string }>(
      `SELECT s.participant_id, s.squad_id
       FROM squads s
       JOIN squad_slots ss ON ss.squad_id = s.squad_id
       WHERE s.is_locked = TRUE
       GROUP BY s.participant_id, s.squad_id
       HAVING COUNT(ss.*) = 15
       LIMIT 1`,
    )
    if (locked.rows[0]) {
      participantId = locked.rows[0].participant_id
      squadId = locked.rows[0].squad_id
    }
  })

  afterAll(async () => {
    if (squadId) {
      await pool.query('DELETE FROM squad_round_lineup WHERE squad_id = $1', [squadId])
      await pool.query('DELETE FROM squad_swaps WHERE squad_id = $1', [squadId])
    }
    await pool.end()
  })

  it('commits a swap, writes the round snapshot + swap log, then reads them back', async () => {
    expect(participantId, 'needs a locked 15-player squad in the local DB').not.toBe('')

    // Pick a reserve and a same-class starter from the squad.
    const slots = await pool.query<{ slot_key: string; slot_group: string; slot_class: string; player_id: string }>(
      'SELECT slot_key, slot_group, slot_class, player_id FROM squad_slots WHERE squad_id = $1',
      [squadId],
    )
    const reserve = slots.rows.find((row) => row.slot_group === 'sub')!
    const starter = slots.rows.find((row) => row.slot_group === 'starter' && row.slot_class === reserve.slot_class)!
    const playerInId = Number(reserve.player_id)
    const playerOutId = Number(starter.player_id)

    const result = await squads.swapPlayers(participantId, { playerInId, playerOutId })
    expect(result.windowKey).toBe('W3')
    expect(result.targetRound).toBe(6)
    expect(result.swap.playerInId).toBe(playerInId)
    expect(result.swap.playerOutId).toBe(playerOutId)

    // The round-6 snapshot has the reserve promoted to the starter slot.
    const lineup = await squads.listRoundLineupSlots(participantId)
    const round6 = lineup.filter((slot) => slot.roundKey === 6)
    expect(round6).toHaveLength(15)
    expect(round6.find((slot) => slot.playerId === playerInId)?.slotGroup).toBe('starter')
    expect(round6.find((slot) => slot.playerId === playerOutId)?.slotGroup).toBe('sub')

    // The swap log has exactly the one row we wrote.
    const history = await squads.listSwaps(participantId)
    expect(history).toHaveLength(1)
    expect(history[0].windowKey).toBe('W3')
  })
})
