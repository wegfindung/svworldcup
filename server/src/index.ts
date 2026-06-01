import { env } from './config/env.js'
import { createApp } from './app.js'
import { createShutdownHandler } from './lib/gracefulShutdown.js'
import { logger } from './lib/logger.js'
import { closeRepositoryPool } from './services/repos.js'

const app = createApp()

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'The Grand Tournament server listening')
})

const shutdown = createShutdownHandler({ server, closePool: closeRepositoryPool, logger })
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

// Last-resort visibility net. The single-process service is kept running rather than crashed so a
// stray background error doesn't take the whole site down (route errors are handled by Express).
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandled promise rejection')
})
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'uncaught exception')
})
