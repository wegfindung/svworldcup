import { Router } from 'express'
import { z } from 'zod'
import { registrationCloseEpoch } from '../data/competitionWindow.js'
import { STARTING_BUDGET, budgetOptions } from '../data/formation.js'
import { getSoccerverseCountryId } from '../data/teamCountryMap.js'
import { defaultLocale, isKnownTeamCode, supportedLocales, teams } from '../data/worldCupSeed.js'
import type { ConfigRepository } from '../repositories/configRepository.js'
import type { FixtureRepository } from '../repositories/fixtureRepository.js'
import { publicProfileSlug, type RegistrationRepository } from '../repositories/registrationRepository.js'
import type { TeamPoolRepository } from '../repositories/teamPoolRepository.js'
import type { ScoringRepository } from '../repositories/scoringRepository.js'
import type { SquadRepository } from '../repositories/squadRepository.js'
import type { LandingAnalyticsRepository } from '../repositories/landingAnalyticsRepository.js'
import type { PublicSquadUsagePlayer, TeamPoolPlayer } from '../domain/types.js'
import { buildRequestRiskSignal } from '../lib/riskSignals.js'
import { handleShareCardImage } from './share.js'
import { searchCommunityPlayerIds } from '../services/communityPack.js'
import { buildPublicFixtureResults } from '../services/matchResults.js'
import { buildPlayerPointsLeaderboard } from '../services/playerPointsLeaderboard.js'
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

const landingPageVisitSchema = z.object({
  landingPath: z.string().trim().max(300).optional(),
})

