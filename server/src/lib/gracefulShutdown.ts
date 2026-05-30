// Graceful shutdown handler (see SOP_system_overview.md "Runtime Resilience"). On a termination
// signal: stop accepting new connections, let in-flight requests drain, close the database pool,
// then exit. A bounded timeout forces exit if draining stalls so a deploy cannot hang.

interface ClosableServer {
  close(callback?: (error?: Error) => void): unknown
}

interface ShutdownDeps {
  server: ClosableServer
  closePool: () => Promise<void>
  logger?: Pick<Console, 'log' | 'error'>
  exit?: (code: number) => void
  timeoutMs?: number
}

export function createShutdownHandler(deps: ShutdownDeps) {
  const logger = deps.logger ?? console
  const exit = deps.exit ?? ((code: number) => process.exit(code))
  const timeoutMs = deps.timeoutMs ?? 10_000
  let started = false

  return async function shutdown(signal: string): Promise<void> {
    if (started) {
      return
    }
    started = true
    logger.log(`Received ${signal}, shutting down gracefully`)

    const forceTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit')
      exit(1)
    }, timeoutMs)
    // Don't let the timer keep the event loop alive on its own.
    if (typeof forceTimer.unref === 'function') {
      forceTimer.unref()
    }

    await new Promise<void>((resolve) => {
      deps.server.close((error) => {
        if (error) {
          logger.error('Error closing HTTP server', error)
        }
        resolve()
      })
    })

    try {
      await deps.closePool()
    } catch (error) {
      logger.error('Error closing database pool', error)
    }

    clearTimeout(forceTimer)
    exit(0)
  }
}
