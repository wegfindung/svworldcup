import type { RequestHandler } from 'express'
import { adminSessionCookieName } from '../config/auth.js'
import { env } from '../config/env.js'
import { parseCookies } from '../lib/cookies.js'
import type { AdminRepository } from '../repositories/adminRepository.js'

export function createRequireAdmin(adminRepository: AdminRepository): RequestHandler {
  return async (req, res, next) => {
    const cookies = parseCookies(req.header('cookie'))
    const sessionToken = cookies[adminSessionCookieName]

    if (sessionToken) {
      const admin = await adminRepository.getAdminBySessionToken(sessionToken)
      if (admin) {
        res.locals.admin = admin
        res.locals.adminSessionToken = sessionToken
        return next()
      }
    }

    if (env.ADMIN_API_TOKEN) {
      const authorization = req.header('authorization') ?? ''
      const adminEmail = (req.header('x-admin-email') ?? '').trim().toLowerCase()

      if (
        authorization.startsWith('Bearer ') &&
        authorization.slice('Bearer '.length) === env.ADMIN_API_TOKEN &&
        env.ADMIN_BOOTSTRAP_EMAILS.includes(adminEmail)
      ) {
        res.locals.admin = {
          adminId: 'bootstrap-token',
          email: adminEmail,
          isActive: true,
        }
        return next()
      }
    }

    return res.status(401).json({ error: 'Admin authentication is required.' })
  }
}
