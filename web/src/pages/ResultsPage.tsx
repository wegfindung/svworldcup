import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { EmptyState } from '../components/EmptyState'
import { InfoTip } from '../components/InfoTip'
import { TeamFlag } from '../components/TeamFlag'
import { eventTeams } from '../data/eventConfig'
import { getMessages, type AppMessages } from '../i18n/messages'
import { ApiError, fetchMatchResults } from '../lib/api'
import type { LocaleCode, PublicFixturePlayerResult, PublicFixtureResult } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'
type ResultsCopy = AppMessages['results']
type FactorCopy = AppMessages['scoringCalculator']['components']
type ResultsTab = 'matches' | 'standings' | 'playoff'
type ErrorCopy = {
  title: string
  body: string
}

interface GroupStanding {
  teamCode: string
  groupKey: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

interface KnockoutTeam {
  teamCode: string
  groupKey: string
  rank: number
  standing: GroupStanding
}

interface PlayoffMatch {
  match: number
  home: KnockoutTeam | null
  away: KnockoutTeam | null
  awaySeedLabel?: string
}

function teamName(teamCode: string) {
  return eventTeams.find((team) => team.code === teamCode)?.nameEn ?? teamCode
}

const stageOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'R32', 'R16', 'QF', 'SF', '3P', 'FINAL']
const groupStageKeys = stageOrder.filter((stage) => /^[A-L]$/.test(stage))

const roundOf32Templates = [
  { match: 73, home: { rank: 2, group: 'A' }, away: { rank: 2, group: 'B' } },
  { match: 74, home: { rank: 1, group: 'E' }, thirdAway: ['A', 'B', 'C', 'D', 'F'] },
  { match: 75, home: { rank: 1, group: 'F' }, away: { rank: 2, group: 'C' } },
  { match: 76, home: { rank: 1, group: 'C' }, away: { rank: 2, group: 'F' } },
  { match: 77, home: { rank: 1, group: 'I' }, thirdAway: ['C', 'D', 'F', 'G', 'H'] },
  { match: 78, home: { rank: 2, group: 'E' }, away: { rank: 2, group: 'I' } },
  { match: 79, home: { rank: 1, group: 'A' }, thirdAway: ['C', 'E', 'F', 'H', 'I'] },
  { match: 80, home: { rank: 1, group: 'L' }, thirdAway: ['E', 'H', 'I', 'J', 'K'] },
  { match: 81, home: { rank: 1, group: 'D' }, thirdAway: ['B', 'E', 'F', 'I', 'J'] },
  { match: 82, home: { rank: 1, group: 'G' }, thirdAway: ['A', 'E', 'H', 'I', 'J'] },
  { match: 83, home: { rank: 2, group: 'K' }, away: { rank: 2, group: 'L' } },
  { match: 84, home: { rank: 1, group: 'H' }, away: { rank: 2, group: 'J' } },
  { match: 85, home: { rank: 1, group: 'B' }, thirdAway: ['E', 'F', 'G', 'I', 'J'] },
  { match: 86, home: { rank: 1, group: 'J' }, away: { rank: 2, group: 'H' } },
  { match: 87, home: { rank: 1, group: 'K' }, thirdAway: ['D', 'E', 'I', 'J', 'L'] },
  { match: 88, home: { rank: 2, group: 'D' }, away: { rank: 2, group: 'G' } },
] as const

function stageTitle(groupKey: string, copy: ResultsCopy) {
  if (/^[A-L]$/.test(groupKey)) return `${copy.group} ${groupKey}`
  if (groupKey === 'R32') return copy.stages.round32
  if (groupKey === 'R16') return copy.stages.round16
  if (groupKey === 'QF') return copy.stages.quarterFinals
  if (groupKey === 'SF') return copy.stages.semiFinals
  if (groupKey === '3P') return copy.stages.thirdPlace
  if (groupKey === 'FINAL') return copy.stages.final
  return groupKey
}

function stageEyebrow(groupKey: string, copy: ResultsCopy) {
  return /^[A-L]$/.test(groupKey) ? copy.groupStage : copy.knockoutStage
}

// Compact label for the jump-bar tabs: the bare letter for groups A–L, short codes for knockout rounds.
function stageTabLabel(groupKey: string) {
  if (/^[A-L]$/.test(groupKey)) return groupKey
  if (groupKey === 'FINAL') return 'Final'
  if (groupKey === '3P') return '3rd'
  return groupKey
}

function emptyStanding(teamCode: string, groupKey: string): GroupStanding {
  return {
    teamCode,
    groupKey,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }
}

function compareStandings(left: GroupStanding, right: GroupStanding) {
  return (
    right.points - left.points ||
    right.goalDifference - left.goalDifference ||
    right.goalsFor - left.goalsFor ||
    left.teamCode.localeCompare(right.teamCode)
  )
}

