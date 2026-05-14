import { createHmac, timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { env } from '../config/env.js'
import { parseCookies } from './cookies.js'

function csrfSecret() {
  return env.CSRF_TOKEN_SECRET ?? env.SESSION_SECRET ?? env.ADMIN_API_TOKEN ?? 'development-csrf-secret'
}

export function createCsrfToken(sessionToken: string, scope: 'admin' | 'participant') {
  return createHmac('sha256', csrfSecret()).update(`${scope}:${sessionToken}`).digest('base64url')
}

function verifyCsrfToken(sessionToken: string, scope: 'admin' | 'participant', token: string) {
  const expected = Buffer.from(createCsrfToken(sessionToken, scope), 'utf8')
  const actual = Buffer.from(token, 'utf8')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function isSafeMethod(method: string) {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
}

export function createRequireCookieCsrf(cookieName: string, scope: 'admin' | 'participant'): RequestHandler {
  return (req, res, next) => {
    if (isSafeMethod(req.method)) {
      return next()
    }

    const cookies = parseCookies(req.header('cookie'))
    const sessionToken = cookies[cookieName]
    if (!sessionToken) {
      return next()
    }

    const csrfToken = String(req.header('x-csrf-token') ?? '')
    if (!csrfToken || !verifyCsrfToken(sessionToken, scope, csrfToken)) {
      return res.status(403).json({ error: 'CSRF token is invalid or missing.' })
    }

    next()
  }
}
