import pino from 'pino'
import { env } from '../config/env.js'

// Single shared structured logger (see SOP_system_overview.md "Operations Observability").
// JSON to stdout — machine-readable for any future aggregation. Silent under test so the suite
// stays quiet; level otherwise from LOG_LEVEL (default info).
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
})
