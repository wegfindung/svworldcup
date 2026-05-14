import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { MatchImportValidationError } from '../lib/matchImportError.js'

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
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
  return res.status(500).json({ error: message })
}
