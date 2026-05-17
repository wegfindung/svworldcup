import { Router } from 'express'
import { z } from 'zod'
import { STARTING_BUDGET } from '../data/formation.js'
import { getSoccerverseCountryId } from '../data/teamCountryMap.js'
import { defaultLocale, isKnownTeamCode, supportedLocales, teams } from '../data/worldCupSeed.js'
import type { ConfigRepository } from '../repositories/configRepository.js'
import type { FixtureRepository } from '../repositories/fixtureRepository.js'
import type { RegistrationRepository } from '../repositories/registrationRepository.js'
import type { TeamPoolRepository } from '../repositories/teamPoolRepository.js'
import type { ScoringRepository } from '../repositories/scoringRepository.js'
import type { SquadRepository } from '../repositories/squadRepository.js'
import { handleShareCardImage } from './share.js'
import { searchCommunityPlayerIds } from '../services/communityPack.js'
import { buildPublicFixtureResults } from '../services/matchResults.js'
import { fetchPlayersByIds, withImageUrl } from '../services/soccerverse.js'

const playerSearchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  teamCode: z.string().trim().toUpperCase().length(3).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(20).default(12),
})

const referralClickSchema = z.object({
  referrerSoccerverseUsername: z.string().trim().max(60),
  landingPath: z.string().trim().max(300).optional(),
})

function normalizeReferrerSoccerverseUsername(value: string) {
  const sanitized = value.trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60)
  return sanitized || undefined
}

interface Dependencies {
  configRepository: ConfigRepository
  registrationRepository: RegistrationRepository
  fixtureRepository: FixtureRepository
  teamPoolRepository: TeamPoolRepository
  scoringRepository: ScoringRepository
  squadRepository: SquadRepository
}

export function createPublicRouter({ configRepository, registrationRepository, fixtureRepository, teamPoolRepository, scoringRepository, squadRepository }: Dependencies) {
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
    const [scoring, currentFixtures] = await Promise.all([configRepository.getScoringConfig(), fixtureRepository.listFixtures()])
    res.json({
      supportedLocales,
      defaultLocale,
      scoring,
      budgetLimit: STARTING_BUDGET,
      teams,
      fixtures: currentFixtures,
      leagues: {
        rookie: 'Ownership boost available once you link your Soccerverse account (1% per 10 net influence on drafted players, capped at 10%).',
        veteran: '1% for every 10 net influence accumulated on drafted players since you registered or linked, capped at 10%.',
      },
    })
  })

  router.get('/teams', (_req, res) => {
    res.json({ items: teams })
  })

  router.get('/fixtures', async (_req, res) => {
    res.json({ items: await fixtureRepository.listFixtures() })
  })

  router.get('/match-results', async (_req, res) => {
    const currentFixtures = await fixtureRepository.listFixtures()
    const teamCodes = [...new Set(currentFixtures.flatMap((fixture) => [fixture.homeTeamCode, fixture.awayTeamCode]))]
    const playersByTeam = new Map<string, Awaited<ReturnType<typeof teamPoolRepository.listByTeam>>>()
    const [entries] = await Promise.all([
      scoringRepository.listMatchEntries(),
      Promise.all(teamCodes.map(async (teamCode) => playersByTeam.set(teamCode, await teamPoolRepository.listByTeam(teamCode)))),
    ])
    const items = buildPublicFixtureResults(currentFixtures, playersByTeam, entries)

    res.json({
      items,
      summary: {
        totalFixtures: items.length,
        finalFixtures: items.filter((item) => item.status === 'final').length,
        pendingFixtures: items.filter((item) => item.status === 'pending').length,
      },
    })
  })

  router.get('/share-card.png', handleShareCardImage)

  router.post('/referral-click', async (req, res) => {
    const parsed = referralClickSchema.parse(req.body)
    const referrerSoccerverseUsername = normalizeReferrerSoccerverseUsername(parsed.referrerSoccerverseUsername)
    if (referrerSoccerverseUsername) {
      await registrationRepository.recordReferralClick({
        referrerSoccerverseUsername,
        landingPath: parsed.landingPath,
        userAgent: req.header('user-agent')?.slice(0, 300),
      })
    }

    res.status(204).end()
  })

  router.get('/email/unsubscribe', async (req, res) => {
    const token = String(req.query.token ?? '').trim()
    const unsubscribed = token ? await registrationRepository.unsubscribeMarketing(token) : false
    res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Soccerverse World Cup Email Preferences</title>
  </head>
  <body style="margin:0;background:#07100e;color:#f2efe7;font-family:Arial,sans-serif;">
    <main style="max-width:620px;margin:0 auto;padding:48px 24px;line-height:1.55;">
      <h1 style="margin:0 0 16px;font-size:28px;">${unsubscribed ? 'Email subscription stopped.' : 'Unsubscribe link not found.'}</h1>
      <p style="margin:0;color:#c6d3ce;">${
        unsubscribed
          ? 'You will no longer receive Soccerverse World Cup marketing emails.'
          : 'This unsubscribe link is invalid or has already been removed.'
      }</p>
    </main>
  </body>
</html>`)
  })

  router.get('/team-players/:teamCode', async (req, res) => {
    const teamCode = String(req.params.teamCode ?? '').trim().toUpperCase()
    if (!isKnownTeamCode(teamCode)) {
      return res.status(404).json({ error: 'Unknown team.' })
    }

    const items = await teamPoolRepository.listByTeam(teamCode)
    res.json({ items })
  })

  router.get('/leaderboards/rookie', async (_req, res) => {
    const items = await scoringRepository.getLeagueLeaderboard('rookie')
    res.json({ items })
  })

  router.get('/leaderboards/veteran', async (_req, res) => {
    const items = await scoringRepository.getLeagueLeaderboard('veteran')
    res.json({ items })
  })

  router.get('/leaderboards/nations', async (_req, res) => {
    const items = await scoringRepository.getNationLeaderboard()
    res.json({ items })
  })

  router.get('/profiles/:slug', async (req, res) => {
    const slug = String(req.params.slug ?? '').trim()
    const participant = await registrationRepository.getPublicProfileBySlug(slug)
    const eventControls = await configRepository.getEventControls()
    const canShowProfile = participant?.revealProfile || eventControls.globalRevealProfiles
    const canShowSquad = participant?.revealSquad || eventControls.globalRevealSquads

    if (!participant || !canShowProfile) {
      return res.status(404).json({ error: 'Public profile not found.' })
    }

    const leagueRows = await scoringRepository.getLeagueLeaderboard(participant.leagueType)
    const score = leagueRows.find((row) => row.participantId === participant.participantId)
    const revealableSquad = canShowSquad ? await squadRepository.getOrCreate(participant.participantId) : undefined
    const squad = revealableSquad?.isLocked ? revealableSquad : undefined

    res.json({
      item: {
        slug,
        participantId: participant.participantId,
        displayName: participant.displayName,
        soccerverseUsername: participant.soccerverseUsername,
        leagueType: participant.leagueType,
        primaryTeamCode: participant.primaryTeamCode,
        secondaryTeamCode: participant.secondaryTeamCode,
        revealProfile: canShowProfile,
        revealSquad: Boolean(squad),
        score,
        squad,
      },
    })
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
