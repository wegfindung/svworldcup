import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerStatsModal } from '../components/PlayerStatsModal'
import { PlayerTooltip } from '../components/PlayerTooltip'
import { ScoringCalculator } from '../components/ScoringCalculator'
import { TeamFlag } from '../components/TeamFlag'
import { TournamentLeadersCard } from '../components/TournamentLeadersCard'
import { InfoModal } from '../components/InfoModal'
import { getMessages, type AppMessages } from '../i18n/messages'
import { budgetLimit as defaultBudgetLimit, budgetOptions as defaultBudgetOptions, defaultScoring, eventTeams } from '../data/eventConfig'
import { prizeLeagues, prizeTotalWithUnit } from '../data/prizePool'
import { useBootstrap } from '../hooks/useBootstrap'
import { fetchPlayerPoints, fetchSquadUsage, recordLandingPageVisit } from '../lib/api'
import { toPlayerSeed, type PlayerStatsSeed } from '../lib/playerStatsSeed'
import { withReferral } from '../lib/referral'
import { readParticipantReady } from '../lib/participantReady'
import type { FixtureSeed, LocaleCode, PlayerPointsPayload, PublicSquadUsagePayload, ScoringConfig, TeamSeed } from '../lib/types'

type HomeCopy = AppMessages['home']

const superstarPlayers = [
  { playerId: 133609, name: 'Pedri', nationCode: 'ESP', imageUrl: 'https://elrincondeldt.com/sv/photos/players_webp/133609.webp', rating: 86, position: 'MID' },
  { playerId: 278, name: 'Kylian Mbappé', nationCode: 'FRA', imageUrl: 'https://elrincondeldt.com/sv/photos/players_webp/278.webp', rating: 94, position: 'FWD' },
  { playerId: 762, name: 'Vinícius Paixão', nationCode: 'BRA', imageUrl: 'https://elrincondeldt.com/sv/photos/players_webp/762.webp', rating: 93, position: 'FWD' },
  { playerId: 9, name: 'Achraf Hakimi', nationCode: 'MAR', imageUrl: 'https://elrincondeldt.com/sv/photos/players_webp/9.webp', rating: 85, position: 'DEF' },
  { playerId: 927, name: 'Kang-In Lee', nationCode: 'KOR', imageUrl: 'https://elrincondeldt.com/sv/photos/players_webp/927.webp', rating: 81, position: 'MID' },
  { playerId: 129718, name: 'Jude Bellingham', nationCode: 'ENG', imageUrl: 'https://elrincondeldt.com/sv/photos/players_webp/129718.webp', rating: 91, position: 'MID' },
  { playerId: 162511, name: 'Senne Lammens', nationCode: 'BEL', imageUrl: 'https://elrincondeldt.com/sv/photos/players_webp/162511.webp', rating: 78, position: 'GK' },
] as const

const footballNations = [
  { code: 'ARG', label: 'Argentina' },
  { code: 'BRA', label: 'Brazil' },
  { code: 'GER', label: 'Germany' },
  { code: 'ENG', label: 'England' },
  { code: 'ESP', label: 'Spain' },
  { code: 'FRA', label: 'France' },
  { code: 'CRO', label: 'Croatia' },
  { code: 'NED', label: 'Netherlands' },
  { code: 'POR', label: 'Portugal' },
  { code: 'URU', label: 'Uruguay' },
] as const

const emptyFixtures: FixtureSeed[] = []

const squadShape = [
  { label: 'GK', value: '1' },
  { label: 'DEF', value: '4' },
  { label: 'MID', value: '3' },
  { label: 'FWD', value: '3' },
  { label: 'SUB', value: '4' },
] as const

const DEFAULT_COMPETITION_START_MS = Date.UTC(2026, 5, 11, 19, 0, 0)

const winnerBannerCopy = {
  en: {
    eyebrow: 'Final results',
    title: 'The winners are confirmed.',
    body: 'Explore all Veteran, Rookie, and Nations League rewards.',
    cta: 'View all winners',
  },
  de: {
    eyebrow: 'Finale Resultate',
    title: 'Die Gewinner stehen fest.',
    body: 'Entdecke alle Preise der Veteran, Rookie und Nations League.',
    cta: 'Alle Gewinner ansehen',
  },
} as const

function getCompetitionStartMs(fixtures: FixtureSeed[]) {
  const kickoffEpochs = fixtures
    .map((fixture) => getFixtureKickoffMs(fixture))
    .filter((epoch) => Number.isFinite(epoch))

  return kickoffEpochs.length ? Math.min(...kickoffEpochs) : DEFAULT_COMPETITION_START_MS
}

