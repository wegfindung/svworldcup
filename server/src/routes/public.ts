import { Router } from 'express'
import { z } from 'zod'
import { STARTING_BUDGET } from '../data/formation.js'
import { getSoccerverseCountryId } from '../data/teamCountryMap.js'
import { defaultLocale, fixtures, isKnownTeamCode, supportedLocales, teams } from '../data/worldCupSeed.js'
import type { ConfigRepository } from '../repositories/configRepository.js'
import type { RegistrationRepository } from '../repositories/registrationRepository.js'
import type { TeamPoolRepository } from '../repositories/teamPoolRepository.js'
import { searchCommunityPlayerIds } from '../services/communityPack.js'
import { fetchPlayersByIds, withImageUrl } from '../services/soccerverse.js'

const playerSearchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  teamCode: z.string().trim().toUpperCase().length(3).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(20).default(12),
})

interface Dependencies {
  configRepository: ConfigRepository
  registrationRepository: RegistrationRepository
  teamPoolRepository: TeamPoolRepository
}

export function createPublicRouter({ configRepository, registrationRepository, teamPoolRepository }: Dependencies) {
  const router = Router()

  router.get('/health', async (_req, res) => {
    const counts = await registrationRepository.getCounts()
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      storage: {
        registrations: registrationRepository.storageKind,
        config: configRepository.storageKind,
        teamPool: teamPoolRepository.storageKind,
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
      budgetLimit: STARTING_BUDGET,
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

  router.get('/team-players/:teamCode', async (req, res) => {
    const teamCode = String(req.params.teamCode ?? '').trim().toUpperCase()
    if (!isKnownTeamCode(teamCode)) {
      return res.status(404).json({ error: 'Unknown team.' })
    }

    const items = await teamPoolRepository.listByTeam(teamCode)
    res.json({ items })
  })

  router.get('/player-search', async (req, res) => {
    const parsed = playerSearchSchema.parse({
      name: req.query.name,
      teamCode: req.query.teamCode,
      page: req.query.page,
      perPage: req.query.perPage,
    })

    if (!parsed.name) {
      return res.json({ items: [], total: 0, page: parsed.page, totalPages: 0 })
    }

    const matchingIds = await searchCommunityPlayerIds(parsed.name, 80)
    const countryId = parsed.teamCode ? getSoccerverseCountryId(parsed.teamCode) : undefined
    const players = (await fetchPlayersByIds(matchingIds, countryId)).map(withImageUrl)
    const startIndex = (parsed.page - 1) * parsed.perPage
    const pageItems = players
      .sort((left, right) => right.rating - left.rating || left.displayName.localeCompare(right.displayName))
      .slice(startIndex, startIndex + parsed.perPage)

    res.json({
      items: pageItems,
      total: players.length,
      page: parsed.page,
      totalPages: Math.max(1, Math.ceil(players.length / parsed.perPage)),
    })
  })

  return router
}
