import { Buffer } from 'node:buffer'
import { timingSafeEqual } from 'node:crypto'
import type { Request, RequestHandler } from 'express'

interface ClosedBetaAuthOptions {
  enabled: boolean
  username: string
  password: string
  adminApiToken?: string
  adminBootstrapEmails?: string[]
  exemptPaths?: string[]
  realm?: string
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function hasValidBasicAuth(authorization: string, username: string, password: string) {
  const [scheme, encoded] = authorization.split(' ', 2)
  if (scheme !== 'Basic' || !encoded) {
    return false
  }

  const decoded = Buffer.from(encoded, 'base64').toString('utf8')
  const separatorIndex = decoded.indexOf(':')
  if (separatorIndex < 0) {
    return false
  }

  const suppliedUsername = decoded.slice(0, separatorIndex)
  const suppliedPassword = decoded.slice(separatorIndex + 1)
  const usernameMatches = safeEqual(suppliedUsername, username)
  const passwordMatches = safeEqual(suppliedPassword, password)

  return usernameMatches && passwordMatches
}

function hasValidAdminToken(req: Request, adminApiToken?: string, adminBootstrapEmails: string[] = []) {
  if (!adminApiToken) {
    return false
  }

  const authorization = req.header('authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) {
    return false
  }

  const suppliedToken = authorization.slice('Bearer '.length)
  const adminEmail = (req.header('x-admin-email') ?? '').trim().toLowerCase()
  return safeEqual(suppliedToken, adminApiToken) && adminBootstrapEmails.includes(adminEmail)
}

export function createClosedBetaAuth(options: ClosedBetaAuthOptions): RequestHandler {
  const exemptPaths = new Set(options.exemptPaths ?? [])
  const realm = options.realm ?? 'Soccerverse closed beta'

  return (req, res, next) => {
    if (!options.enabled || req.method === 'OPTIONS' || exemptPaths.has(req.path)) {
      return next()
    }

    if (hasValidAdminToken(req, options.adminApiToken, options.adminBootstrapEmails)) {
      return next()
    }

    const authorization = req.header('authorization') ?? ''
    if (hasValidBasicAuth(authorization, options.username, options.password)) {
      return next()
    }

    res.setHeader('WWW-Authenticate', `Basic realm="${realm}", charset="UTF-8"`)
    return res.status(401).send('Authentication required.')
  }
}