function normalizeReferrerSoccerverseUsername(value: string) {
  const sanitized = value.trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60)
  return sanitized || undefined
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderEmailPreferencesPage(input: { token: string; status: 'unsubscribed' | 'resubscribed' | 'invalid' }) {
  const safeToken = encodeURIComponent(input.token)
  const heading =
    input.status === 'unsubscribed'
      ? 'Email subscription stopped.'
      : input.status === 'resubscribed'
        ? 'Email subscription restored.'
        : 'Subscription link not found.'
  const message =
    input.status === 'unsubscribed'
      ? 'You will no longer receive The Grand Tournament marketing emails.'
      : input.status === 'resubscribed'
        ? 'You are subscribed to The Grand Tournament marketing emails again.'
        : 'This subscription link is invalid or has already been removed.'
  const undoForm =
    input.status === 'unsubscribed'
      ? `<form method="post" action="/api/public/email/resubscribe?token=${safeToken}" style="margin:24px 0 0;">
          <button type="submit" style="border:0;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;padding:12px 18px;cursor:pointer;">Resubscribe</button>
        </form>`
      : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
    <title>The Grand Tournament Email Preferences</title>
  </head>
  <body style="margin:0;background:#07100e;color:#f2efe7;font-family:Arial,sans-serif;">
    <main style="max-width:620px;margin:0 auto;padding:48px 24px;line-height:1.55;">
      <h1 style="margin:0 0 16px;font-size:28px;">${escapeHtml(heading)}</h1>
      <p style="margin:0;color:#c6d3ce;">${escapeHtml(message)}</p>
      ${undoForm}
    </main>
  </body>
</html>`
}

function presenceRate(usageCount: number, visibleSquadCount: number) {
  return visibleSquadCount > 0 ? Math.round((usageCount / visibleSquadCount) * 10_000) / 100 : 0
}

function remapEffectiveSquad(
  squad: Awaited<ReturnType<SquadRepository['getLockedSquad']>>,
  roundSlots: Awaited<ReturnType<SquadRepository['listRoundLineupSlots']>>,
) {
  if (!squad || roundSlots.length === 0) {
    return squad
  }

  const maxRound = Math.max(...roundSlots.map((slot) => slot.roundKey))
  const playerBySlotKey = new Map(roundSlots.filter((slot) => slot.roundKey === maxRound).map((slot) => [slot.slotKey, slot.playerId]))
  const playerById = new Map(squad.slots.filter((slot) => slot.player).map((slot) => [slot.player!.playerId, slot.player!]))

  return {
    ...squad,
    slots: squad.slots.map((slot) => {
      const playerId = playerBySlotKey.get(slot.key)
      return playerId === undefined ? slot : { ...slot, player: playerById.get(playerId) ?? slot.player }
    }),
  }
}

function buildEmptyUsagePlayer(player: TeamPoolPlayer): Omit<PublicSquadUsagePlayer, 'usageCount' | 'starterCount' | 'subCount' | 'presenceRate' | 'managers'> {
  return {
    playerId: player.playerId,
    displayName: player.displayName,
    teamCode: player.teamCode,
    nationalityCode: player.nationalityCode,
    imageUrl: player.imageUrl,
    rating: player.rating,
    capCost: player.capCost,
    positionMain: player.positionMain,
    positions: player.positions,
    positionClasses: player.positionClasses,
  }
}

interface Dependencies {
  configRepository: ConfigRepository
  registrationRepository: RegistrationRepository
  fixtureRepository: FixtureRepository
  teamPoolRepository: TeamPoolRepository
  scoringRepository: ScoringRepository
  squadRepository: SquadRepository
  landingAnalyticsRepository: LandingAnalyticsRepository
}

export function createPublicRouter({
  configRepository,
  registrationRepository,
  fixtureRepository,
  teamPoolRepository,
  scoringRepository,
  squadRepository,
  landingAnalyticsRepository,
}: Dependencies) {
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
      budgetOptions,
      teams,
      fixtures: currentFixtures,
      // Frontend mirrors the backend cutoff so the closed-state UI shows at the same instant
      // the API starts refusing register/verify/squad-edit calls — and follows the same
      // REGISTRATION_CLOSE_AT env-override during testing.
      registrationCloseEpoch: registrationCloseEpoch(),
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
    const [entries, scoring] = await Promise.all([
      scoringRepository.listMatchEntries(),
      configRepository.getScoringConfig(),
      Promise.all(teamCodes.map(async (teamCode) => playersByTeam.set(teamCode, await teamPoolRepository.listByTeam(teamCode)))),
    ])
    const items = buildPublicFixtureResults(currentFixtures, playersByTeam, entries, scoring)

    res.json({
      items,
      summary: {
        totalFixtures: items.length,
        finalFixtures: items.filter((item) => item.status === 'final').length,
        pendingFixtures: items.filter((item) => item.status === 'pending').length,
      },
    })
  })

  router.get('/player-points', async (_req, res) => {
    const currentFixtures = await fixtureRepository.listFixtures()
    const teamCodes = [...new Set(currentFixtures.flatMap((fixture) => [fixture.homeTeamCode, fixture.awayTeamCode]))]
    const playersByTeam = new Map<string, Awaited<ReturnType<typeof teamPoolRepository.listByTeam>>>()
    const [entries, scoring] = await Promise.all([
      scoringRepository.listMatchEntries(),
      configRepository.getScoringConfig(),
      Promise.all(teamCodes.map(async (teamCode) => playersByTeam.set(teamCode, await teamPoolRepository.listByTeam(teamCode)))),
    ])
    const { items, summary } = buildPlayerPointsLeaderboard(playersByTeam, entries, scoring)
    res.json({ items, summary })
  })

  router.get('/squad-usage', async (_req, res) => {
    const [eventControls, participants] = await Promise.all([
      configRepository.getEventControls(),
      registrationRepository.listForAdmin(),
    ])
    const visibleParticipants = participants.filter(
      (participant) => participant.status === 'active' && (participant.revealSquad || eventControls.globalRevealSquads),
    )
    const usage = new Map<
      number,
      {
        player: ReturnType<typeof buildEmptyUsagePlayer>
        usageCount: number
        starterCount: number
        subCount: number
        managers: PublicSquadUsagePlayer['managers']
      }
    >()
    let visibleSquadCount = 0

    for (const participant of visibleParticipants) {
      const lockedSquad = await squadRepository.getLockedSquad(participant.participantId)
      const squad = remapEffectiveSquad(
        lockedSquad,
        lockedSquad ? await squadRepository.listRoundLineupSlots(participant.participantId) : [],
      )
      if (!squad) {
        continue
      }

      const selectedSlots = squad.slots.filter((slot) => slot.player)
      if (selectedSlots.length === 0) {
        continue
      }
      visibleSquadCount += 1

      for (const slot of selectedSlots) {
        const player = slot.player!
        const current = usage.get(player.playerId) ?? {
          player: buildEmptyUsagePlayer(player),
          usageCount: 0,
          starterCount: 0,
          subCount: 0,
          managers: [],
        }
        current.usageCount += 1
        if (slot.slotGroup === 'starter') {
          current.starterCount += 1
        } else {
          current.subCount += 1
        }
        current.managers.push({
          participantId: participant.participantId,
          displayName: participant.displayName,
          leagueType: participant.leagueType,
          profilePath: `/profiles/${publicProfileSlug(participant.displayName, participant.participantId)}`,
          slotKey: slot.key,
          slotGroup: slot.slotGroup,
          slotClass: slot.slotClass,
        })
        usage.set(player.playerId, current)
      }
    }

    const items: PublicSquadUsagePlayer[] = [...usage.values()]
      .map((entry) => ({
        ...entry.player,
        usageCount: entry.usageCount,
        starterCount: entry.starterCount,
        subCount: entry.subCount,
        presenceRate: presenceRate(entry.usageCount, visibleSquadCount),
        managers: entry.managers.sort((left, right) => left.displayName.localeCompare(right.displayName)),
      }))
      .sort(
        (left, right) =>
          right.usageCount - left.usageCount ||
          right.starterCount - left.starterCount ||
          right.rating - left.rating ||
          left.displayName.localeCompare(right.displayName),
      )

    res.json({
      summary: {
        visibleSquadCount,
        visibleManagerCount: visibleParticipants.length,
        totalSelections: items.reduce((sum, item) => sum + item.usageCount, 0),
        uniquePlayerCount: items.length,
        averageSelectionsPerPlayer: items.length
          ? Math.round((items.reduce((sum, item) => sum + item.usageCount, 0) / items.length) * 100) / 100
          : 0,
      },
      items,
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

  router.post('/landing-page-visit', async (req, res) => {
    const parsed = landingPageVisitSchema.parse(req.body)
    const signal = buildRequestRiskSignal(req)
    if (signal.ipHash) {
      await landingAnalyticsRepository.recordLandingPageVisit({
        ipHash: signal.ipHash,
        userAgentHash: signal.userAgentHash,
        landingPath: parsed.landingPath,
      })
    }

    res.status(204).end()
  })

  router.get('/email/unsubscribe', async (req, res) => {
    const token = String(req.query.token ?? '').trim()
    const unsubscribed = token ? await registrationRepository.unsubscribeMarketing(token) : false
    res.type('html').send(renderEmailPreferencesPage({ token, status: unsubscribed ? 'unsubscribed' : 'invalid' }))
  })

  router.post('/email/unsubscribe', async (req, res) => {
    const token = String(req.query.token ?? '').trim()
    const unsubscribed = token ? await registrationRepository.unsubscribeMarketing(token) : false
    return unsubscribed ? res.status(204).end() : res.status(404).json({ error: 'Unsubscribe link not found.' })
  })

  router.post('/email/resubscribe', async (req, res) => {
    const token = String(req.query.token ?? '').trim()
    const resubscribed = token ? await registrationRepository.resubscribeMarketing(token) : false
    res.type('html').status(resubscribed ? 200 : 404).send(
      renderEmailPreferencesPage({
        token,
        status: resubscribed ? 'resubscribed' : 'invalid',
      }),
    )
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

  router.get('/nation-participation', async (_req, res) => {
    const items = await registrationRepository.listNationParticipation()
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
    let squad = revealableSquad?.isLocked ? revealableSquad : undefined
    let swaps: Awaited<ReturnType<typeof squadRepository.listSwaps>> | undefined

    if (squad) {
      // Show the effective (post-swap) lineup, not the lock-time draft, so the displayed XI matches
      // the score (which already counts swaps). Remap each slot's player to the latest round snapshot.
      const roundSlots = await squadRepository.listRoundLineupSlots(participant.participantId)
      if (roundSlots.length > 0) {
        const maxRound = Math.max(...roundSlots.map((slot) => slot.roundKey))
        const playerBySlotKey = new Map(roundSlots.filter((slot) => slot.roundKey === maxRound).map((slot) => [slot.slotKey, slot.playerId]))
        const playerById = new Map(squad.slots.filter((slot) => slot.player).map((slot) => [slot.player!.playerId, slot.player!]))
        squad = {
          ...squad,
          slots: squad.slots.map((slot) => {
            const playerId = playerBySlotKey.get(slot.key)
            return playerId === undefined ? slot : { ...slot, player: playerById.get(playerId) ?? slot.player }
          }),
        }
      }
      swaps = await squadRepository.listSwaps(participant.participantId)
    }

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
        swaps,
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
