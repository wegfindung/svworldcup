import type { RequestHandler } from 'express'
import { logger } from '../lib/logger.js'

// Per-request timing (see SOP_system_overview.md "Operations Observability"). Logs method, path,
// status and duration on completion; slow or server-error responses are raised to warn so they
// stand out in the log stream.
const SLOW_REQUEST_MS = 1000

export const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const durationMs = Date.now() - start
    const payload = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
    }
    if (res.statusCode >= 500 || durationMs > SLOW_REQUEST_MS) {
      logger.warn(payload, 'request completed')
    } else {
      logger.info(payload, 'request completed')
    }
  })
  next()
}