function getFixtureKickoffMs(fixture: FixtureSeed) {
  return new Date(`${fixture.kickoffDate}T${fixture.kickoffTimeUtc}Z`).getTime()
}

function getNextKickoffSlot(fixtures: FixtureSeed[], teams: TeamSeed[], now = new Date()) {
  const teamByCode = new Map(teams.map((team) => [team.code, team]))
  const scheduledMatches = fixtures
    .map((fixture) => ({
      ...fixture,
      homeName: teamByCode.get(fixture.homeTeamCode)?.nameEn ?? fixture.homeTeamCode,
      awayName: teamByCode.get(fixture.awayTeamCode)?.nameEn ?? fixture.awayTeamCode,
      kickoffMs: getFixtureKickoffMs(fixture),
    }))
    .filter((fixture) => Number.isFinite(fixture.kickoffMs))
    .sort((a, b) => a.kickoffMs - b.kickoffMs)
  const nextMatch = scheduledMatches.find((match) => match.kickoffMs >= now.getTime()) ?? scheduledMatches.at(-1)
  const nextMatches = nextMatch ? scheduledMatches.filter((match) => match.kickoffMs === nextMatch.kickoffMs) : []
  const kickoffDate = nextMatch ? new Date(nextMatch.kickoffMs) : null

  return {
    kickoffMs: nextMatch ? nextMatch.kickoffMs : null,
    day:
      kickoffDate?.toLocaleDateString('en-GB', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'Europe/London',
      }) ?? '',
    time:
      kickoffDate?.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/London',
      }) ?? '',
    matches: nextMatches,
  }
}

function formatCountdownParts(targetMs: number, nowMs: number) {
  const remainingSeconds = Math.max(0, Math.floor((targetMs - nowMs) / 1000))
  const days = Math.floor(remainingSeconds / 86_400)
  const hours = Math.floor((remainingSeconds % 86_400) / 3_600)
  const minutes = Math.floor((remainingSeconds % 3_600) / 60)
  const seconds = remainingSeconds % 60

  return { days, hours, minutes, seconds }
}

type NextMatchInfo = {
  homeTeamCode: string
  awayTeamCode: string
  homeName: string
  awayName: string
  groupKey: string
}

