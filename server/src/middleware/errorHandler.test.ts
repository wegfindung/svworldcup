import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'

const warn = vi.fn()
const error = vi.fn()
vi.mock('../lib/logger.js', () => ({
  logger: { warn: (...a: unknown[]) => warn(...a), error: (...a: unknown[]) => error(...a) },
}))

import { errorHandler } from './errorHandler.js'

function run(err: unknown) {
  const headers: Record<string, string> = {}
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
    setHeader(name: string, value: string) {
      headers[name] = value
    },
  }
  errorHandler(
    err,
    { method: 'POST', originalUrl: '/api/participant/squad/assign' } as Request,
    res as unknown as Response,
    vi.fn(),
  )
  return { res, headers }
}

describe('errorHandler', () => {
  it('maps a ZodError to 400', () => {
    const { res } = run(new ZodError([]))
    expect(res.statusCode).toBe(400)
  })

  it('maps a Postgres query-cancellation (57014) to 503 + Retry-After, logged at warn', () => {
    warn.mockClear()
    error.mockClear()
    const pgError = Object.assign(new Error('canceling statement due to statement timeout'), { code: '57014' })
    const { res, headers } = run(pgError)
    expect(res.statusCode).toBe(503)
    expect(headers['Retry-After']).toBe('5')
    expect(warn).toHaveBeenCalledOnce()
    expect(error).not.toHaveBeenCalled()
  })

  it('maps a pool connection-acquisition timeout to 503 + Retry-After', () => {
    const { res, headers } = run(new Error('timeout exceeded when trying to connect'))
    expect(res.statusCode).toBe(503)
    expect(headers['Retry-After']).toBe('5')
  })

  it('maps an unknown error to 500 (no Retry-After), logged at error', () => {
    warn.mockClear()
    error.mockClear()
    const { res, headers } = run(new Error('boom'))
    expect(res.statusCode).toBe(500)
    expect(headers['Retry-After']).toBeUndefined()
    expect(error).toHaveBeenCalledOnce()
    expect(warn).not.toHaveBeenCalled()
  })
})
