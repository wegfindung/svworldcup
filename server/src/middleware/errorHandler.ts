import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { logger } from '../lib/logger.js'
import { MatchImportValidationError } from '../lib/matchImportError.js'

// Postgres query cancellation (statement_timeout / lock_timeout) and the pg connection-pool acquisition
// timeout mean "server busy", not "request broke" — surface them as 503 + Retry-After so clients and
// proxies back off instead of treating a transient overload as a hard 500. Most likely to fire during the
// registration / squad-lock deadline rush when the pool saturates. See SOP_system_overview.md
// "Operations Observability".
const PG_QUERY_CANCELED = '57014'
const POOL_CONNECT_TIMEOUT_MESSAGE = 'timeout exceeded when trying to connect'
const RETRY_AFTER_SECONDS = 5

function isTransientOverloadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  if ((error as { code?: unknown }).code === PG_QUERY_CANCELED) {
    return true
  }
  return error.message.includes(POOL_CONNECT_TIMEOUT_MESSAGE)
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed.',
      details: error.issues,
    })
  }

  if (error instanceof MatchImportValidationError) {
    return res.status(422).json({ error: error.message })
  }

  if (isTransientOverloadError(error)) {
    res.setHeader('Retry-After', String(RETRY_AFTER_SECONDS))
    // Expected under load, not a defect — log at warn so it doesn't drown the real 500s.
    logger.warn({ method: req.method, path: req.originalUrl, err: error }, 'transient overload (pool/statement timeout)')
    return res.status(503).json({ error: 'Service is busy, please retry shortly.' })
  }

  const message = error instanceof Error ? error.message : 'Unknown server error.'
  // Unhandled 500s are the ones we need visibility on — log with request context.
  logger.error({ method: req.method, path: req.originalUrl, err: error }, 'unhandled request error')
  return res.status(500).json({ error: message })
}