function applyStandingResult(standings: Map<string, GroupStanding>, result: PublicFixtureResult) {
  if (result.status !== 'final' || result.homeGoals === null || result.awayGoals === null) {
    return
  }
  const home = standings.get(result.homeTeamCode)
  const away = standings.get(result.awayTeamCode)
  if (!home || !away) {
    return
  }

  home.played += 1
  away.played += 1
  home.goalsFor += result.homeGoals
  home.goalsAgainst += result.awayGoals
  away.goalsFor += result.awayGoals
  away.goalsAgainst += result.homeGoals
  home.goalDifference = home.goalsFor - home.goalsAgainst
  away.goalDifference = away.goalsFor - away.goalsAgainst

  if (result.homeGoals > result.awayGoals) {
    home.wins += 1
    away.losses += 1
    home.points += 3
  } else if (result.awayGoals > result.homeGoals) {
    away.wins += 1
    home.losses += 1
    away.points += 3
  } else {
    home.draws += 1
    away.draws += 1
    home.points += 1
    away.points += 1
  }
}

function buildGroupStandings(results: PublicFixtureResult[]) {
  const standings = new Map<string, GroupStanding>()
  for (const team of eventTeams) {
    standings.set(team.code, emptyStanding(team.code, team.groupKey))
  }
  for (const result of results.filter((item) => /^[A-L]$/.test(item.groupKey))) {
    if (!standings.has(result.homeTeamCode)) {
      standings.set(result.homeTeamCode, emptyStanding(result.homeTeamCode, result.groupKey))
    }
    if (!standings.has(result.awayTeamCode)) {
      standings.set(result.awayTeamCode, emptyStanding(result.awayTeamCode, result.groupKey))
    }
    applyStandingResult(standings, result)
  }

  const byGroup = new Map<string, GroupStanding[]>()
  for (const standing of standings.values()) {
    const current = byGroup.get(standing.groupKey) ?? []
    current.push(standing)
    byGroup.set(standing.groupKey, current)
  }
  return groupStageKeys.map((groupKey) => [
    groupKey,
    [...(byGroup.get(groupKey) ?? [])].sort(compareStandings),
  ] as const)
}

function selectThirdPlaceTeam(availableThirds: KnockoutTeam[], allowedGroups: readonly string[]) {
  const selected = availableThirds.find((team) => allowedGroups.includes(team.groupKey)) ?? availableThirds[0] ?? null
  if (!selected) {
    return null
  }
  availableThirds.splice(availableThirds.indexOf(selected), 1)
  return selected
}

function buildPlayoffPicture(groupStandings: readonly (readonly [string, GroupStanding[]])[]) {
  const qualifierBySeed = new Map<string, KnockoutTeam>()
  const thirdPlaceTeams: KnockoutTeam[] = []

  for (const [groupKey, rows] of groupStandings) {
    rows.forEach((standing, index) => {
      const team: KnockoutTeam = { teamCode: standing.teamCode, groupKey, rank: index + 1, standing }
      if (index < 2) {
        qualifierBySeed.set(`${index + 1}${groupKey}`, team)
      } else if (index === 2) {
        thirdPlaceTeams.push(team)
      }
    })
  }

  const availableThirds = [...thirdPlaceTeams].sort((left, right) => compareStandings(left.standing, right.standing)).slice(0, 8)
  const matches: PlayoffMatch[] = roundOf32Templates.map((template) => {
    const home = qualifierBySeed.get(`${template.home.rank}${template.home.group}`) ?? null
    if ('away' in template) {
      return {
        match: template.match,
        home,
        away: qualifierBySeed.get(`${template.away.rank}${template.away.group}`) ?? null,
      }
    }
    return {
      match: template.match,
      home,
      away: selectThirdPlaceTeam(availableThirds, template.thirdAway),
      awaySeedLabel: `3rd ${template.thirdAway.join('/')}`,
    }
  })

  return {
    matches,
    qualified: [
      ...[...qualifierBySeed.values()].sort((left, right) => left.groupKey.localeCompare(right.groupKey) || left.rank - right.rank),
      ...thirdPlaceTeams.sort((left, right) => compareStandings(left.standing, right.standing)).slice(0, 8),
    ],
  }
}

