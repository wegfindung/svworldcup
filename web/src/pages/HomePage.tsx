import { Link } from 'react-router-dom'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { TeamFlag } from '../components/TeamFlag'
import { t } from '../i18n/messages'
import { budgetLimit as defaultBudgetLimit, defaultScoring, eventTeams } from '../data/eventConfig'
import { useBootstrap } from '../hooks/useBootstrap'
import { withReferral } from '../lib/referral'
import type { FixtureSeed, LocaleCode, ScoringConfig, TeamSeed } from '../lib/types'

const superstarPlayers = [
  { playerId: 133609, name: 'Pedri', imageUrl: 'https://elrincondeldt.com/sv/photos/players/133609.png' },
  { playerId: 278, name: 'Kylian Mbappe', imageUrl: 'https://elrincondeldt.com/sv/photos/players/278.png' },
  { playerId: 181812, name: 'Jamal Musiala', imageUrl: 'https://elrincondeldt.com/sv/photos/players/181812.png' },
  { playerId: 9, name: 'Achraf Hakimi', imageUrl: 'https://elrincondeldt.com/sv/photos/players/9.png' },
  { playerId: 927, name: 'Kang-In Lee', imageUrl: 'https://elrincondeldt.com/sv/photos/players/927.png' },
  { playerId: 129718, name: 'Jude Bellingham', imageUrl: 'https://elrincondeldt.com/sv/photos/players/129718.png' },
  { playerId: 762, name: 'Vinicius Paixao', imageUrl: 'https://elrincondeldt.com/sv/photos/players/762.png' },
  { playerId: 162511, name: 'Senne Lammens', imageUrl: 'https://elrincondeldt.com/sv/photos/players/162511.png' },
] as const

const footballNations = [
  { code: 'ar', label: 'Argentina' },
  { code: 'br', label: 'Brazil' },
  { code: 'de', label: 'Germany' },
  { code: 'eng', label: 'England' },
  { code: 'es', label: 'Spain' },
  { code: 'fr', label: 'France' },
  { code: 'it', label: 'Italy' },
  { code: 'nl', label: 'Netherlands' },
  { code: 'pt', label: 'Portugal' },
  { code: 'uy', label: 'Uruguay' },
] as const

const heroMechanics = [
  { step: '01', title: 'Draft hidden', body: 'Pick 15 players under the live SVC cap before the first whistle.' },
  { step: '02', title: 'Lock once', body: 'Your squad stays fixed for the whole competition. No matchday tinkering.' },
  { step: '03', title: 'Climb tables', body: 'Every goal, assist, clean sheet, and performance point hits the public race.' },
] as const

const squadShape = [
  { label: 'GK', value: '1' },
  { label: 'DEF', value: '4' },
  { label: 'MID', value: '3' },
  { label: 'FWD', value: '3' },
  { label: 'SUB', value: '4' },
] as const

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
      }) ?? 'Schedule pending',
    time:
      kickoffDate?.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/London',
      }) ?? '',
    matches: nextMatches,
  }
}

function HeroPlayerWall() {
  return (
    <div className="hero-player-wall" aria-label="Featured Soccerverse players">
      {superstarPlayers.slice(0, 6).map((player, index) => (
        <div key={player.playerId} className="hero-player-tile" style={{ ['--tile-delay' as string]: `${index * 60}ms` }}>
          <PlayerPortrait
            src={player.imageUrl}
            alt={player.name}
            width={150}
            height={150}
            className="h-full w-full object-cover"
          />
          <span>{player.name}</span>
        </div>
      ))}
    </div>
  )
}

function SquadBlueprint() {
  return (
    <div className="squad-blueprint">
      <div className="flex items-center justify-between gap-3">
        <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)]">locked squad</p>
        <span className="rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
          15 players
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
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
        One entry, one cap, one squad for the full tournament.
      </p>
    </div>
  )
}

