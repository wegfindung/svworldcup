import type { RequestHandler } from 'express'
import { env } from '../config/env.js'

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!env.ADMIN_API_TOKEN) {
    return res.status(503).json({ error: 'Admin API token is not configured.' })
  }

  const authorization = req.header('authorization') ?? ''
  const adminEmail = (req.header('x-admin-email') ?? '').trim().toLowerCase()

  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing admin bearer token.' })
  }

  if (authorization.slice('Bearer '.length) !== env.ADMIN_API_TOKEN) {
    return res.status(403).json({ error: 'Invalid admin bearer token.' })
  }

  if (!adminEmail || !env.ADMIN_BOOTSTRAP_EMAILS.includes(adminEmail)) {
    return res.status(403).json({ error: 'Admin email is not allowed.' })
  }

  res.locals.adminEmail = adminEmail
  next()
}
