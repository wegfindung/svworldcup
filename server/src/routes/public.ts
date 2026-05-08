import { Router } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { defaultLocale, fixtures, supportedLocales, teams } from '../data/worldCupSeed.js'
import type { ConfigRepository } from '../repositories/configRepository.js'
import type { RegistrationRepository } from '../repositories/registrationRepository.js'

const playerSearchSchema = z.object({
  name: z.string().trim().optional(),
  nationality: z.string().trim().toUpperCase().optional(),
  position: z.string().trim().toUpperCase().optional(),
  ratingMin: z.coerce.number().int().min(0).max(99).optional(),
  ratingMax: z.coerce.number().int().min(0).max(99).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(20).default(12),
})

interface Dependencies {
  configRepository: ConfigRepository
  registrationRepository: RegistrationRepository
}

export function createPublicRouter({ configRepository, registrationRepository }: Dependencies) {
  const router = Router()

  router.get('/health', async (_req, res) => {
    const counts = await registrationRepository.getCounts()
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      storage: {
        registrations: registrationRepository.storageKind,
        config: configRepository.storageKind,
      },
      counts,
    })
  })

  router.get('/bootstrap', async (_req, res) => {
    const scoring = await configRepository.getScoringConfig()
    res.json({
      supportedLocales,
      defaultLocale,
      scoring,
      teams,
      fixtures,
      leagues: {
        rookie: 'No ownership bonus',
        veteran: '1% for every 10 influence on drafted players, capped at 10%',
      },
    })
  })

  router.get('/teams', (_req, res) => {
    res.json({ items: teams })
  })

  router.get('/fixtures', (_req, res) => {
    res.json({ items: fixtures })
  })

  router.get('/player-search', async (req, res) => {
    const parsed = playerSearchSchema.parse({
      name: req.query.name,
      nationality: req.query.nationality,
      position: req.query.position,
      ratingMin: req.query.ratingMin,
      ratingMax: req.query.ratingMax,
      page: req.query.page,
      perPage: req.query.perPage,
    })

    const searchParams = new URLSearchParams({
      page: String(parsed.page),
      per_page: String(parsed.perPage),
    })

    if (parsed.name) searchParams.set('name', parsed.name)
    if (parsed.nationality) searchParams.set('nationality', parsed.nationality)
    if (parsed.position) searchParams.set('positions', parsed.position)
    if (parsed.ratingMin !== undefined) searchParams.set('rating_min', String(parsed.ratingMin))
    if (parsed.ratingMax !== undefined) searchParams.set('rating_max', String(parsed.ratingMax))

    const response = await fetch(`${env.SV_SERVICES_API_URL}/players/detailed?${searchParams.toString()}`)
    if (!response.ok) {
      return res.status(502).json({ error: 'Soccerverse player search failed.' })
    }

    const data = (await response.json()) as {
      items?: Array<Record<string, unknown>>
      total?: number
      total_pages?: number
      page?: number
    }

    res.json({
      items: (data.items ?? []).map((item) => ({
        playerId: item.player_id,
        name: item.name,
        clubId: item.club_id,
        nationality: item.nationality,
        rating: item.rating,
        imageUrl: `https://elrincondeldt.com/sv/photos/players/${item.player_id}.png`,
        positions: Array.isArray(item.positions) ? item.positions : [],
        positionMain: item.position_main,
      })),
      total: data.total ?? 0,
      page: data.page ?? parsed.page,
      totalPages: data.total_pages ?? 1,
    })
  })

  return router
}