function NextKickoffCard({
  fixtures,
  referrerSoccerverseUsername,
  teams,
}: {
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
          <p className="eyebrow">next live window</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">Next kickoff</h3>
        </div>
        <span className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)]">BST schedule</span>
      </div>

      <div className="mt-5 rounded-[1rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 p-4">
        <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-accent)]">{nextKickoff.day}</p>
        <p className="mono mt-2 text-3xl text-white">{nextKickoff.time || 'TBC'}</p>
      </div>

      <div className="mt-4 space-y-2.5">
        {hasMatches ? nextKickoff.matches.map((match, index) => (
          <div
            key={`${match.fixtureId}-${index}`}
            className="surface-row rounded-[0.95rem] p-3 transition hover:-translate-y-[1px] hover:border-[var(--color-accent)]/20"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Group {match.groupKey}
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
                <TeamFlag teamCode={match.homeTeamCode} label={match.homeName} size="sm" />
                <p className="min-w-0 text-sm font-semibold text-white sm:text-base">
                  <span>{match.homeName}</span> <span className="text-[var(--color-muted)]">vs</span> <span>{match.awayName}</span>
                </p>
                <TeamFlag teamCode={match.awayTeamCode} label={match.awayName} size="sm" />
              </div>
            </div>
          </div>
        )) : (
          <div className="surface-row rounded-[0.95rem] p-3 text-sm leading-relaxed text-[var(--color-muted)]">
            Match schedule will appear here once the public bootstrap is available.
          </div>
        )}
      </div>

      <Link
        to={withReferral('/results', referrerSoccerverseUsername)}
        className="mt-5 inline-flex items-center rounded-full border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-[2px] hover:bg-white/7 active:scale-[0.98]"
      >
        Open results centre
      </Link>
    </div>
  )
}

