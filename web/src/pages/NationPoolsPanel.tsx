import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { StatTile } from '../components/StatTile'
import { TeamFlag } from '../components/TeamFlag'
import { eventTeams } from '../data/eventConfig'
import { getMessages } from '../i18n/messages'
import { fetchSquadUsage } from '../lib/api'
import { aggregateNationPools } from '../lib/nationUsage'
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

// Stats › Nation pools — ranks the tournament nations by how often their players were picked across revealed
// squads. Pure client-side off /squad-usage (see SOP "Stats — Nation Pools"). The numeric columns carry
// vertical divider lines so Picks / Players / Share don't read as one value.
export function NationPoolsPanel({ locale }: { locale: LocaleCode }) {
  const copy = getMessages(locale).nationPools
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [payload, setPayload] = useState<PublicSquadUsagePayload | null>(null)

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
            <div
              key={row.teamCode}
              className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem] items-center transition hover:bg-white/[0.03]"
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
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
