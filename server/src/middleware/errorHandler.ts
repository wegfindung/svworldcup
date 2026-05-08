import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed.',
      details: error.issues,
    })
  }

  const message = error instanceof Error ? error.message : 'Unknown server error.'
  return res.status(500).json({ error: message })
}