function NextMatchCountdownCard({ copy, locale, startMs, match }: { copy: HomeCopy['countdown']; locale: LocaleCode; startMs: number; match?: NextMatchInfo }) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const parts = formatCountdownParts(startMs, nowMs)
  const startDate = useMemo(
    () =>
      new Date(startMs).toLocaleString(locale, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/London',
        timeZoneName: 'short',
      }),
    [locale, startMs],
  )

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1_000)
    return () => window.clearInterval(interval)
  }, [])

  const isLive = nowMs >= startMs

  return (
    <div className="countdown-card border border-[var(--color-accent)]/25 hover:border-[var(--color-accent)]/45 transition duration-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-accent)]">{copy.eyebrow}</p>
          <p className="mt-2 text-base font-semibold text-white flex items-center gap-2">
            {copy.title}
            {isLive && (
              <span className="live-badge">
                <span className="live-pulse-dot" />
                LIVE
              </span>
            )}
          </p>
        </div>
        <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{startDate}</span>
      </div>
      {match ? (
        <div className="mt-4 flex items-center justify-center gap-2.5 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
          <TeamFlag teamCode={match.homeTeamCode} label={match.homeName} size="sm" />
          <span className="min-w-0 truncate text-sm font-semibold text-white">{match.homeName}</span>
          <span className="mono shrink-0 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">vs</span>
          <span className="min-w-0 truncate text-sm font-semibold text-white">{match.awayName}</span>
          <TeamFlag teamCode={match.awayTeamCode} label={match.awayName} size="sm" />
        </div>
      ) : null}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          [copy.days, parts.days],
          [copy.hours, parts.hours],
          [copy.minutes, parts.minutes],
          [copy.seconds, parts.seconds],
        ].map(([label, value]) => (
          <div key={label} className="countdown-glow-tile rounded-xl flex flex-col items-center justify-center p-3">
            <strong className="mono text-2xl lg:text-3xl font-extrabold text-white leading-none tracking-tight">
              {String(value).padStart(2, '0')}
            </strong>
            <span className="mono mt-2 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeroPlayerWall({ label }: { label: string }) {
  return (
    <div className="hero-player-wall grid grid-cols-3 gap-2" aria-label={label}>
      {superstarPlayers.slice(0, 6).map((player, index) => (
        <PlayerTooltip
          key={player.playerId}
          as="div"
          className="trading-card floaty"
          style={{ 
            ['--tile-delay' as string]: `${index * 60}ms`,
            animationDelay: `${index * 120}ms`
          }}
          info={{ name: player.name, nationCode: player.nationCode, imageUrl: player.imageUrl }}
        >
          <div className="trading-card-portrait aspect-square relative">
            <div className="trading-card-badge">
              <span className="trading-card-rating">{player.rating}</span>
              <span className="trading-card-position">{player.position}</span>
            </div>
            
            <span className="trading-card-flag">
              <img
                src={`/team-flags/${player.nationCode}.svg`}
                alt={player.nationCode}
                width={18}
                height={18}
                className="h-4.5 w-4.5 rounded-full object-cover"
              />
            </span>
            
            <PlayerPortrait
              src={player.imageUrl}
              alt={player.name}
              width={120}
              height={120}
              className="h-full w-full object-cover"
            />
          </div>
          
          <div className="trading-card-info">
            <p className="trading-card-name">{player.name}</p>
            <p className="trading-card-sub">ID: {player.playerId}</p>
          </div>
        </PlayerTooltip>
      ))}
    </div>
  )
}

function SquadBlueprint({ copy }: { copy: HomeCopy['squadBlueprint'] }) {
  return (
    <div className="squad-blueprint border border-white/8 backdrop-blur-md transition duration-300 hover:border-[var(--color-accent)]/30">
      <div className="flex items-center justify-between gap-3">
        <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.eyebrow}</p>
        <span className="rounded-full border border-[var(--color-accent)]/28 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)] shadow-[0_0_12px_rgba(34,189,147,0.12)]">
          {copy.badge}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {squadShape.map((slot) => (
          <div key={slot.label} className="squad-slot border border-white/6 hover:border-[var(--color-accent)]/40 hover:bg-black/40 hover:-translate-y-[2px] transition duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <span>{slot.label}</span>
            <strong>{slot.value}</strong>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">{copy.body}</p>
    </div>
  )
}

function formatSpotlightPoints(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

type SpotlightRow = { playerId: number; name: string; imageUrl?: string; value: string; unit: string; seed: PlayerStatsSeed }

function SpotlightTeamCard({ name, teamCode, tag, rows, emptyLabel, onSelectPlayer }: { name: string; teamCode: string; tag: string; rows: SpotlightRow[]; emptyLabel: string; onSelectPlayer: (seed: PlayerStatsSeed) => void }) {
  return (
    <div className="rounded-[1rem] border border-white/8 bg-black/18 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <TeamFlag teamCode={teamCode} label={name} size="sm" />
          <p className="truncate text-sm font-bold text-white">{name}</p>
        </div>
        <span className="mono shrink-0 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
          {tag}
        </span>
      </div>
      {rows.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {rows.map((row, index) => (
            <li key={row.playerId} className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onSelectPlayer(row.seed)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <span className="mono w-4 shrink-0 text-[11px] text-[var(--color-muted)]">{index + 1}</span>
                <PlayerPortrait
                  src={row.imageUrl ?? '/placeholders/player.svg'}
                  alt={row.name}
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 rounded-lg border border-white/10 object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white transition hover:text-[var(--color-accent)]">{row.name}</span>
              </button>
              <span className="mono shrink-0 text-xs font-bold text-[var(--color-accent)]">
                {row.value}
                <span className="ml-1 text-[9px] font-normal text-[var(--color-muted)]">{row.unit}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">{emptyLabel}</p>
      )}
    </div>
  )
}

// Replaces the old next-game card: a small info card spotlighting the next match's two nations. Each nation
// always shows its top 5 picks from revealed squads (/squad-usage); below that, a top-5 points card per
// nation appears once that team has recorded games (/player-points). Both feeds are public, cached, and
// fetched non-blocking, so the landing renders immediately and the card fills in.
function NextMatchSpotlightCard({
  copy,
  match,
  referrerSoccerverseUsername,
  locale,
}: {
  copy: HomeCopy['spotlight']
  match?: NextMatchInfo
  referrerSoccerverseUsername: string
  locale: LocaleCode
}) {
  const [usage, setUsage] = useState<PublicSquadUsagePayload | null>(null)
  const [points, setPoints] = useState<PlayerPointsPayload | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [modalSeed, setModalSeed] = useState<PlayerStatsSeed | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([fetchSquadUsage().catch(() => null), fetchPlayerPoints().catch(() => null)]).then(([usageData, pointsData]) => {
      if (active) {
        setUsage(usageData)
        setPoints(pointsData)
        setLoaded(true)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const columns = match
    ? [
        { teamCode: match.homeTeamCode, name: match.homeName },
        { teamCode: match.awayTeamCode, name: match.awayName },
      ]
    : []

  function pickRows(teamCode: string): SpotlightRow[] {
    return (usage?.items ?? [])
      .filter((player) => player.teamCode === teamCode)
      .sort((left, right) => right.usageCount - left.usageCount || right.starterCount - left.starterCount || left.displayName.localeCompare(right.displayName))
      .slice(0, 5)
      .map((player) => ({ playerId: player.playerId, name: player.displayName, imageUrl: player.imageUrl, value: String(player.usageCount), unit: copy.picksUnit, seed: toPlayerSeed(player) }))
  }

  function pointRows(teamCode: string): SpotlightRow[] {
    return (points?.items ?? [])
      .filter((player) => player.teamCode === teamCode)
      .sort((left, right) => right.basePoints - left.basePoints || left.displayName.localeCompare(right.displayName))
      .slice(0, 5)
      .map((player) => ({ playerId: player.playerId, name: player.displayName, imageUrl: player.imageUrl, value: formatSpotlightPoints(player.basePoints), unit: copy.pointsUnit, seed: toPlayerSeed(player) }))
  }

  // A nation's points card only appears once that team has match entries.
  const pointColumns = columns
    .map((column) => ({ ...column, rows: pointRows(column.teamCode) }))
    .filter((column) => column.rows.length > 0)

  return (
    <div className="glass-panel rounded-[1.25rem] p-4 sm:p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">{copy.title}</h3>
        </div>
        <Link
          to={withReferral('/stats', referrerSoccerverseUsername)}
          className="mono shrink-0 text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)] underline-offset-4 hover:underline"
        >
          {copy.cta} →
        </Link>
      </div>

      {!loaded ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="skeleton h-44 rounded-[1rem]" />
          ))}
        </div>
      ) : columns.length === 0 ? (
        <div className="surface-row mt-5 rounded-[0.95rem] p-3 text-sm leading-relaxed text-[var(--color-muted)]">{copy.empty}</div>
      ) : (
        <div className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {columns.map((column) => (
              <SpotlightTeamCard
                key={`picks-${column.teamCode}`}
                name={column.name}
                teamCode={column.teamCode}
                tag={copy.picksTag}
                rows={pickRows(column.teamCode)}
                emptyLabel={copy.empty}
                onSelectPlayer={setModalSeed}
              />
            ))}
          </div>
          {pointColumns.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {pointColumns.map((column) => (
                <SpotlightTeamCard
                  key={`points-${column.teamCode}`}
                  name={column.name}
                  teamCode={column.teamCode}
                  tag={copy.pointsTag}
                  rows={column.rows}
                  emptyLabel={copy.empty}
                  onSelectPlayer={setModalSeed}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {modalSeed ? <PlayerStatsModal seed={modalSeed} locale={locale} onClose={() => setModalSeed(null)} /> : null}
    </div>
  )
}

function NationFlagsCard({ copy }: { copy: HomeCopy['nations'] }) {
  return (
    <div className="glass-panel rounded-[1.15rem] p-3.5">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.eyebrow}</p>
      <div className="mt-4 grid grid-cols-5 justify-items-center gap-x-2 gap-y-3 sm:gap-x-3">
        {footballNations.map((nation) => (
          <div key={nation.code} className="group flex items-center justify-center">
            <span
              title={nation.label}
              aria-label={nation.label}
              className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/12 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition duration-300 ease-out group-hover:-translate-y-[1px] sm:h-11 sm:w-11"
            >
              <img
                src={`/team-flags/${nation.code}.svg`}
                alt={nation.label}
                width={40}
                height={40}
                loading="lazy"
                className="h-8 w-8 rounded-full object-cover sm:h-9 sm:w-9"
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RankingTracksCard({ copy }: { copy: HomeCopy['rankingTracks'] }) {
  const cardClasses = [
    'border border-emerald-500/15 hover:border-emerald-500/35 shadow-[0_0_15px_rgba(16,185,129,0.02)] hover:shadow-[0_0_20px_rgba(16,185,129,0.08)] bg-gradient-to-r from-emerald-950/20 to-transparent',
    'border border-[var(--color-sand)]/15 hover:border-[var(--color-sand)]/35 shadow-[0_0_15px_rgba(217,173,93,0.02)] hover:shadow-[0_0_20px_rgba(217,173,93,0.08)] bg-gradient-to-r from-amber-950/20 to-transparent',
    'border border-blue-500/15 hover:border-blue-500/35 shadow-[0_0_15px_rgba(59,130,246,0.02)] hover:shadow-[0_0_20px_rgba(59,130,246,0.08)] bg-gradient-to-r from-blue-950/20 to-transparent',
  ]
  
  const labelBadges = [
    'rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase bg-emerald-500/12 text-emerald-400 border border-emerald-500/25',
    'rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase bg-[var(--color-sand)]/12 text-[var(--color-sand)] border border-[var(--color-sand)]/25',
    'rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase bg-blue-500/12 text-blue-400 border border-blue-500/25',
  ]

  return (
    <div className="glass-panel rounded-[1.15rem] p-4 transition duration-300 hover:border-white/14">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.eyebrow}</p>
      <div className="mt-4 space-y-2.5">
        {copy.items.map(({ title, body }, index) => (
          <div key={title} className={`rounded-[0.95rem] p-3.5 transition duration-300 hover:-translate-y-[1px] ${cardClasses[index] || 'surface-row'}`}>
            <div className="flex items-start gap-3">
              <span className="mono text-xs font-bold text-[var(--color-muted)] mt-0.5">0{index + 1}</span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white text-sm sm:text-base">{title}</p>
                  <span className={labelBadges[index] || 'text-[10px]'}>{title}</span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--color-muted)]">{body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
      <path d="M19.7 5.03a16.4 16.4 0 0 0-4.09-1.27 11.4 11.4 0 0 0-.52 1.08 15.2 15.2 0 0 0-6.17 0 11.5 11.5 0 0 0-.52-1.08A16.48 16.48 0 0 0 4.3 5.03C1.71 8.9 1.01 12.67 1.36 16.39a16.54 16.54 0 0 0 5.03 2.56c.41-.56.78-1.16 1.1-1.79-.6-.23-1.18-.5-1.72-.81.14-.1.27-.2.4-.31 3.32 1.56 6.92 1.56 10.2 0 .13.11.26.21.4.31-.55.32-1.13.59-1.73.81.32.63.69 1.23 1.11 1.79a16.44 16.44 0 0 0 5.03-2.56c.42-4.31-.72-8.04-2.49-11.36Zm-8.31 9.06c-.98 0-1.79-.91-1.79-2.02 0-1.12.79-2.02 1.79-2.02 1 0 1.8.91 1.79 2.02 0 1.12-.79 2.02-1.79 2.02Zm6.22 0c-.98 0-1.79-.91-1.79-2.02 0-1.12.79-2.02 1.79-2.02 1 0 1.8.91 1.79 2.02 0 1.12-.79 2.02-1.79 2.02Z" />
    </svg>
  )
}

function DiscordCard({ copy }: { copy: HomeCopy['discord'] }) {
  return (
    <div className="glass-panel rounded-[1.15rem] bg-[linear-gradient(135deg,rgba(24,180,133,0.2),rgba(255,255,255,0.04))] p-4">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.eyebrow}</p>
      <div className="mt-4 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/12 bg-black/20 text-[var(--color-paper)]">
          <DiscordIcon />
        </div>
        <div>
          <p className="text-base font-semibold text-white">{copy.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{copy.body}</p>
        </div>
      </div>
      <a
        href="https://discord.com/invite/ze5xJgg7AM"
        target="_blank"
        rel="noreferrer"
        className="premium-button mt-5 gap-2 px-4 py-2.5 text-sm font-semibold"
      >
        <DiscordIcon />
        {copy.cta}
      </a>
    </div>
  )
}

function LandingProofCard({ copy, scoring }: { copy: HomeCopy['proof']; scoring: ScoringConfig }) {
  return (
    <div className="glass-panel rounded-[1.15rem] p-4">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.eyebrow}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {[
          [copy.goal, `+${scoring.goal}`],
          [copy.assist, `+${scoring.assist}`],
          [copy.cleanSheet, `GK +${scoring.cleanSheet.GK}`],
        ].map(([label, value]) => (
          <div key={label} className="surface-row rounded-[0.85rem] p-3">
            <p className="text-sm text-[var(--color-muted)]">{label}</p>
            <p className="mono mt-2 text-xl text-white">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Newcomer onboarding: the landing is where someone first meets the word "Soccerverse". Reuses the
// boost panel's translated explainer copy + InfoModal so a visitor can learn what Soccerverse is (and
// that they do not need it to take part) without leaving the page. See SOP_scoring_and_leagues.md
// "What is Soccerverse? explainer".
function SoccerverseExplainerCard({ copy }: { copy: AppMessages['builder']['boost'] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-panel block w-full rounded-[1.15rem] p-4 text-left transition hover:border-[var(--color-accent)]/30"
      >
        <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-accent)]">{copy.aboutTitle}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[var(--color-muted)]">{copy.aboutBody1}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)]">
          {copy.aboutTitle} →
        </span>
      </button>
      <InfoModal open={open} title={copy.aboutTitle} closeLabel={copy.aboutClose} onClose={() => setOpen(false)}>
        <p>{copy.aboutBody1}</p>
        <p>{copy.aboutBody2}</p>
        <p>{copy.aboutBody3}</p>
        <p>{copy.aboutBody4}</p>
      </InfoModal>
    </>
  )
}

function LandingPrizeSection({
  copy,
  referrerSoccerverseUsername,
}: {
  copy: AppMessages['prizes']
  referrerSoccerverseUsername: string
}) {
  return (
    <section className="glass-panel rounded-[1.25rem] p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">{copy.title}</h2>
          <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[var(--color-muted)]">
            {copy.freeNote} {copy.vouchersNote}
          </p>
        </div>
        <div className="text-right">
          <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.totalLabel}</p>
          <p className="mono text-3xl font-extrabold tracking-tight text-[var(--color-sand)]">{prizeTotalWithUnit}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {prizeLeagues.map((league) => (
          <div key={league.key} className="surface-row rounded-[0.95rem] border border-white/6 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-white">{league.name}</p>
              <span className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                {league.sharePercent}% {copy.shareSuffix}
              </span>
            </div>
            <p className="mono mt-1 text-xl font-bold text-[var(--color-sand)]">{league.total}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {league.places.map((place) => (
                <li key={place.place} className="flex items-baseline justify-between gap-3">
                  <span className="text-[var(--color-muted)]">{place.place}</span>
                  <span className="font-semibold text-white">
                    {place.amount}
                    {place.note ? <span className="ml-1 text-xs text-[var(--color-sand)]">{place.note}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            {league.key === 'nations' ? (
              <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">{copy.nationsSplitNote}</p>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">{copy.activation}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link to={withReferral('/register', referrerSoccerverseUsername)} className="premium-button px-6 py-3 text-sm font-semibold">
          {copy.registerCta}
        </Link>
        <Link
          to={withReferral('/prizes', referrerSoccerverseUsername)}
          className="inline-flex items-center rounded-full border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-[2px] hover:bg-white/7 active:scale-[0.98]"
        >
          {copy.landingCta}
        </Link>
      </div>
    </section>
  )
}

interface HomePageProps {
  locale: LocaleCode
  referrerSoccerverseUsername?: string
}

export function HomePage({ locale, referrerSoccerverseUsername = '' }: HomePageProps) {
  const location = useLocation()
  const { data: bootstrap } = useBootstrap()
  const copy = getMessages(locale)
  const homeCopy = copy.home
  // SSR-safe (null when no window). "Start building" goes to the builder, which only opens for a
  // logged-in participant — so a guest is shown the register/how-to-play path instead of that wall.
  const returningParticipant = readParticipantReady()
  const scoring = bootstrap?.scoring ?? defaultScoring
  const budgetLimit = bootstrap?.budgetLimit ?? defaultBudgetLimit
  const budgetOptions = bootstrap?.budgetOptions ?? defaultBudgetOptions
  const minBudget = budgetOptions[0]?.budgetLimit ?? budgetLimit
  const maxBudget = budgetOptions[budgetOptions.length - 1]?.budgetLimit ?? budgetLimit
  const teams = bootstrap?.teams ?? eventTeams
  const fixtures = bootstrap?.fixtures ?? emptyFixtures
  const fixtureCount = bootstrap?.fixtures.length ?? 104
  const competitionStartMs = useMemo(() => getCompetitionStartMs(fixtures), [fixtures])
  const nextSlot = useMemo(() => getNextKickoffSlot(fixtures, teams), [fixtures, teams])
  const winnersCopy = locale === 'de' ? winnerBannerCopy.de : winnerBannerCopy.en

  useEffect(() => {
    const landingPath = `${location.pathname}${location.search}`
    const storageKey = `svworldcup-landing-visit:${landingPath}`
    if (window.sessionStorage.getItem(storageKey)) {
      return
    }
    window.sessionStorage.setItem(storageKey, '1')
    void recordLandingPageVisit(landingPath).catch(() => undefined)
  }, [location.pathname, location.search])

  return (
    <div className="space-y-4 pb-10">
      <Link
        to={withReferral('/winners', referrerSoccerverseUsername)}
        className="group grid gap-3 rounded-[1.1rem] border border-[var(--color-sand)]/25 bg-[linear-gradient(105deg,rgba(227,177,71,0.16),rgba(16,190,151,0.08)_55%,rgba(255,255,255,0.025))] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 hover:-translate-y-[1px] hover:border-[var(--color-sand)]/45 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-5"
      >
        <span className="mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-sand)]">{winnersCopy.eyebrow}</span>
        <span>
          <span className="block text-base font-semibold text-white">{winnersCopy.title}</span>
          <span className="mt-0.5 block text-sm text-[var(--color-muted)]">{winnersCopy.body}</span>
        </span>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-accent)]">
          {winnersCopy.cta}
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none">
            <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </Link>
      <section className="landing-hero">
        <div className="landing-main-stack">
          <div className="hero-card rounded-[1.35rem] p-4 sm:p-6 lg:p-7">
            <div className="hero-composition">
              <div className="hero-copy">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="eyebrow">{homeCopy.hero.eyebrow}</p>
                  <span className="mono rounded-full border border-[var(--color-sand)]/20 bg-[var(--color-sand)]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--color-sand)]">
                    {homeCopy.hero.badge}
                  </span>
                </div>
                <p className="mt-7 mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  {homeCopy.hero.kicker}
                </p>
                <h2 className="section-title hero-title mt-3">
                  {homeCopy.hero.titleLines.map((line, index) => {
                    const colors = ['text-white', 'text-[var(--color-accent)]', 'text-[var(--color-sand)]']
                    return (
                      <span key={line} className={colors[index] || 'text-white'}>
                        {line}
                        <br />
                      </span>
                    )
                  })}
                </h2>
                <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-[var(--color-paper)] sm:text-[1.05rem]">{homeCopy.hero.lede}</p>
                <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-[var(--color-muted)]">{homeCopy.hero.body}</p>
                <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-3.5 py-1.5 text-xs font-semibold text-[var(--color-accent)]">
                  <span aria-hidden>✓</span>
                  {homeCopy.hero.freeNote}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    to={withReferral('/register', referrerSoccerverseUsername)}
                    className="premium-button px-6 py-3 text-sm font-semibold sm:px-7"
                  >
                    {homeCopy.hero.primaryCta}
                  </Link>
                  {returningParticipant ? (
                    <Link
                      to={withReferral('/builder', referrerSoccerverseUsername)}
                      className="inline-flex items-center rounded-full border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-[2px] hover:bg-white/7 active:scale-[0.98]"
                    >
                      {homeCopy.hero.secondaryCta}
                    </Link>
                  ) : null}
                </div>
                <p className="mt-4 text-sm text-[var(--color-muted)]">
                  {homeCopy.hero.newHereLabel}{' '}
                  <Link
                    to={withReferral('/how-to-play', referrerSoccerverseUsername)}
                    className="font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline"
                  >
                    {homeCopy.hero.howToCta} →
                  </Link>
                </p>
              </div>

              <div className="hero-stage">
                <HeroPlayerWall label={homeCopy.hero.playerWallLabel} />
                <SquadBlueprint copy={homeCopy.squadBlueprint} />
              </div>
            </div>

            <div className="hero-mechanics">
              {homeCopy.mechanics.map((item) => (
                <article key={item.step} className="hero-mechanic">
                  <span>{item.step}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <LandingProofCard copy={homeCopy.proof} scoring={scoring} />
        </div>

        <div className="landing-side-stack">
          <NextMatchCountdownCard copy={homeCopy.countdown} locale={locale} startMs={nextSlot.kickoffMs ?? competitionStartMs} match={nextSlot.matches[0]} />
          <div className="data-strip">
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{homeCopy.dataStrip.teams}</p>
              <p className="mono mt-2 text-2xl text-white">{teams.length}</p>
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{homeCopy.dataStrip.squad}</p>
              <p className="mono mt-2 text-2xl text-white">15</p>
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{homeCopy.dataStrip.matches}</p>
              <p className="mono mt-2 text-2xl text-white">{fixtureCount}</p>
            </div>
          </div>
          <SoccerverseExplainerCard copy={copy.builder.boost} />
          <RankingTracksCard copy={homeCopy.rankingTracks} />
          <NationFlagsCard copy={homeCopy.nations} />
          <DiscordCard copy={homeCopy.discord} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel rounded-[1.25rem] p-4 sm:p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{homeCopy.rules.eyebrow}</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">{homeCopy.rules.title}</h3>
              <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-[var(--color-muted)]">{homeCopy.rules.body}</p>
            </div>
          </div>

          <div className="mt-5 max-h-[27rem] space-y-3 overflow-y-auto pr-2">
            <div className="surface-row rounded-[0.95rem] p-4 border border-white/6 hover:border-[var(--color-accent)]/20 transition duration-300">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{homeCopy.rules.eligibilityTitle}</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--color-paper)]">
                {homeCopy.rules.eligibility.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[var(--color-accent)] font-bold shrink-0 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="surface-row rounded-[0.95rem] p-4 border border-white/6 hover:border-[var(--color-accent)]/20 transition duration-300">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{homeCopy.rules.budgetTitle}</p>
              <p className="mt-4 text-2xl font-bold tracking-tight text-[var(--color-sand)]">
                {minBudget.toLocaleString('en-US')} - {maxBudget.toLocaleString('en-US')} SVC
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{homeCopy.rules.budgetBody}</p>
            </div>

            <div className="surface-row rounded-[0.95rem] p-4 border border-white/6 hover:border-[var(--color-accent)]/20 transition duration-300">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{homeCopy.rules.pointsTitle}</p>
              <div className="mt-4 border border-white/6 rounded-lg overflow-hidden bg-black/20">
                <div className="rules-list-row">
                  <span className="points-visual-badge">+{scoring.goal}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{homeCopy.rules.goal}</p>
                  </div>
                </div>
                
                <div className="rules-list-row">
                  <span className="points-visual-badge">+{scoring.assist}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{homeCopy.rules.assist}</p>
                  </div>
                </div>

                <div className="rules-list-row">
                  <span className="points-visual-badge">+{scoring.appearance}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{homeCopy.rules.appearance}</p>
                  </div>
                </div>

                <div className="rules-list-row">
                  <span className="points-visual-badge">+{scoring.minutes}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{homeCopy.rules.minutes}</p>
                  </div>
                </div>

                <div className="rules-list-row flex-col sm:flex-row sm:items-center">
                  <span className="points-visual-badge">CS</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{homeCopy.rules.cleanSheet}</p>
                    <p className="mono text-[10px] text-[var(--color-muted)] mt-1">
                      GK {scoring.cleanSheet.GK} · DEF {scoring.cleanSheet.DEF} · MID {scoring.cleanSheet.MID}* · FWD {scoring.cleanSheet.FWD}
                    </p>
                    <p className="text-[9px] text-[var(--color-muted)]/80 mt-0.5">{homeCopy.rules.cleanSheetMidNote}</p>
                  </div>
                </div>

                <div className="rules-list-row">
                  <span className="points-visual-badge">Perf</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{homeCopy.rules.performance}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-1">
                      {homeCopy.rules.performanceMaxPrefix} {scoring.performanceCurve[scoring.performanceCurve.length - 1]?.points ?? 0} {homeCopy.rules.performanceMaxSuffix}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">{homeCopy.rules.pointsBody}</p>
            </div>

            <div className="surface-row rounded-[0.95rem] p-4 border border-white/6 hover:border-[var(--color-accent)]/20 transition duration-300">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{homeCopy.rules.requestPolicyTitle}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-paper)]">{homeCopy.rules.requestPolicyBody}</p>
            </div>
          </div>
        </div>

        <NextMatchSpotlightCard copy={homeCopy.spotlight} match={nextSlot.matches[0]} referrerSoccerverseUsername={referrerSoccerverseUsername} locale={locale} />
      </section>

      <TournamentLeadersCard copy={homeCopy.leaders} locale={locale} />

      <LandingPrizeSection copy={copy.prizes} referrerSoccerverseUsername={referrerSoccerverseUsername} />

      <section id="score-calculator">
        <ScoringCalculator budgetOptions={budgetOptions} copy={copy.scoringCalculator} scoring={scoring} />
      </section>
    </div>
  )
}
