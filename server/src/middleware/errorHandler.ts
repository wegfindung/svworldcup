import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { logger } from '../lib/logger.js'
import { MatchImportValidationError } from '../lib/matchImportError.js'

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

  const message = error instanceof Error ? error.message : 'Unknown server error.'
  // Unhandled 500s are the ones we need visibility on — log with request context.
  logger.error({ method: req.method, path: req.originalUrl, err: error }, 'unhandled request error')
  return res.status(500).json({ error: message })
}
