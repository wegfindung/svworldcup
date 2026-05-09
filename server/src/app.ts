import { existsSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { createAuthRouter } from './routes/auth.js'
import { createAdminRouter } from './routes/admin.js'
import { createParticipantRouter } from './routes/participant.js'
import { createPublicRouter } from './routes/public.js'
import { bootstrapInitialTeamPools } from './services/bootstrapTeamPools.js'
import {
  createAdminRepository,
  createConfigRepository,
  createParticipantSessionRepository,
  createRegistrationRepository,
  createSquadRepository,
  createTeamPoolRepository,
} from './services/repos.js'

export function createApp() {
  const app = express()
  const registrationRepository = createRegistrationRepository()
  const configRepository = createConfigRepository()
  const participantSessionRepository = createParticipantSessionRepository()
  const adminRepository = createAdminRepository()
  const teamPoolRepository = createTeamPoolRepository()
  const squadRepository = createSquadRepository()
  const publicDirCandidates = [resolve(process.cwd(), 'public'), resolve(process.cwd(), 'web', 'dist')]
  const publicDir = publicDirCandidates.find((candidate) => existsSync(candidate))
  const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives()
  cspDirectives['img-src'] = ["'self'", 'data:', 'https://elrincondeldt.com', 'https://media.api-sports.io']
  const publicApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 180,
    standardHeaders: true,
    legacyHeaders: false,
  })
  const authApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
  const participantApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 180,
    standardHeaders: true,
    legacyHeaders: false,
  })
  const adminApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 180,
    standardHeaders: true,
    legacyHeaders: false,
  })

  void bootstrapInitialTeamPools(teamPoolRepository).catch((error) => {
    console.error('Failed to bootstrap initial team pools', error)
  })

  app.set('trust proxy', env.RATE_LIMIT_TRUST_PROXY)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: cspDirectives,
      },
    }),
  )
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))

  if (publicDir) {
    app.use(
      express.static(publicDir, {
        index: false,
      }),
    )
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next()
      }
      if (extname(req.path)) {
        return res.status(404).end()
      }
      res.sendFile(resolve(publicDir, 'index.html'))
    })
  }

  app.use('/api/public', publicApiLimiter, createPublicRouter({ registrationRepository, configRepository, teamPoolRepository }))
  app.use('/api/auth', authApiLimiter, createAuthRouter(registrationRepository, participantSessionRepository))
  app.use('/api/participant', participantApiLimiter, createParticipantRouter(participantSessionRepository, squadRepository))
  app.use('/api/admin', adminApiLimiter, createAdminRouter(adminRepository, registrationRepository, configRepository, teamPoolRepository))

  app.use(errorHandler)

  return app
}