// Fixtures are stored as UTC; render in the viewer's browser timezone + locale so a fan in
// Stockholm, São Paulo, or Sydney each sees the kickoff in their own wall-clock.
function formatKickoff(result: PublicFixtureResult, locale: LocaleCode) {
  const epoch = new Date(`${result.kickoffDate}T${result.kickoffTimeUtc}Z`).getTime()
  if (!Number.isFinite(epoch)) {
    return `${result.kickoffDate} · ${result.kickoffTimeUtc.slice(0, 5)} UTC`
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(epoch)
}

function formatPlayerList(players: PublicFixturePlayerResult[], stat: 'goals' | 'assists', copy: ResultsCopy) {
  const contributors = players.filter((player) => player[stat] > 0)
  if (!contributors.length) {
    return copy.none
  }
  return contributors
    .map((player) => `${player.displayName}${player[stat] > 1 ? ` (${player[stat]})` : ''}`)
    .join(', ')
}

const matchDetailPositionOrder = ['GK', 'RB', 'CB', 'LB', 'DML', 'DMC', 'DMR', 'LM', 'CM', 'RM', 'AM', 'AML', 'AMR', 'FL', 'FC', 'FR']
const matchDetailPositionRank = new Map(matchDetailPositionOrder.map((position, index) => [position, index]))
const matchDetailPositionAliases: Record<string, string> = {
  AMC: 'AM',
  DM: 'DMC',
  LWB: 'LB',
  RWB: 'RB',
  ST: 'FC',
}

function playerPositionRank(player: PublicFixturePlayerResult) {
  const positions = player.positionMain ? [player.positionMain] : player.positions
  let bestRank = matchDetailPositionOrder.length

  for (const position of positions) {
    const normalized = position.trim().toUpperCase()
    const canonical = matchDetailPositionAliases[normalized] ?? normalized
    const rank = matchDetailPositionRank.get(canonical)
    if (rank !== undefined && rank < bestRank) {
      bestRank = rank
    }
  }

  return bestRank
}

function sortMatchDetailPlayers(players: PublicFixturePlayerResult[]) {
  return [...players].sort((left, right) => {
    const leftLineupRank = left.lineupStatus === 'starter' ? 0 : 1
    const rightLineupRank = right.lineupStatus === 'starter' ? 0 : 1

    return (
      leftLineupRank - rightLineupRank ||
      playerPositionRank(left) - playerPositionRank(right) ||
      right.minutes - left.minutes ||
      (right.rating ?? 0) - (left.rating ?? 0) ||
      left.displayName.localeCompare(right.displayName)
    )
  })
}

// Goals in the displayed scoreline that no listed player accounts for — an own goal, or a scorer
// not in any national pool (their row is skipped at import). The scoreline comes from the official
// override (SOP "Official Scoreline Override"); the player goals are the credited ones. Never negative.
function uncreditedGoals(displayed: number | null, players: PublicFixturePlayerResult[]) {
  if (displayed == null) {
    return 0
  }
  const credited = players.reduce((sum, player) => sum + player.goals, 0)
  return Math.max(0, displayed - credited)
}

function formatPoints(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })
}

// A goalkeeper qualifies for exactly one slot class (GK), so their clean sheet is deterministic — there is
// no slot-class to disambiguate. For a single-class GK we fold the clean sheet into the displayed base
// figure (see SOP_scoring_and_leagues "Public Match Results Page"). Returns null for anyone who is not a
// single-class GK, leaving outfield rows to keep base and clean sheet separate. cleanSheetPoints is already
// 0 when the keeper conceded (the by-position entry encodes eligibility), so the fold is a no-op then.
function goalkeeperFold(player: PublicFixturePlayerResult) {
  const classes = player.cleanSheetByPosition
  if (classes.length !== 1 || classes[0].slotClass !== 'GK') {
    return null
  }
  const cleanSheetPoints = classes[0].points
  return { cleanSheetPoints, base: player.basePoints + cleanSheetPoints }
}