function NationFlagsCard() {
  return (
    <div className="glass-panel rounded-[1.15rem] p-3.5">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Top football nations</p>
      <div className="mt-4 grid grid-cols-5 justify-items-center gap-x-2 gap-y-3 sm:gap-x-3">
        {footballNations.map((nation) => (
          <div key={nation.code} className="group flex items-center justify-center">
            <span
              title={nation.label}
              aria-label={nation.label}
              className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/12 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition duration-300 ease-out group-hover:-translate-y-[1px] sm:h-11 sm:w-11"
            >
              <img
                src={`/flags/${nation.code}.svg`}
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

function RankingTracksCard() {
  return (
    <div className="glass-panel rounded-[1.15rem] p-4">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">three races at once</p>
      <div className="mt-4 space-y-2.5">
        {[
          ['Rookie', 'New managers fight the open table from day one.'],
          ['Veteran', 'Established accounts get their own pressure lane.'],
          ['Nation', 'Every selected country carries its managers into a country ranking.'],
        ].map(([title, body], index) => (
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

function DiscordCard() {
  return (
    <div className="glass-panel rounded-[1.15rem] bg-[linear-gradient(135deg,rgba(24,180,133,0.2),rgba(255,255,255,0.04))] p-4">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Join Discord</p>
      <div className="mt-4 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/12 bg-black/20 text-[var(--color-paper)]">
          <DiscordIcon />
        </div>
        <div>
          <p className="text-base font-semibold text-white">Find builders, rivals, and reveal pressure.</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            The Discord server is the fastest route into the event before registrations spike.
          </p>
        </div>
      </div>
      <a
        href="https://discord.com/invite/ze5xJgg7AM"
        target="_blank"
        rel="noreferrer"
        className="premium-button mt-5 gap-2 px-4 py-2.5 text-sm font-semibold"
      >
        <DiscordIcon />
        Open community invite
      </a>
    </div>
  )
}

function LandingProofCard({ scoring }: { scoring: ScoringConfig }) {
  return (
    <div className="glass-panel rounded-[1.15rem] p-4">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">what moves the table</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {[
          ['Goal', `+${scoring.goal}`],
          ['Assist', `+${scoring.assist}`],
          ['Clean sheet', `GK +${scoring.cleanSheet.GK}`],
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
  const scoring = bootstrap?.scoring ?? defaultScoring
  const budgetLimit = bootstrap?.budgetLimit ?? defaultBudgetLimit
  const teams = bootstrap?.teams ?? eventTeams
  const fixtures = bootstrap?.fixtures ?? []
  const fixtureCount = bootstrap?.fixtures.length ?? 104

  return (
    <div className="space-y-4 pb-10">
      <section className="landing-hero">
        <div className="landing-main-stack">
          <div className="hero-card rounded-[1.35rem] p-4 sm:p-6 lg:p-7">
            <div className="hero-composition">
              <div className="hero-copy">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="eyebrow">{t(locale, 'heroEyebrow')}</p>
                  <span className="mono rounded-full border border-[var(--color-sand)]/20 bg-[var(--color-sand)]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--color-sand)]">
                    one locked entry
                  </span>
                </div>
                <p className="mt-7 mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  Hidden squads. Public pressure. Nation pride.
                </p>
                <h2 className="section-title hero-title mt-3">
                  Draft 15.
                  <br />
                  Hide the squad.
                  <br />
                  Beat your nation.
                </h2>
                <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-[var(--color-muted)] sm:text-[1.05rem]">
                  Build one Soccerverse World Cup squad under the cap, lock it for the full competition, then watch every
                  official match swing the rookie, veteran, and nation rankings.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={withReferral('/register', referrerSoccerverseUsername)}
                    className="premium-button px-6 py-3 text-sm font-semibold sm:px-7"
                  >
                    {t(locale, 'heroPrimary')}
                  </Link>
                  <Link
                    to={withReferral('/builder', referrerSoccerverseUsername)}
                    className="inline-flex items-center rounded-full border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-[2px] hover:bg-white/7 active:scale-[0.98]"
                  >
                    Start building
                  </Link>
                </div>
              </div>

              <div className="hero-stage">
                <HeroPlayerWall />
                <SquadBlueprint />
              </div>
            </div>

            <div className="hero-mechanics">
              {heroMechanics.map((item) => (
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
          <LandingProofCard scoring={scoring} />
        </div>

        <div className="landing-side-stack">
          <div className="data-strip">
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Teams</p>
              <p className="mono mt-2 text-2xl text-white">{teams.length}</p>
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Squad</p>
              <p className="mono mt-2 text-2xl text-white">15</p>
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Matches</p>
              <p className="mono mt-2 text-2xl text-white">{fixtureCount}</p>
            </div>
          </div>
          <RankingTracksCard />
          <NationFlagsCard />
          <DiscordCard />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel rounded-[1.25rem] p-4 sm:p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t(locale, 'scoringTitle')}</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">Lock the event logic before kickoff</h3>
              <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-[var(--color-muted)]">
                These values are loaded from the current public event configuration.
              </p>
            </div>
            <span className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)]">scroll</span>
          </div>

          <div className="mt-5 max-h-[27rem] space-y-3 overflow-y-auto pr-2">
            <div className="surface-row rounded-[0.95rem] p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">eligibility</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--color-paper)]">
                <li>No multi-accounts.</li>
                <li>All teams use the 4-3-3 structure with four locked substitutes.</li>
                <li>Squads stay hidden until the participant reveals them or an admin reveals all squads at kickoff.</li>
              </ul>
            </div>

            <div className="surface-row rounded-[0.95rem] p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">salary budget</p>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-[var(--color-accent)]">
                {budgetLimit.toLocaleString('en-US')} SVC
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                Every participant drafts under the same cap using Soccerverse wage logic.
              </p>
            </div>

            <div className="surface-row rounded-[0.95rem] p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">points</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">Goal</dt>
                  <dd className="mono text-white">{scoring.goal}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">Assist</dt>
                  <dd className="mono text-white">{scoring.assist}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">Appearance</dt>
                  <dd className="mono text-white">{scoring.appearance}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">60+ minutes</dt>
                  <dd className="mono text-white">{scoring.minutes}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">Clean sheet</dt>
                  <dd className="mono text-white">
                    GK {scoring.cleanSheet.GK} · DEF {scoring.cleanSheet.DEF} · MID {scoring.cleanSheet.MID} · FWD {scoring.cleanSheet.FWD}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">Performance</dt>
                  <dd className="mono text-white">
                    Up to {scoring.performanceCurve[scoring.performanceCurve.length - 1]?.points ?? 0} Points
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
                Performance points are based on real performance data and are entered by admins.
              </p>
            </div>

            <div className="surface-row rounded-[0.95rem] p-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">request policy</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-paper)]">
                No API data is requested from the landing page. Registration, verification, builder loading, and backend tools only talk
                to the server after an explicit button action.
              </p>
            </div>
          </div>
        </div>

        <NextKickoffCard fixtures={fixtures} referrerSoccerverseUsername={referrerSoccerverseUsername} teams={teams} />
      </section>
    </div>
  )
}
