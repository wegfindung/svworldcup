import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { EmptyState } from '../components/EmptyState'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerTooltip } from '../components/PlayerTooltip'
import { StatTile } from '../components/StatTile'
import { TeamFlag } from '../components/TeamFlag'
import { eventTeams } from '../data/eventConfig'
import { getMessages, type AppMessages } from '../i18n/messages'
import { fetchSquadUsage } from '../lib/api'
import { aggregateNationPools, playersForNationPool, type NationPoolDetail } from '../lib/nationUsage'
import type { LocaleCode, PublicSquadUsagePayload } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'

function teamName(teamCode: string) {
  return eventTeams.find((team) => team.code === teamCode)?.nameEn ?? teamCode
}

function formatInt(value: number) {
  return value.toLocaleString()
}

function formatShare(share: number) {
  return `${(share * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
}

// Drill-down opened by clicking a nation row: every player picked from that nation, ranked by picks, each
// with its share of the nation's total picks (the shares sum to ~100%). No further drill-down (no nested
// modal) — a deliberate UX call.
function NationPoolModal({
  teamCode,
  detail,
  copy,
  closeLabel,
  onClose,
}: {
  teamCode: string
  detail: NationPoolDetail
  copy: AppMessages['nationPools']
  closeLabel: string
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={teamName(teamCode)}
        onClick={(event) => event.stopPropagation()}
        className="glass-panel flex max-h-[85vh] w-full max-w-lg flex-col rounded-[1.25rem] p-6"
      >
        <div className="flex items-center gap-3">
          <TeamFlag teamCode={teamCode} label={teamName(teamCode)} size="md" />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-white">{teamName(teamCode)}</p>
            <p className="mono mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
              {formatInt(detail.totalPicks)} {copy.poolPicksUnit} · {formatInt(detail.players.length)} {copy.poolPlayersUnit}
            </p>
          </div>
        </div>

        <div className="mono mt-5 grid grid-cols-[minmax(0,1fr)_4rem_4rem] border-b border-white/8 pb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
          <span>{copy.playerCol}</span>
          <span className="border-l border-white/8 pl-3 text-right">{copy.picksCol}</span>
          <span className="border-l border-white/8 pl-3 text-right">{copy.shareCol}</span>
        </div>

        <div className="mt-1 flex-1 divide-y divide-white/6 overflow-y-auto pr-1">
          {detail.players.map((entry) => (
            <div key={entry.player.playerId} className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] items-center py-2.5">
              <PlayerTooltip
                as="div"
                className="min-w-0"
                info={{
                  name: entry.player.displayName,
                  nationCode: entry.player.teamCode || entry.player.nationalityCode,
                  imageUrl: entry.player.imageUrl,
                  meta: [
                    { label: 'Rating', value: String(entry.player.rating) },
                    { label: 'Cost', value: String(entry.player.capCost) },
                    { label: 'Pos', value: entry.player.positionMain ?? entry.player.positions.join('/') },
                  ],
                }}
              >
              <a
                href={`https://play.soccerverse.com/player/${entry.player.playerId}`}
                target="_blank"
                rel="noreferrer"
                className="group flex min-w-0 items-center gap-2.5"
              >
                <PlayerPortrait
                  src={entry.player.imageUrl ?? '/placeholders/player.svg'}
                  alt={entry.player.displayName}
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-lg border border-white/10 object-cover"
                />
                <span className="truncate text-sm font-semibold text-white transition group-hover:text-[var(--color-accent)]">
                  {entry.player.displayName}
                </span>
                <span aria-hidden className="shrink-0 text-[10px] text-[var(--color-muted)] transition group-hover:text-[var(--color-accent)]">↗</span>
              </a>
              </PlayerTooltip>
              <span className="mono border-l border-white/8 pl-3 text-right text-sm font-bold text-[var(--color-accent)]">
                {formatInt(entry.picks)}
              </span>
              <span className="mono border-l border-white/8 pl-3 text-right text-xs text-[var(--color-muted)]">
                {formatShare(entry.shareOfNation)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Stats › Nation pools — ranks the tournament nations by how often their players were picked across revealed
// squads. Pure client-side off /squad-usage (see SOP "Stats — Nation Pools"). The numeric columns carry
// vertical divider lines so Picks / Players / Share don't read as one value.
export function NationPoolsPanel({ locale }: { locale: LocaleCode }) {
  const messages = getMessages(locale)
  const copy = messages.nationPools
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [payload, setPayload] = useState<PublicSquadUsagePayload | null>(null)
  const [selectedNation, setSelectedNation] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void fetchSquadUsage()
      .then((response) => {
        if (active) {
          setPayload(response)
          setLoadState('ready')
        }
      })
      .catch(() => {
        if (active) {
          setLoadState('error')
        }
      })
    return () => {
      active = false
    }
  }, [])

  const rows = useMemo(() => aggregateNationPools(payload), [payload])
  const totalPicks = useMemo(() => rows.reduce((sum, row) => sum + row.totalPicks, 0), [rows])
  const nationDetail = useMemo(() => playersForNationPool(payload, selectedNation), [payload, selectedNation])

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

  if (rows.length === 0) {
    return (
      <section className="glass-panel rounded-[1.15rem] p-5">
        <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)] lg:items-end">
        <p className="max-w-[66ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.intro}</p>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label={copy.statNations} value={formatInt(rows.length)} tone="accent" />
          <StatTile label={copy.statPicks} value={formatInt(totalPicks)} tone="sand" />
        </div>
      </div>

      <section className="glass-panel overflow-hidden rounded-[1.15rem]">
        <div className="mono grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem] border-b border-white/8 bg-black/25 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
          <span className="px-4 py-3">{copy.nationCol}</span>
          <span className="border-l border-white/8 px-3 py-3 text-right">{copy.picksCol}</span>
          <span className="border-l border-white/8 px-3 py-3 text-right">{copy.playersCol}</span>
          <span className="border-l border-white/8 px-3 py-3 text-right">{copy.shareCol}</span>
        </div>

        <div className="divide-y divide-white/6">
          {rows.map((row, index) => (
            <button
              key={row.teamCode}
              type="button"
              onClick={() => setSelectedNation(row.teamCode)}
              className="grid w-full grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem] items-center text-left transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)]/40"
            >
              <span className="flex min-w-0 items-center gap-3 px-4 py-3">
                <span className="mono w-5 shrink-0 text-xs text-[var(--color-muted)]">{index + 1}</span>
                <TeamFlag teamCode={row.teamCode} label={teamName(row.teamCode)} size="sm" />
                <span className="truncate text-sm font-semibold text-white">{teamName(row.teamCode)}</span>
              </span>
              <span className="mono border-l border-white/8 px-3 py-3 text-right text-sm font-bold text-[var(--color-accent)]">
                {formatInt(row.totalPicks)}
              </span>
              <span className="mono border-l border-white/8 px-3 py-3 text-right text-sm text-white">
                {formatInt(row.distinctPlayers)}
              </span>
              <span className="mono border-l border-white/8 px-3 py-3 text-right text-xs text-[var(--color-muted)]">
                {formatShare(row.share)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {selectedNation ? (
        <NationPoolModal
          teamCode={selectedNation}
          detail={nationDetail}
          copy={copy}
          closeLabel={messages.results.close}
          onClose={() => setSelectedNation(null)}
        />
      ) : null}
    </div>
  )
}
