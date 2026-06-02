import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { MemoryLandingAnalyticsRepository } from '../repositories/landingAnalyticsRepository.js'
import { createPublicRouter } from './public.js'

function setup() {
  const landingAnalyticsRepository = new MemoryLandingAnalyticsRepository()
  const app = express()
  app.set('trust proxy', true)
  app.use(express.json())
  app.use(
    '/api/public',
    createPublicRouter({
      landingAnalyticsRepository,
    } as never),
  )
  return { app, landingAnalyticsRepository }
}

describe('POST /landing-page-visit', () => {
  it('dedupes homepage visitors by IP hash while retaining hit count', async () => {
    const { app, landingAnalyticsRepository } = setup()

    await request(app)
      .post('/api/public/landing-page-visit')
      .set('X-Forwarded-For', '203.0.113.10')
      .send({ landingPath: '/' })
      .expect(204)
    await request(app)
      .post('/api/public/landing-page-visit')
      .set('X-Forwarded-For', '203.0.113.10')
      .send({ landingPath: '/' })
      .expect(204)
    await request(app)
      .post('/api/public/landing-page-visit')
      .set('X-Forwarded-For', '203.0.113.11')
      .send({ landingPath: '/' })
      .expect(204)

    await expect(landingAnalyticsRepository.getLandingPageVisitStats()).resolves.toEqual({
      uniqueVisitors: 2,
      totalVisits: 3,
      reloadCount: 1,
    })
  })
})
