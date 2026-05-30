import { env } from './config/env.js'
import { createApp } from './app.js'
import { createShutdownHandler } from './lib/gracefulShutdown.js'
import { closeRepositoryPool } from './services/repos.js'

const app = createApp()

const server = app.listen(env.PORT, () => {
  console.log(`The Grand Tournament server listening on :${env.PORT}`)
})

const shutdown = createShutdownHandler({ server, closePool: closeRepositoryPool })
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

// Last-resort visibility net. The single-process service is kept running rather than crashed so a
// stray background error doesn't take the whole site down (route errors are handled by Express).
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection', reason)
})
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception', error)
})
