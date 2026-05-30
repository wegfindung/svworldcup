import { EventEmitter } from 'node:events'
import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

const warn = vi.fn()
const info = vi.fn()
vi.mock('../lib/logger.js', () => ({ logger: { warn: (...a: unknown[]) => warn(...a), info: (...a: unknown[]) => info(...a) } }))

import { requestLogger } from './requestLogger.js'

function run(req: Partial<Request>, res: EventEmitter & Partial<Response>) {
  const next = vi.fn()
  requestLogger(req as Request, res as Response, next)
  expect(next).toHaveBeenCalledOnce()
  res.emit('finish')
}

describe('requestLogger', () => {
  it('logs a normal 200 at info', () => {
    info.mockClear()
    warn.mockClear()
    const res = Object.assign(new EventEmitter(), { statusCode: 200 })
    run({ method: 'GET', originalUrl: '/api/public/teams' }, res)
    expect(info).toHaveBeenCalledOnce()
    expect(warn).not.toHaveBeenCalled()
    const [payload] = info.mock.calls[0]
    expect(payload).toMatchObject({ method: 'GET', path: '/api/public/teams', status: 200 })
    expect(typeof payload.durationMs).toBe('number')
  })

  it('raises a 500 to warn', () => {
    info.mockClear()
    warn.mockClear()
    const res = Object.assign(new EventEmitter(), { statusCode: 500 })
    run({ method: 'POST', originalUrl: '/api/admin/x' }, res)
    expect(warn).toHaveBeenCalledOnce()
    expect(info).not.toHaveBeenCalled()
  })
})
