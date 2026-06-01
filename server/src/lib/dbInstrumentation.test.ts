import { EventEmitter } from 'node:events'
import type { Pool, PoolClient } from 'pg'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { instrumentSlowQueries } from './dbInstrumentation.js'
import { logger } from './logger.js'

// Flush pending microtasks so the detached timing chain (.then(record)) runs before assertions.
const flush = () => new Promise((resolve) => setImmediate(resolve))

function fakePool() {
  return new EventEmitter() as unknown as Pool
}

describe('slow-query instrumentation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs a warn with duration and truncated SQL when a query meets the threshold', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger)
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1700).mockReturnValue(2000)

    const pool = fakePool()
    instrumentSlowQueries(pool)

    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) } as unknown as PoolClient
    pool.emit('connect', client)

    await client.query('SELECT 1 FROM participants')
    await flush()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[1]).toBe('slow query')
    expect(warn.mock.calls[0]?.[0]).toMatchObject({ durationMs: 700, query: 'SELECT 1 FROM participants' })
  })

  it('does not log a query under the threshold', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger)
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1100).mockReturnValue(2000)

    const pool = fakePool()
    instrumentSlowQueries(pool)

    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) } as unknown as PoolClient
    pool.emit('connect', client)

    await client.query('SELECT 1')
    await flush()

    expect(warn).not.toHaveBeenCalled()
  })

  it('still returns the original result and preserves a rejection', async () => {
    const pool = fakePool()
    instrumentSlowQueries(pool)

    const failure = new Error('query boom')
    const client = { query: vi.fn().mockRejectedValue(failure) } as unknown as PoolClient
    pool.emit('connect', client)

    await expect(client.query('SELECT bad')).rejects.toBe(failure)
  })
})
