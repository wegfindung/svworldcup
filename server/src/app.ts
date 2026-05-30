import { existsSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { env } from './config/env.js'
import { createClosedBetaAuth } from './middleware/closedBetaAuth.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import { logger } from './lib/logger.js'
import { createAuthRouter } from './routes/auth.js'
import { createAdminRouter } from './routes/admin.js'
import { createParticipantRouter } from './routes/participant.js'
import { createPublicRouter } from './routes/public.js'
import { handleShareSnapshotPage } from './routes/share.js'
import { bootstrapDefaultEmailCampaigns } from './services/bootstrapEmailCampaigns.js'
import { bootstrapInitialTeamPools } from './services/bootstrapTeamPools.js'
import { startEmailMarketingScheduler } from './services/emailMarketingScheduler.js'
import {
  createAdminRepository,
  createAuditRepository,
  createConfigRepository,
  createEmailMarketingRepository,
  createFixtureRepository,
  createMatchImportRepository,
  createMatchMappingRepository,
  createParticipantSessionRepository,
  createRegistrationRepository,
  createScoringRepository,
  createSquadRepository,
  createTeamPoolRepository,
  createParticipantInfluenceSnapshotRepository,
  createParticipantRiskRepository,
} from './services/repos.js'

export function createApp() {
  const app = express()
  const registrationRepository = createRegistrationRepository()
  const configRepository = createConfigRepository()
  const participantSessionRepository = createParticipantSessionRepository()
  const adminRepository = createAdminRepository()
  const teamPoolRepository = createTeamPoolRepository()
  const squadRepository = createSquadRepository()
  const fixtureRepository = createFixtureRepository()
  const scoringRepository = createScoringRepository()
  const matchImportRepository = createMatchImportRepository()
  const matchMappingRepository = createMatchMappingRepository()
  const auditRepository = createAuditRepository()
  const emailMarketingRepository = createEmailMarketingRepository()
  const participantInfluenceSnapshotRepository = createParticipantInfluenceSnapshotRepository()
  const participantRiskRepository = createParticipantRiskRepository()
  const cwd = process.cwd()
  const publicDirCandidates = [
    resolve(cwd, 'public'),
    resolve(cwd, 'web', 'dist'),
    resolve(cwd, '..', 'public'),
    resolve(cwd, '..', 'web', 'dist'),
  ]
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
  // Tighter cap for the uncached, costliest public endpoints (player search hits the paced
  // Soccerverse gate; match-results runs 2 + N queries). See SOP_system_overview.md "Security Rules".
  const expensivePublicLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })

  void bootstrapInitialTeamPools(teamPoolRepository).catch((error) => {
    logger.error({ err: error }, 'Failed to bootstrap initial team pools')
  })
  void bootstrapDefaultEmailCampaigns(emailMarketingRepository).catch((error) => {
    logger.error({ err: error }, 'Failed to bootstrap default email campaigns')
  })
  startEmailMarketingScheduler(emailMarketingRepository)

  app.set('trust proxy', env.RATE_LIMIT_TRUST_PROXY ? 1 : false)
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
  app.use(
    createClosedBetaAuth({
      enabled: env.CLOSED_BETA_AUTH_ENABLED,
      username: env.CLOSED_BETA_AUTH_USERNAME,
      password: env.CLOSED_BETA_AUTH_PASSWORD,
      adminApiToken: env.ADMIN_API_TOKEN,
      adminBootstrapEmails: env.ADMIN_BOOTSTRAP_EMAILS,
      exemptPaths: ['/api/public/health'],
    }),
  )
  app.use(express.json({ limit: '1mb' }))

  app.get('/share/snapshot', handleShareSnapshotPage)

  if (publicDir) {
    app.use(
      express.static(publicDir, {
        index: false,
        setHeaders: (res, filePath) => {
          if (/[/\\]assets[/\\]/.test(filePath)) {
            // Vite fingerprints these — the content can never change under the same name.
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          } else {
            res.setHeader('Cache-Control', 'public, max-age=3600')
          }
        },
      }),
    )
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next()
      }
      if (extname(req.path)) {
        return res.status(404).end()
      }
      // The SPA shell must never be cached, or a deploy won't be picked up until the asset expires.
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(resolve(publicDir, 'index.html'))
    })
  }

  // Time and log every API request (static assets / SPA shell are already served above).
  app.use('/api', requestLogger)

  // Per-endpoint caps run before the general public limiter so the expensive routes get the tighter
  // budget on top of the shared one.
  app.use('/api/public/player-search', expensivePublicLimiter)
  app.use('/api/public/match-results', expensivePublicLimiter)
  app.use(
    '/api/public',
    publicApiLimiter,
    createPublicRouter({ registrationRepository, configRepository, teamPoolRepository, fixtureRepository, scoringRepository, squadRepository }),
  )
  app.use(
    '/api/auth',
    authApiLimiter,
    createAuthRouter(registrationRepository, participantSessionRepository, squadRepository, emailMarketingRepository, participantRiskRepository, auditRepository),
  )
  app.use(
    '/api/participant',
    participantApiLimiter,
    createParticipantRouter(participantSessionRepository, squadRepository, fixtureRepository, registrationRepository, auditRepository, participantRiskRepository),
  )
  app.use(
    '/api/admin',
    adminApiLimiter,
    createAdminRouter(
      adminRepository,
      registrationRepository,
      configRepository,
      teamPoolRepository,
      scoringRepository,
      matchImportRepository,
      matchMappingRepository,
      auditRepository,
      emailMarketingRepository,
      participantInfluenceSnapshotRepository,
      participantRiskRepository,
    ),
  )

  app.use(errorHandler)

  return app
}