// Click-through player card for one match performance. Shows the squad-independent base points broken
// down by scoring factor, then a total per slot class the player qualifies for (the clean sheet is the
// only position-dependent component — see SOP_scoring_and_leagues "Public Match Results Page"). The
// budget multiplier, ownership boost, and reserve half-weight are per-manager, so the figures here are
// base points only, called out in the note.
function PlayerMatchCardModal({
  copy,
  factorCopy,
  player,
  onClose,
}: {
  copy: ResultsCopy
  factorCopy: FactorCopy
  player: PublicFixturePlayerResult
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const fold = goalkeeperFold(player)
  const factors: Array<[string, number]> = [
    [factorCopy.goals, player.goalPoints],
    [factorCopy.assists, player.assistPoints],
    [factorCopy.appearance, player.appearancePoints],
    [factorCopy.minutes, player.minutePoints],
    [factorCopy.performance, player.performancePoints],
  ]
  // For a keeper the clean sheet is folded into the base breakdown as one more factor (only when earned).
  if (fold && fold.cleanSheetPoints > 0) {
    factors.push([factorCopy.cleanSheet, fold.cleanSheetPoints])
  }
  const displayBase = fold ? fold.base : player.basePoints
  const nationName = teamName(player.teamCode)
  const positionsText = player.positions.length ? player.positions.join(' · ') : player.positionMain ?? ''
  // The "if placed in slot" section is for outfield players whose clean sheet varies by class; a keeper's
  // is already folded into the base figure above.
  const showByPosition = !fold && player.cleanSheetEligible && player.cleanSheetByPosition.length > 0
  const profileUrl = `https://play.soccerverse.com/player/${player.playerId}`

  const stats: Array<[string, string]> = [
    ['Min', `${player.minutes}'`],
    ['G', String(player.goals)],
    ['A', String(player.assists)],
    [copy.rating, player.rating !== undefined ? formatPoints(player.rating) : '–'],
  ]

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={player.displayName}
        onClick={(event) => event.stopPropagation()}
        className="glass-panel max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.25rem] p-6"
      >
        <div className="flex items-center gap-3.5">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[0.85rem] border border-white/10 bg-white/5">
            {player.imageUrl ? (
              <img src={player.imageUrl} alt={player.displayName} width={64} height={64} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm font-bold text-[var(--color-muted)]">
                {player.displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-white">{player.displayName}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <TeamFlag teamCode={player.teamCode} label={nationName} size="sm" />
              <span className="truncate text-xs text-[var(--color-muted)]">{nationName}</span>
            </div>
            {positionsText ? (
              <p className="mono mt-1.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                {copy.positionsLabel}: {positionsText}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-[0.7rem] border border-white/8 bg-black/25 px-2 py-2 text-center">
              <p className="mono text-[9px] uppercase tracking-wider text-[var(--color-muted)]">{label}</p>
              <p className="mono mt-1 text-sm font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        <p className="mono mt-5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.scoringFactors}</p>
        <div className="mt-2 grid gap-1.5">
          {factors.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-[var(--color-muted)]">{label}</span>
              <span className="mono text-white">{formatPoints(value)}</span>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-white/10 pt-2 text-sm">
            <span className="font-semibold text-white">{copy.basePointsLabel}</span>
            <span className="mono font-bold text-white">{formatPoints(displayBase)}</span>
          </div>
        </div>

        {showByPosition ? (
          <>
            <p className="mono mt-5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.totalIfPlacedAs}</p>
            <div className="mt-2 grid gap-1.5">
              {player.cleanSheetByPosition.map((position) => (
                <div
                  key={position.slotClass}
                  className="flex items-center justify-between gap-3 rounded-[0.7rem] border border-white/8 bg-black/25 px-3 py-2 text-sm"
                >
                  <span className="text-white">
                    <span className="font-bold">{position.slotClass}</span>{' '}
                    <span className="text-[11px] text-[var(--color-muted)]">
                      ({factorCopy.cleanSheet} +{formatPoints(position.points)})
                    </span>
                  </span>
                  <span className="mono font-bold text-[var(--color-accent)]">{formatPoints(player.basePoints + position.points)}</span>
                </div>
              ))}
            </div>
          </>
        ) : fold ? null : (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-[0.7rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 px-3 py-2.5 text-sm">
            <span className="font-semibold text-white">{copy.matchTotal}</span>
            <span className="mono text-lg font-bold text-[var(--color-accent)]">{formatPoints(player.basePoints)}</span>
          </div>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-muted)]">{copy.personalScoreNote}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            {copy.viewOnSoccerverse} ↗
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
          >
            {copy.close}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function PlayerDetailRow({ copy, factorCopy, player }: { copy: ResultsCopy; factorCopy: FactorCopy; player: PublicFixturePlayerResult }) {
  const [cardOpen, setCardOpen] = useState(false)
  const displayBase = goalkeeperFold(player)?.base ?? player.basePoints
  const ratingColor = player.rating !== undefined
    ? player.rating >= 7.0
      ? 'text-[var(--color-sand)] border-[var(--color-sand)]/20 bg-[var(--color-sand)]/5'
      : player.rating >= 6.0
        ? 'text-[var(--color-accent)] border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5'
        : 'text-[var(--color-paper)] border-white/10'
    : ''

  return (
    <div className="flex items-center justify-between gap-3 rounded-[0.85rem] border border-white/6 hover:border-white/12 transition duration-300 bg-black/20 px-3.5 py-2.5">
      <button
        type="button"
        onClick={() => setCardOpen(true)}
        className="flex min-w-0 items-center gap-3 text-left"
        aria-label={`${player.displayName} — ${copy.matchDetails}`}
      >
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5 relative">
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.displayName}
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-[10px] font-bold text-[var(--color-muted)]">
              {player.displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white hover:text-[var(--color-accent)] transition duration-300">{player.displayName}</p>
          <p className="mono mt-1 text-[10px] uppercase tracking-wider text-[var(--color-muted)] flex flex-wrap items-center gap-x-2">
            <span>{player.minutes}'</span>
            <span className="text-white/20">•</span>
            <span>ID {player.playerId}</span>
            {player.rating !== undefined && (
              <>
                <span className="text-white/20">•</span>
                <span className={`px-1.5 py-0.5 rounded border ${ratingColor} font-bold text-[9px] tracking-normal`}>
                  {copy.rating} {player.rating}
                </span>
              </>
            )}
          </p>
        </div>
      </button>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <div className="flex min-w-0 flex-wrap justify-end gap-1.5 text-[10px]">
          {player.goals > 0 && (
            <span className="inline-flex items-center gap-1 rounded-[0.5rem] border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-400">
              G {player.goals}
            </span>
          )}
          {player.assists > 0 && (
            <span className="inline-flex items-center gap-1 rounded-[0.5rem] border border-[var(--color-sand)]/25 bg-[var(--color-sand)]/10 px-2 py-1 text-[9px] font-bold text-[var(--color-sand)]">
              A {player.assists}
            </span>
          )}
          {player.earnsCleanSheet && (
            <span className="inline-flex items-center gap-1 rounded-[0.5rem] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-1 text-[9px] font-bold text-[var(--color-accent)]">
              CS
            </span>
          )}
        </div>
        <div
          className="shrink-0 whitespace-nowrap rounded-[0.5rem] border border-white/12 bg-white/5 px-2 py-1 text-right"
          title={copy.personalScoreNote}
        >
          <span className="mono text-[8px] uppercase tracking-wider text-[var(--color-muted)]">{copy.basePointsLabel}</span>
          <span className="mono ml-1.5 text-xs font-bold text-white">{formatPoints(displayBase)}</span>
        </div>
      </div>

      {cardOpen ? <PlayerMatchCardModal copy={copy} factorCopy={factorCopy} player={player} onClose={() => setCardOpen(false)} /> : null}
    </div>
  )
}

function TeamPlayerDetails({ copy, factorCopy, title, teamCode, players }: { copy: ResultsCopy; factorCopy: FactorCopy; title: string; teamCode: string; players: PublicFixturePlayerResult[] }) {
  const sortedPlayers = useMemo(() => sortMatchDetailPlayers(players), [players])

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center gap-2">
        <TeamFlag teamCode={teamCode} label={title} size="sm" />
        <p className="truncate text-sm font-bold text-white">{title}</p>
      </div>
      <div className="grid gap-1.5">
        {sortedPlayers.length ? (
          sortedPlayers.map((player) => <PlayerDetailRow key={player.playerId} copy={copy} factorCopy={factorCopy} player={player} />)
        ) : (
          <p className="rounded-[0.85rem] border border-white/6 bg-black/20 px-3.5 py-3 text-xs text-[var(--color-muted)]">
            {copy.noStats}
          </p>
        )}
      </div>
    </div>
  )
}

function StandingTeamCell({ standing }: { standing: GroupStanding }) {
  const name = teamName(standing.teamCode)
  return (
    <div className="flex min-w-0 items-center gap-2">
      <TeamFlag teamCode={standing.teamCode} label={name} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-white">{name}</p>
        <p className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-muted)]">{standing.teamCode}</p>
      </div>
    </div>
  )
}

function StandingsView({ copy, groupStandings }: { copy: ResultsCopy; groupStandings: readonly (readonly [string, GroupStanding[]])[] }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {groupStandings.map(([groupKey, standings]) => (
        <div key={groupKey} className="glass-panel rounded-[1.15rem] p-4">
          <div className="mb-4 flex items-end justify-between gap-4 border-b border-white/5 pb-3">
            <div>
              <p className="eyebrow text-[10px]">{copy.groupStage}</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">{copy.group} {groupKey}</h3>
            </div>
            <span className="mono rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-muted)]">
              {standings.filter((standing) => standing.played > 0).length}/{standings.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-xs">
              <thead className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                <tr className="border-b border-white/6">
                  <th className="px-2 py-2 font-semibold">{copy.standingsTable.team}</th>
                  <th className="px-2 py-2 text-center font-semibold">{copy.standingsTable.played}</th>
                  <th className="px-2 py-2 text-center font-semibold">{copy.standingsTable.wins}</th>
                  <th className="px-2 py-2 text-center font-semibold">{copy.standingsTable.draws}</th>
                  <th className="px-2 py-2 text-center font-semibold">{copy.standingsTable.losses}</th>
                  <th className="px-2 py-2 text-center font-semibold">{copy.standingsTable.goalDifference}</th>
                  <th className="px-2 py-2 text-center font-semibold">{copy.standingsTable.points}</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((standing, index) => (
                  <tr key={standing.teamCode} className="border-b border-white/5 last:border-0">
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={[
                          'mono grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold',
                          index < 2
                            ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                            : index === 2
                              ? 'border-[var(--color-sand)]/25 bg-[var(--color-sand)]/10 text-[var(--color-sand)]'
                              : 'border-white/10 text-[var(--color-muted)]',
                        ].join(' ')}>
                          {index + 1}
                        </span>
                        <StandingTeamCell standing={standing} />
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center text-[var(--color-paper)]">{standing.played}</td>
                    <td className="px-2 py-2.5 text-center text-[var(--color-paper)]">{standing.wins}</td>
                    <td className="px-2 py-2.5 text-center text-[var(--color-paper)]">{standing.draws}</td>
                    <td className="px-2 py-2.5 text-center text-[var(--color-paper)]">{standing.losses}</td>
                    <td className="px-2 py-2.5 text-center text-[var(--color-paper)]">{standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}</td>
                    <td className="px-2 py-2.5 text-center text-base font-black text-white">{standing.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  )
}

function PlayoffTeamSlot({ copy, team, seedLabel }: { copy: ResultsCopy; team: KnockoutTeam | null; seedLabel: string }) {
  if (!team) {
    return (
      <div className="rounded-[0.8rem] border border-dashed border-white/10 bg-black/20 px-3 py-2 text-xs text-[var(--color-muted)]">
        {seedLabel}
      </div>
    )
  }
  const name = teamName(team.teamCode)
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-[0.8rem] border border-white/8 bg-black/25 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <TeamFlag teamCode={team.teamCode} label={name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{name}</p>
          <p className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            {team.rank === 3 ? copy.playoff.thirdPlaceSeed : `${team.rank}${copy.playoff.seedSuffix}`} {copy.group} {team.groupKey}
          </p>
        </div>
      </div>
      <span className="mono shrink-0 text-xs font-black text-[var(--color-accent)]">{team.standing.points} {copy.standingsTable.points}</span>
    </div>
  )
}

function PlayoffView({ copy, playoff }: { copy: ResultsCopy; playoff: ReturnType<typeof buildPlayoffPicture> }) {
  return (
    <section className="space-y-4">
      <div className="glass-panel rounded-[1.15rem] p-4">
        <div className="mb-4 border-b border-white/5 pb-3">
          <p className="eyebrow text-[10px]">{copy.playoff.qualifiedEyebrow}</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">{copy.playoff.qualifiedTitle}</h3>
          <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.playoff.body}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {playoff.qualified.map((team) => (
            <div key={`${team.rank}-${team.teamCode}`} className="rounded-[0.85rem] border border-white/8 bg-black/20 px-3 py-2">
              <StandingTeamCell standing={team.standing} />
              <p className="mono mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                {team.rank === 3 ? copy.playoff.thirdPlaceSeed : `${team.rank}${copy.playoff.seedSuffix}`} {copy.group} {team.groupKey}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {playoff.matches.map((match) => (
          <article key={match.match} className="glass-panel rounded-[1.15rem] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="mono rounded-full border border-white/10 bg-white/4 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                {copy.playoff.matchLabel} {match.match}
              </p>
              <p className="text-xs font-semibold text-[var(--color-accent)]">{copy.stages.round32}</p>
            </div>
            <div className="grid gap-2">
              <PlayoffTeamSlot copy={copy} team={match.home} seedLabel={copy.playoff.pendingSeed} />
              <div className="mono text-center text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">vs</div>
              <PlayoffTeamSlot copy={copy} team={match.away} seedLabel={match.awaySeedLabel ?? copy.playoff.pendingSeed} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ResultCard({
  copy,
  factorCopy,
  locale,
  result,
  isOpen,
  onToggle,
}: {
  copy: ResultsCopy
  factorCopy: FactorCopy
  locale: LocaleCode
  result: PublicFixtureResult
  isOpen: boolean
  onToggle: () => void
}) {
  const isFinal = result.status === 'final'
  const homeWon = isFinal && (result.homeGoals ?? 0) > (result.awayGoals ?? 0)
  const awayWon = isFinal && (result.awayGoals ?? 0) > (result.homeGoals ?? 0)
  const homeName = teamName(result.homeTeamCode)
  const awayName = teamName(result.awayTeamCode)
  const homeUncredited = isFinal ? uncreditedGoals(result.homeGoals, result.homePlayers) : 0
  const awayUncredited = isFinal ? uncreditedGoals(result.awayGoals, result.awayPlayers) : 0

  return (
    <article className="border border-white/8 hover:border-[var(--color-accent)]/28 bg-gradient-to-br from-black/20 via-black/30 to-black/10 transition duration-300 rounded-[1rem] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] group hover:shadow-[0_12px_40px_-20px_rgba(34,189,147,0.15)]">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <span className="mono rounded-full border border-white/6 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
          {copy.group} {result.groupKey}
        </span>
        <span
          className={[
            'mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]',
            isFinal
              ? 'border-[var(--color-accent)]/24 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
              : 'border-white/10 text-[var(--color-muted)]',
          ].join(' ')}
        >
          {isFinal ? copy.final : copy.pending}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`relative transition duration-300 ${homeWon ? 'scale-105' : 'opacity-85'}`}>
            <TeamFlag teamCode={result.homeTeamCode} label={homeName} size="sm" />
            {homeWon && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent)]" />
            )}
          </div>
          <div className="min-w-0">
            <p className={['truncate text-sm font-semibold transition', homeWon ? 'text-white font-bold' : 'text-[var(--color-paper)]/85'].join(' ')}>
              {homeName}
            </p>
            <p className="mono mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{result.homeTeamCode}</p>
          </div>
        </div>

        <div className="min-w-[5.5rem] rounded-xl border border-white/8 bg-black/40 px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] group-hover:border-[var(--color-accent)]/25 transition duration-300">
          <p className="mono text-2xl font-black text-white tracking-tight leading-none">
            {isFinal ? `${result.homeGoals}-${result.awayGoals}` : 'vs'}
          </p>
          {isFinal && (
            <span className="mono text-[8px] uppercase tracking-wider text-[var(--color-accent)] mt-1.5 block">
              {copy.final}
            </span>
          )}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-3 text-right">
          <div className="min-w-0">
            <p className={['truncate text-sm font-semibold transition', awayWon ? 'text-white font-bold' : 'text-[var(--color-paper)]/85'].join(' ')}>
              {awayName}
            </p>
            <p className="mono mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{result.awayTeamCode}</p>
          </div>
          <div className={`relative transition duration-300 ${awayWon ? 'scale-105' : 'opacity-85'}`}>
            <TeamFlag teamCode={result.awayTeamCode} label={awayName} size="sm" />
            {awayWon && (
              <span className="absolute -top-1 -left-1 flex h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent)]" />
            )}
          </div>
        </div>
      </div>

      {isFinal ? (
        <div className="mt-3.5 grid gap-2 rounded-[0.8rem] border border-white/6 bg-black/30 p-3 text-[11px] text-[var(--color-muted)] leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="font-bold text-white shrink-0 mt-0.5">G {copy.scorers}</span>
            <div className="flex-1">
              <span className="text-[var(--color-accent)] font-semibold">{result.homeTeamCode}</span> {formatPlayerList(result.homePlayers, 'goals', copy)}
              <span className="mx-2 text-white/10">|</span>
              <span className="text-[var(--color-accent)] font-semibold">{result.awayTeamCode}</span> {formatPlayerList(result.awayPlayers, 'goals', copy)}
            </div>
          </div>
          <div className="flex items-start gap-2 border-t border-white/5 pt-2 mt-1">
            <span className="font-bold text-white shrink-0 mt-0.5">A {copy.assists}</span>
            <div className="flex-1">
              <span className="text-[var(--color-sand)] font-semibold">{result.homeTeamCode}</span> {formatPlayerList(result.homePlayers, 'assists', copy)}
              <span className="mx-2 text-white/10">|</span>
              <span className="text-[var(--color-sand)] font-semibold">{result.awayTeamCode}</span> {formatPlayerList(result.awayPlayers, 'assists', copy)}
            </div>
          </div>
          {homeUncredited > 0 || awayUncredited > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/5 pt-2 mt-1">
              {homeUncredited > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[var(--color-accent)] font-semibold">{result.homeTeamCode}</span>
                  <span>+{homeUncredited} {copy.uncreditedGoalNote}</span>
                  <InfoTip label={copy.uncreditedGoalAria} content={copy.uncreditedGoalHint} />
                </span>
              ) : null}
              {awayUncredited > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[var(--color-accent)] font-semibold">{result.awayTeamCode}</span>
                  <span>+{awayUncredited} {copy.uncreditedGoalNote}</span>
                  <InfoTip label={copy.uncreditedGoalAria} content={copy.uncreditedGoalHint} />
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[var(--color-muted)]">
        <span className="font-medium">{formatKickoff(result, locale)}</span>
        <div className="flex items-center gap-3">
          {isFinal ? <span className="mono">{result.entryCount} {copy.playerEntries}</span> : null}
          <button
            type="button"
            onClick={onToggle}
            className="rounded-full border border-white/10 bg-black/20 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] hover:bg-black/40 hover:-translate-y-[1px] active:scale-[0.98]"
          >
            {isOpen ? copy.hideDetails : copy.matchDetails}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="mt-4 grid gap-4 border-t border-white/8 pt-4 md:grid-cols-2">
          <TeamPlayerDetails copy={copy} factorCopy={factorCopy} title={homeName} teamCode={result.homeTeamCode} players={result.homePlayers} />
          <TeamPlayerDetails copy={copy} factorCopy={factorCopy} title={awayName} teamCode={result.awayTeamCode} players={result.awayPlayers} />
        </div>
      ) : null}
    </article>
  )
}

interface ResultsPageProps {
  locale: LocaleCode
}

export function ResultsPage({ locale }: ResultsPageProps) {
  const messages = getMessages(locale)
  const copy = messages.results
  const factorCopy = messages.scoringCalculator.components
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [results, setResults] = useState<PublicFixtureResult[]>([])
  const [error, setError] = useState<ErrorCopy | null>(null)
  const [openFixtureIds, setOpenFixtureIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<ResultsTab>('matches')
  const [activeGroup, setActiveGroup] = useState<string | null>(null)

  function jumpToGroup(groupKey: string) {
    setActiveGroup(groupKey)
    document.getElementById(`results-group-${groupKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function toggleFixtureDetails(fixtureId: string) {
    setOpenFixtureIds((current) => {
      const next = new Set(current)
      if (next.has(fixtureId)) {
        next.delete(fixtureId)
      } else {
        next.add(fixtureId)
      }
      return next
    })
  }

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetchMatchResults()
        if (active) {
          setResults(response.items)
          setLoadState('ready')
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof ApiError && loadError.status === 404
              ? { title: copy.unavailableTitle, body: copy.unavailableBody }
              : {
                title: copy.loadErrorTitle,
                body: copy.loadErrorBody,
              },
          )
          setLoadState('error')
        }
      }
    })()

    return () => {
      active = false
    }
  }, [copy.loadErrorBody, copy.loadErrorTitle, copy.unavailableBody, copy.unavailableTitle])

  const groupedResults = useMemo(() => {
    const groups = new Map<string, PublicFixtureResult[]>()
    for (const result of results) {
      const current = groups.get(result.groupKey) ?? []
      current.push(result)
      groups.set(result.groupKey, current)
    }
    return [...groups.entries()].sort(([left], [right]) => {
      const leftIndex = stageOrder.indexOf(left)
      const rightIndex = stageOrder.indexOf(right)
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex) || left.localeCompare(right)
    })
  }, [results])

  const groupStandings = useMemo(() => buildGroupStandings(results), [results])
  const playoff = useMemo(() => buildPlayoffPicture(groupStandings), [groupStandings])
  const finalCount = results.filter((result) => result.status === 'final').length
  const tabs: { key: ResultsTab; label: string }[] = [
    { key: 'matches', label: copy.tabs.matches },
    { key: 'standings', label: copy.tabs.standings },
    { key: 'playoff', label: copy.tabs.playoff },
  ]

  return (
    <div className="space-y-4 pb-10">
      <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
        <p className="eyebrow">{copy.heroEyebrow}</p>
        <div className="mt-5 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="section-title max-w-[12ch] bg-gradient-to-r from-white via-[var(--color-paper)] to-[var(--color-muted)] bg-clip-text text-transparent">{copy.heroTitle}</h2>
            <p className="mt-4 max-w-[66ch] text-base leading-relaxed text-[var(--color-muted)]">
              {copy.heroBody}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="countdown-glow-tile rounded-[1rem] px-5 py-3.5 text-center border border-white/6 hover:border-[var(--color-accent)]/20 transition duration-300 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.final}</p>
              <p className="mt-1.5 text-3xl font-black text-[var(--color-accent)] leading-none">{finalCount}</p>
            </div>
            <div className="countdown-glow-tile rounded-[1rem] px-5 py-3.5 text-center border border-white/6 hover:border-[var(--color-accent)]/20 transition duration-300 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.fixtures}</p>
              <p className="mt-1.5 text-3xl font-black text-white leading-none">{results.length}</p>
            </div>
          </div>
        </div>
      </section>

      {loadState === 'ready' && activeTab === 'matches' && groupedResults.length > 1 ? (
        <nav
          aria-label={copy.jumpTo}
          className="sticky top-3 z-30 rounded-[1rem] border border-white/10 bg-[rgba(7,16,14,0.92)] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_50px_-30px_rgba(0,0,0,0.92)] backdrop-blur-md"
        >
          <div className="flex items-center gap-2">
            <span className="mono shrink-0 px-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{copy.jumpTo}</span>
            <div className="flex flex-1 gap-1 overflow-x-auto">
              {groupedResults.map(([groupKey]) => {
                const isActive = (activeGroup ?? groupedResults[0][0]) === groupKey
                return (
                  <button
                    key={groupKey}
                    type="button"
                    onClick={() => jumpToGroup(groupKey)}
                    className={[
                      'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition',
                      isActive
                        ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                        : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white',
                    ].join(' ')}
                  >
                    {stageTabLabel(groupKey)}
                  </button>
                )
              })}
            </div>
          </div>
        </nav>
      ) : null}

      {loadState === 'loading' ? (
        <section className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-32 rounded-[1rem]" />
          ))}
        </section>
      ) : null}

      {loadState === 'error' ? (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title={error?.title ?? copy.loadErrorTitle} body={error?.body ?? copy.loadErrorBody} />
        </section>
      ) : null}

      {loadState === 'ready' ? (
        <>
          <section className="glass-panel rounded-[1.15rem] p-2">
            <div className="grid gap-2 sm:grid-cols-3">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'rounded-[0.85rem] border px-4 py-3 text-sm font-bold transition duration-300',
                    activeTab === tab.key
                      ? 'border-[var(--color-accent)]/35 bg-[var(--color-accent)]/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                      : 'border-transparent bg-transparent text-[var(--color-muted)] hover:border-white/10 hover:bg-white/4 hover:text-white',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {activeTab === 'matches' ? (
            <section className="grid gap-4 xl:grid-cols-2">
              {groupedResults.map(([groupKey, groupResults]) => (
                <div key={groupKey} id={`results-group-${groupKey}`} className="glass-panel scroll-mt-24 rounded-[1.15rem] p-4 transition duration-300 hover:border-white/12 hover:shadow-[0_12px_40px_-24px_rgba(0,0,0,0.85)]">
                  <div className="mb-4 flex items-end justify-between gap-4 border-b border-white/5 pb-3">
                    <div>
                      <p className="eyebrow text-[10px]">{stageEyebrow(groupKey, copy)}</p>
                      <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">{stageTitle(groupKey, copy)}</h3>
                    </div>
                    <span className="mono rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      {groupResults.filter((result) => result.status === 'final').length}/{groupResults.length} {copy.finalSuffix}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {groupResults.map((result) => (
                      <ResultCard
                        key={result.fixtureId}
                        copy={copy}
                        factorCopy={factorCopy}
                        locale={locale}
                        result={result}
                        isOpen={openFixtureIds.has(result.fixtureId)}
                        onToggle={() => toggleFixtureDetails(result.fixtureId)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {activeTab === 'standings' ? <StandingsView copy={copy} groupStandings={groupStandings} /> : null}
          {activeTab === 'playoff' ? <PlayoffView copy={copy} playoff={playoff} /> : null}
        </>
      ) : null}
    </div>
  )
}
