import type { Pool, PoolClient, QueryConfig } from 'pg'
import { env } from '../config/env.js'
import { logger } from './logger.js'

// Operations Observability (see SOP_system_overview.md): per-statement slow-query logging. The pool's
// `connect` event patches each physical connection's `query` once. Because `pool.query` checks out a
// pooled client and calls that client's `query`, patching here covers both `pool.query` and explicit
// transaction `client.query` — with no change at any call site. The patch delegates to the original
// and only observes the returned promise, so query behaviour is untouched.

const MAX_LOGGED_SQL = 200

function extractSql(arg: unknown): string {
  if (typeof arg === 'string') {
    return arg
  }
  if (arg && typeof arg === 'object' && typeof (arg as QueryConfig).text === 'string') {
    return (arg as QueryConfig).text
  }
  return '(non-text query)'
}

function truncateSql(sql: string): string {
  const collapsed = sql.replace(/\s+/g, ' ').trim()
  return collapsed.length > MAX_LOGGED_SQL ? `${collapsed.slice(0, MAX_LOGGED_SQL)}…` : collapsed
}

type PatchableClient = PoolClient & { __slowQueryPatched?: boolean }

function patchClientQuery(client: PatchableClient): void {
  if (client.__slowQueryPatched) {
    return
  }
  client.__slowQueryPatched = true

  const original = client.query.bind(client) as (...args: unknown[]) => unknown
  client.query = ((...args: unknown[]) => {
    const start = Date.now()
    const result = original(...args)
    // Only the promise form is timed; callback/Submittable forms (unused here) pass through untouched.
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      const record = () => {
        const durationMs = Date.now() - start
        if (durationMs >= env.DB_SLOW_QUERY_MS) {
          logger.warn({ durationMs, query: truncateSql(extractSql(args[0])) }, 'slow query')
        }
      }
      // Attach to a detached chain so a rejected query still records timing and is not double-handled
      // — the original promise is returned to the caller unchanged, preserving its rejection.
      ;(result as Promise<unknown>).then(record, record)
    }
    return result
  }) as typeof client.query
}

export function instrumentSlowQueries(pool: Pool): void {
  pool.on('connect', (client) => {
    patchClientQuery(client as PatchableClient)
  })
}
