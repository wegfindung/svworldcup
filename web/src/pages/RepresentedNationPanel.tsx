import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { NationSelect } from '../components/NationSelect'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerStatsModal } from '../components/PlayerStatsModal'
import { PlayerTooltip } from '../components/PlayerTooltip'
import { StatTile } from '../components/StatTile'
import { TeamFlag } from '../components/TeamFlag'
import { getNationName } from '../data/soccerverseNations'
import { getMessages } from '../i18n/messages'
import { fetchRookieLeaderboard, fetchSquadUsage, fetchVeteranLeaderboard } from '../lib/api'
import {
  nationByParticipantFromRows,
  playersForRepresentedNation,
  representedNationOptions,
  type RepresentedNationPlayer,
} from '../lib/nationUsage'
import { toPlayerSeed, type PlayerStatsSeed } from '../lib/playerStatsSeed'
import type { LocaleCode, ParticipantScoreRow, PublicSquadUsagePayload, PublicSquadUsagePlayer } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'

interface AllegianceData {
  payload: PublicSquadUsagePayload
  rookies: ParticipantScoreRow[]
  veterans: ParticipantScoreRow[]
}

function formatPercent(share: number) {
  return `${(share * 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}%`
}

function roleLabel(player: PublicSquadUsagePlayer) {
  return player.positionMain ?? player.positions.slice(0, 2).join('/') ?? player.positionClasses.join('/')
}

function RepresentedPlayerRow({
  entry,
  rank,
  pickersLabel,
  onSelect,
}: {
  entry: RepresentedNationPlayer
  rank: number
  pickersLabel: string
  onSelect: () => void
}) {
  const { player, pickers, share } = entry
  return (
    <article className="grid gap-4 rounded-[1rem] border border-white/8 bg-black/18 p-4 transition hover:border-[var(--color-accent)]/28 hover:bg-white/5 lg:grid-cols-[minmax(0,1.5fr)_minmax(14rem,1fr)] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="mono grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-xs text-[var(--color-muted)]">
          #{rank}
        </span>
        <PlayerTooltip
          as="div"
          className="flex min-w-0 items-center gap-3"
          info={{
            name: player.displayName,
            nationCode: player.teamCode || player.nationalityCode,
            imageUrl: player.imageUrl,
            meta: [
              { label: 'Rating', value: String(player.rating) },
              { label: 'Cost', value: String(player.capCost) },
              { label: 'Role', value: roleLabel(player) },
            ],
          }}
        >
          <button type="button" onClick={onSelect} className="flex min-w-0 items-center gap-3 text-left">
            <PlayerPortrait
              src={player.imageUrl ?? '/placeholders/player.svg'}
              alt={player.displayName}
              width={52}
              height={52}
              className="h-12 w-12 rounded-xl border border-white/10 object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white transition hover:text-[var(--color-accent)]">{player.displayName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                <TeamFlag teamCode={player.teamCode} label={player.teamCode} size="sm" />
                <span className="mono uppercase tracking-[0.14em]">{roleLabel(player)}</span>
                <span className="mono uppercase tracking-[0.14em]">ID {player.playerId}</span>
              </div>
            </div>
          </button>
        </PlayerTooltip>
      </div>

      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{pickersLabel}</p>
            <p className="mt-1 text-2xl font-black text-[var(--color-accent)]">{formatPercent(share)}</p>
          </div>
          <p className="text-sm font-semibold text-white">
            {pickers} <span className="font-normal text-[var(--color-muted)]">{pickersLabel}</span>
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] shadow-[0_0_16px_rgba(34,189,147,0.28)]"
            style={{ width: `${Math.max(2, Math.min(100, share * 100))}%` }}
          />
        </div>
      </div>
    </article>
  )
}

// Stats › Allegiance — pick a Nation-League nation and rank players by how many of that nation's managers
// drafted them (a manager counts on primary OR secondary nation). The manager→nation map is joined
// client-side from the league boards, so no server change is needed (see SOP "Stats — By Represented Nation").
export function RepresentedNationPanel({ locale }: { locale: LocaleCode }) {
  const copy = getMessages(locale).nationRep
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [data, setData] = useState<AllegianceData | null>(null)
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [modalSeed, setModalSeed] = useState<PlayerStatsSeed | null>(null)

  useEffect(() => {
    let active = true
    void Promise.allSettled([fetchSquadUsage(), fetchRookieLeaderboard(), fetchVeteranLeaderboard()])
      .then(([usageResult, rookieResult, veteranResult]) => {
        if (!active) {
          return
        }
        if (usageResult.status !== 'fulfilled') {
          setLoadState('error')
          return
        }
        setData({
          payload: usageResult.value,
          rookies: rookieResult.status === 'fulfilled' ? rookieResult.value.items : [],
          veterans: veteranResult.status === 'fulfilled' ? veteranResult.value.items : [],
        })
        setLoadState('ready')
      })
    return () => {
      active = false
    }
  }, [])

  const nationByParticipant = useMemo(
    () => nationByParticipantFromRows(data?.rookies, data?.veterans),
    [data?.rookies, data?.veterans],
  )
  const options = useMemo(
    () => representedNationOptions(data?.payload ?? null, nationByParticipant),
    [data?.payload, nationByParticipant],
  )
  // Default to the most-represented nation, derived during render (never setState-in-effect).
  const activeNation = selected ?? options[0]?.code
  const result = useMemo(
    () => playersForRepresentedNation(data?.payload ?? null, nationByParticipant, activeNation),
    [data?.payload, nationByParticipant, activeNation],
  )

  const nationOptions = useMemo(
    () => options.map((option) => ({ code: option.code, nameEn: getNationName(option.code) })),
    [options],
  )

  if (loadState === 'loading') {
    return <div className="skeleton h-96 rounded-[1.15rem]" />
  }

  if (loadState === 'error') {
    return (
      <section className="glass-panel rounded-[1.15rem] p-5">
        <EmptyState title={copy.errorTitle} body={copy.errorBody} />
      </section>
    )
  }

  if (options.length === 0) {
    return (
      <section className="glass-panel rounded-[1.15rem] p-5">
        <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <p className="max-w-[66ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.intro}</p>

      <section className="glass-panel allow-dropdown-overflow relative z-20 grid gap-4 rounded-[1.15rem] p-4 lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1fr)] lg:items-end">
        <NationSelect
          label={copy.selectLabel}
          nations={nationOptions}
          value={activeNation}
          placeholder={copy.selectPlaceholder}
          searchPlaceholder={copy.searchPlaceholder}
          onChange={setSelected}
        />
        <div className="grid grid-cols-2 gap-3">
          <StatTile label={copy.statManagers} value={result.nationManagerCount.toLocaleString()} tone="accent" />
          <StatTile label={copy.statPlayers} value={result.players.length.toLocaleString()} tone="sand" />
        </div>
      </section>

      {result.players.length > 0 ? (
        <section className="grid gap-3">
          {result.players.map((entry, index) => (
            <RepresentedPlayerRow
              key={entry.player.playerId}
              entry={entry}
              rank={index + 1}
              pickersLabel={copy.pickersLabel}
              onSelect={() => setModalSeed(toPlayerSeed(entry.player))}
            />
          ))}
        </section>
      ) : (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title={copy.noPicksTitle} body={copy.noPicksBody} />
        </section>
      )}

      {modalSeed ? <PlayerStatsModal seed={modalSeed} locale={locale} onClose={() => setModalSeed(null)} /> : null}
    </div>
  )
}
