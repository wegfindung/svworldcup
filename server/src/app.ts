import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
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

  void bootstrapInitialTeamPools(teamPoolRepository).catch((error) => {
    console.error('Failed to bootstrap initial team pools', error)
  })

  app.set('trust proxy', env.RATE_LIMIT_TRUST_PROXY)
  app.use(helmet())
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  )
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 60,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )
  app.use(express.json({ limit: '1mb' }))

  app.use('/api/public', createPublicRouter({ registrationRepository, configRepository, teamPoolRepository }))
  app.use('/api/auth', createAuthRouter(registrationRepository, participantSessionRepository))
  app.use('/api/participant', createParticipantRouter(participantSessionRepository, squadRepository))
  app.use('/api/admin', createAdminRouter(adminRepository, registrationRepository, configRepository, teamPoolRepository))

  if (publicDir) {
    app.use(express.static(publicDir))
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next()
      }
      res.sendFile(resolve(publicDir, 'index.html'))
    })
  }

  app.use(errorHandler)

  return app
}
