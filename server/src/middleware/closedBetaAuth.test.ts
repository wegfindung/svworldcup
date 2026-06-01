import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createClosedBetaAuth } from './closedBetaAuth.js'

function basicAuth(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`
}

function setup(options: Parameters<typeof createClosedBetaAuth>[0]) {
  const app = express()
  app.use(createClosedBetaAuth(options))
  app.get('/api/public/health', (_req, res) => res.json({ status: 'ok' }))
  app.get('/protected', (_req, res) => res.json({ ok: true }))
  return app
}

const enabledOptions = {
  enabled: true,
  username: 'soccerverse',
  password: 'soccerverse',
  exemptPaths: ['/api/public/health'],
}

describe('closed beta auth middleware', () => {
  it('lets exempt health checks through without credentials', async () => {
    const response = await request(setup(enabledOptions)).get('/api/public/health')
    expect(response.status).toBe(200)
  })

  it('challenges protected requests without credentials', async () => {
    const response = await request(setup(enabledOptions)).get('/protected')
    expect(response.status).toBe(401)
    expect(response.header['www-authenticate']).toContain('Basic')
  })

  it('accepts the closed beta credentials', async () => {
    const response = await request(setup(enabledOptions)).get('/protected').set('authorization', basicAuth('soccerverse', 'soccerverse'))
    expect(response.status).toBe(200)
  })

  it('lets social preview bots fetch public snippets without credentials', async () => {
    const response = await request(setup(enabledOptions)).get('/protected').set('user-agent', 'facebookexternalhit/1.1')
    expect(response.status).toBe(200)
  })

  it('does not let social preview bot user agents bypass non-GET requests', async () => {
    const app = setup(enabledOptions)
    app.post('/protected', (_req, res) => res.json({ ok: true }))
    const response = await request(app).post('/protected').set('user-agent', 'facebookexternalhit/1.1')
    expect(response.status).toBe(401)
  })

  it('rejects incorrect credentials', async () => {
    const response = await request(setup(enabledOptions)).get('/protected').set('authorization', basicAuth('soccerverse', 'wrong'))
    expect(response.status).toBe(401)
  })

  it('keeps bootstrap admin token flows usable for server-side tools', async () => {
    const response = await request(
      setup({
        ...enabledOptions,
        adminApiToken: 'admin-api-token',
        adminBootstrapEmails: ['admin@example.com'],
      }),
    )
      .get('/protected')
      .set('authorization', 'Bearer admin-api-token')
      .set('x-admin-email', 'admin@example.com')

    expect(response.status).toBe(200)
  })
})
