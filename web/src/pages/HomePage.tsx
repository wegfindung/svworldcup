import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerTooltip } from '../components/PlayerTooltip'
import { ScoringCalculator } from '../components/ScoringCalculator'
import { TeamFlag } from '../components/TeamFlag'
import { getMessages, type AppMessages } from '../i18n/messages'
import { budgetLimit as defaultBudgetLimit, budgetOptions as defaultBudgetOptions, defaultScoring, eventTeams } from '../data/eventConfig'
import { useBootstrap } from '../hooks/useBootstrap'
import { withReferral } from '../lib/referral'
import type { FixtureSeed, LocaleCode, ScoringConfig, TeamSeed } from '../lib/types'

type HomeCopy = AppMessages['home']

const superstarPlayers = [
  { playerId: 133609, name: 'Pedri', nationCode: 'ESP', imageUrl: 'https://elrincondeldt.com/sv/photos/players/133609.png' },
  { playerId: 278, name: 'Kylian Mbappe', nationCode: 'FRA', imageUrl: 'https://elrincondeldt.com/sv/photos/players/278.png' },
  { playerId: 181812, name: 'Jamal Musiala', nationCode: 'GER', imageUrl: 'https://elrincondeldt.com/sv/photos/players/181812.png' },
  { playerId: 9, name: 'Achraf Hakimi', nationCode: 'MAR', imageUrl: 'https://elrincondeldt.com/sv/photos/players/9.png' },
  { playerId: 927, name: 'Kang-In Lee', nationCode: 'KOR', imageUrl: 'https://elrincondeldt.com/sv/photos/players/927.png' },
  { playerId: 129718, name: 'Jude Bellingham', nationCode: 'ENG', imageUrl: 'https://elrincondeldt.com/sv/photos/players/129718.png' },
  { playerId: 762, name: 'Vinicius Paixao', nationCode: 'BRA', imageUrl: 'https://elrincondeldt.com/sv/photos/players/762.png' },
  { playerId: 162511, name: 'Senne Lammens', nationCode: 'BEL', imageUrl: 'https://elrincondeldt.com/sv/photos/players/162511.png' },
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

const squadShape = [
  { label: 'GK', value: '1' },
  { label: 'DEF', value: '4' },
  { label: 'MID', value: '3' },
  { label: 'FWD', value: '3' },
  { label: 'SUB', value: '4' },
] as const

const DEFAULT_COMPETITION_START_MS = Date.UTC(2026, 5, 11, 19, 0, 0)

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

function CompetitionCountdownCard({ copy, startMs }: { copy: HomeCopy['countdown']; startMs: number }) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const parts = formatCountdownParts(startMs, nowMs)
  const startDate = useMemo(
    () =>
      new Date(startMs).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
    [startMs],
  )

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1_000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="countdown-card">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-accent)]">{copy.eyebrow}</p>
          <p className="mt-2 text-base font-semibold text-white">{copy.title}</p>
        </div>
        <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{startDate}</span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          [copy.days, parts.days],
          [copy.hours, parts.hours],
          [copy.minutes, parts.minutes],
          [copy.seconds, parts.seconds],
        ].map(([label, value]) => (
          <div key={label} className="countdown-tile">
            <strong>{String(value).padStart(2, '0')}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeroPlayerWall({ label }: { label: string }) {
  return (
    <div className="hero-player-wall" aria-label={label}>
      {superstarPlayers.slice(0, 6).map((player, index) => (
        <PlayerTooltip
          key={player.playerId}
          as="div"
          className="hero-player-tile"
          style={{ ['--tile-delay' as string]: `${index * 60}ms` }}
          info={{ name: player.name, nationCode: player.nationCode, imageUrl: player.imageUrl }}
        >
          <PlayerPortrait
            src={player.imageUrl}
            alt={player.name}
            width={150}
            height={150}
            className="h-full w-full object-cover"
          />
          <span>{player.name}</span>
        </PlayerTooltip>
      ))}
    </div>
  )
}

function SquadBlueprint({ copy }: { copy: HomeCopy['squadBlueprint'] }) {
  return (
    <div className="squad-blueprint">
      <div className="flex items-center justify-between gap-3">
        <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.eyebrow}</p>
        <span className="rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
          {copy.badge}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {squadShape.map((slot) => (
          <div key={slot.label} className="squad-slot">
            <span>{slot.label}</span>
            <strong>{slot.value}</strong>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">{copy.body}</p>
    </div>
  )
}

function NextKickoffCard({
  copy,
  fixtures,
  referrerSoccerverseUsername,
  teams,
}: {
  copy: HomeCopy['nextKickoff']
  fixtures: FixtureSeed[]
  referrerSoccerverseUsername: string
  teams: TeamSeed[]
}) {
  const nextKickoff = getNextKickoffSlot(fixtures, teams)
  const hasMatches = nextKickoff.matches.length > 0

  return (
    <div className="glass-panel rounded-[1.25rem] p-4 sm:p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">{copy.title}</h3>
        </div>
        <span className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.timezone}</span>
      </div>

      <div className="mt-5 rounded-[1rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 p-4">
        <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-accent)]">{nextKickoff.day || copy.fallbackDay}</p>
        <p className="mono mt-2 text-3xl text-white">{nextKickoff.time || copy.fallbackTime}</p>
      </div>

      <div className="mt-4 space-y-2.5">
        {hasMatches ? nextKickoff.matches.map((match, index) => (
          <div
            key={`${match.fixtureId}-${index}`}
            className="surface-row rounded-[0.95rem] p-3 transition hover:-translate-y-[1px] hover:border-[var(--color-accent)]/20"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                {copy.groupPrefix} {match.groupKey}
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
                <TeamFlag teamCode={match.homeTeamCode} label={match.homeName} size="sm" />
                <p className="min-w-0 text-sm font-semibold text-white sm:text-base">
                  <span>{match.homeName}</span> <span className="text-[var(--color-muted)]">{copy.versus}</span> <span>{match.awayName}</span>
                </p>
                <TeamFlag teamCode={match.awayTeamCode} label={match.awayName} size="sm" />
              </div>
            </div>
          </div>
        )) : (
          <div className="surface-row rounded-[0.95rem] p-3 text-sm leading-relaxed text-[var(--color-muted)]">
            {copy.empty}
          </div>
        )}
      </div>

      <Link
        to={withReferral('/results', referrerSoccerverseUsername)}
        className="mt-5 inline-flex items-center rounded-full border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-[2px] hover:bg-white/7 active:scale-[0.98]"
      >
        {copy.cta}
      </Link>
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
  return (
    <div className="glass-panel rounded-[1.15rem] p-4">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.eyebrow}</p>
      <div className="mt-4 space-y-2.5">
        {copy.items.map(({ title, body }, index) => (
          <div key={title} className="surface-row rounded-[0.9rem] p-3">
            <div className="flex items-start gap-3">
              <span className="mono text-[0.72rem] text-[var(--color-accent)]">0{index + 1}</span>
              <div>
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{body}</p>
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

interface HomePageProps {
  locale: LocaleCode
  referrerSoccerverseUsername?: string
}

export function HomePage({ locale, referrerSoccerverseUsername = '' }: HomePageProps) {
  const { data: bootstrap } = useBootstrap()
  const copy = getMessages(locale)
  const homeCopy = copy.home
  const scoring = bootstrap?.scoring ?? defaultScoring
  const budgetLimit = bootstrap?.budgetLimit ?? defaultBudgetLimit
  const budgetOptions = bootstrap?.budgetOptions ?? defaultBudgetOptions
  const minBudget = budgetOptions[0]?.budgetLimit ?? budgetLimit
  const maxBudget = budgetOptions[budgetOptions.length - 1]?.budgetLimit ?? budgetLimit
  const teams = bootstrap?.teams ?? eventTeams
  const fixtures = bootstrap?.fixtures ?? []
  const fixtureCount = bootstrap?.fixtures.length ?? 104
  const competitionStartMs = useMemo(() => getCompetitionStartMs(fixtures), [fixtures])

  return (
    <div className="space-y-4 pb-10">
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
                  {homeCopy.hero.titleLines.map((line) => (
                    <span key={line}>
                      {line}
                      <br />
                    </span>
                  ))}
                </h2>
                <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-[var(--color-muted)] sm:text-[1.05rem]">{homeCopy.hero.body}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={withReferral('/register', referrerSoccerverseUsername)}
                    className="premium-button px-6 py-3 text-sm font-semibold sm:px-7"
                  >
                    {homeCopy.hero.primaryCta}
                  </Link>
                  <Link
                    to={withReferral('/builder', referrerSoccerverseUsername)}
                    className="inline-flex items-center rounded-full border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-[2px] hover:bg-white/7 active:scale-[0.98]"
                  >
                    {homeCopy.hero.secondaryCta}
                  </Link>
                </div>
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
          <CompetitionCountdownCard copy={homeCopy.countdown} startMs={competitionStartMs} />
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
            <span className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{homeCopy.rules.scroll}</span>
          </div>

          <div className="mt-5 max-h-[27rem] space-y-3 overflow-y-auto pr-2">
            <div className="surface-row rounded-[0.95rem] p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{homeCopy.rules.eligibilityTitle}</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--color-paper)]">
                {homeCopy.rules.eligibility.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="surface-row rounded-[0.95rem] p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{homeCopy.rules.budgetTitle}</p>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-[var(--color-accent)]">
                {minBudget.toLocaleString('en-US')} - {maxBudget.toLocaleString('en-US')} SVC
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{homeCopy.rules.budgetBody}</p>
            </div>

            <div className="surface-row rounded-[0.95rem] p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{homeCopy.rules.pointsTitle}</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">{homeCopy.rules.goal}</dt>
                  <dd className="mono text-white">{scoring.goal}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">{homeCopy.rules.assist}</dt>
                  <dd className="mono text-white">{scoring.assist}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">{homeCopy.rules.appearance}</dt>
                  <dd className="mono text-white">{scoring.appearance}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">{homeCopy.rules.minutes}</dt>
                  <dd className="mono text-white">{scoring.minutes}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[var(--color-muted)]">{homeCopy.rules.cleanSheet}</dt>
                    <dd className="mono text-white">
                      GK {scoring.cleanSheet.GK} · DEF {scoring.cleanSheet.DEF} · MID {scoring.cleanSheet.MID}* · FWD {scoring.cleanSheet.FWD}
                    </dd>
                  </div>
                  <p className="text-[10px] leading-tight text-[var(--color-muted)]">{homeCopy.rules.cleanSheetMidNote}</p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">{homeCopy.rules.performance}</dt>
                  <dd className="mono text-white">
                    {homeCopy.rules.performanceMaxPrefix} {scoring.performanceCurve[scoring.performanceCurve.length - 1]?.points ?? 0} {homeCopy.rules.performanceMaxSuffix}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">{homeCopy.rules.pointsBody}</p>
            </div>

            <div className="surface-row rounded-[0.95rem] p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{homeCopy.rules.requestPolicyTitle}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-paper)]">{homeCopy.rules.requestPolicyBody}</p>
            </div>
          </div>
        </div>

        <NextKickoffCard copy={homeCopy.nextKickoff} fixtures={fixtures} referrerSoccerverseUsername={referrerSoccerverseUsername} teams={teams} />
      </section>

      <section>
        <ScoringCalculator budgetOptions={budgetOptions} copy={copy.scoringCalculator} scoring={scoring} />
      </section>
    </div>
  )
}
