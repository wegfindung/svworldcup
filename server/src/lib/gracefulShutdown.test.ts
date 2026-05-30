import { describe, expect, it, vi } from 'vitest'
import { createShutdownHandler } from './gracefulShutdown.js'

function makeServer(closeError?: Error) {
  return {
    close: vi.fn((cb?: (error?: Error) => void) => {
      cb?.(closeError)
    }),
  }
}

const silentLogger = { info: vi.fn(), error: vi.fn() }

describe('createShutdownHandler', () => {
  it('closes the server then the pool, then exits 0', async () => {
    const calls: string[] = []
    const server = {
      close: vi.fn((cb?: (error?: Error) => void) => {
        calls.push('server')
        cb?.()
      }),
    }
    const closePool = vi.fn(async () => {
      calls.push('pool')
    })
    const exit = vi.fn()

    const shutdown = createShutdownHandler({ server, closePool, logger: silentLogger, exit })
    await shutdown('SIGTERM')

    expect(calls).toEqual(['server', 'pool'])
    expect(exit).toHaveBeenCalledWith(0)
  })

  it('is idempotent — a second signal does nothing', async () => {
    const server = makeServer()
    const closePool = vi.fn(async () => {})
    const exit = vi.fn()

    const shutdown = createShutdownHandler({ server, closePool, logger: silentLogger, exit })
    await shutdown('SIGTERM')
    await shutdown('SIGINT')

    expect(server.close).toHaveBeenCalledTimes(1)
    expect(closePool).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledTimes(1)
  })

  it('still exits when closing the pool throws', async () => {
    const server = makeServer()
    const closePool = vi.fn(async () => {
      throw new Error('pool boom')
    })
    const exit = vi.fn()
    const logger = { info: vi.fn(), error: vi.fn() }

    const shutdown = createShutdownHandler({ server, closePool, logger, exit })
    await shutdown('SIGTERM')

    expect(logger.error).toHaveBeenCalled()
    expect(exit).toHaveBeenCalledWith(0)
  })
})
