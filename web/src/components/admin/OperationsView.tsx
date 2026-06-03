import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../EmptyState'
import {
  fetchAdminAuditLogs,
  fetchAdminOverview,
  fetchAdminOperationEvents,
  fetchEmailCampaigns,
  fetchMatchImportBatches,
} from '../../lib/api'
import type { AdminOverview, AuditLogEntry, EmailCampaignRecord, OperationEvent, PendingMatchBatch } from '../../lib/types'

// B3: each source is nullable so one failed fetch degrades only its own section. A null field
// means "not loaded" — the matching source name is listed in `failedSources`.
interface OperationsData {
  overview: AdminOverview | null
  auditLogs: AuditLogEntry[] | null
  batches: PendingMatchBatch[] | null
  campaigns: EmailCampaignRecord[] | null
  events: OperationEvent[] | null
}

const emptyOperationsData: OperationsData = {
  overview: null,
  auditLogs: null,
  batches: null,
  campaigns: null,
  events: null,
}

function formatDateTime(value?: string) {
  if (!value) {
    return 'Not recorded'
  }

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function actionLabel(actionKey: string) {
  return actionKey
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .join(' / ')
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  return typeof value === 'string' ? value : JSON.stringify(value)
}

// Render an audit row's detail_json as readable lines. `<prefix>From`/`<prefix>To` and plain
// `from`/`to` pairs collapse into `prefix: old → new` so corrections (nation, username, league)
// show what changed; any other keys render as `key: value`.
function formatAuditDetail(detail: Record<string, unknown>): string[] {
  const consumed = new Set<string>()
  const lines: string[] = []

  for (const key of Object.keys(detail)) {
    if (!key.endsWith('From')) {
      continue
    }
    const prefix = key.slice(0, -'From'.length)
    const toKey = `${prefix}To`
    if (toKey in detail) {
      consumed.add(key)
      consumed.add(toKey)
      const label = prefix || 'value'
      lines.push(`${label}: ${formatDetailValue(detail[key])} → ${formatDetailValue(detail[toKey])}`)
    }
  }

  if ('from' in detail && 'to' in detail && !consumed.has('from') && !consumed.has('to')) {
    consumed.add('from')
    consumed.add('to')
    lines.push(`${formatDetailValue(detail.from)} → ${formatDetailValue(detail.to)}`)
  }

  for (const key of Object.keys(detail)) {
    if (!consumed.has(key)) {
      lines.push(`${key}: ${formatDetailValue(detail[key])}`)
    }
  }

  return lines
}

function eventTypeLabel(type: OperationEvent['type']) {
  return type === 'email_scheduler' ? 'Email scheduler' : 'Soccerverse API'
}

function statusTone(status: OperationEvent['status']): 'default' | 'accent' | 'warning' {
  if (status === 'ok') {
    return 'accent'
  }
  return status === 'warning' ? 'warning' : 'default'
}

function countCampaigns(campaigns: EmailCampaignRecord[], status: EmailCampaignRecord['status']) {
  return campaigns.filter((campaign) => campaign.status === status).length
}

function MetricTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="surface-row rounded-[0.95rem] p-4">
      <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">{detail}</p>
    </div>
  )
}

function StatusLine({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'accent' | 'warning' }) {
  const toneClass =
    tone === 'accent'
      ? 'border-[var(--color-accent)]/24 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
      : tone === 'warning'
        ? 'border-[var(--color-sand)]/24 bg-[var(--color-sand)]/10 text-[var(--color-sand)]'
        : 'border-white/10 text-white'

  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/8 py-3 last:border-b-0">
      <span className="text-sm text-[var(--color-muted)]">{label}</span>
      <span className={['mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]', toneClass].join(' ')}>
        {value}
      </span>
    </div>
  )
}

export function OperationsView() {
  const [data, setData] = useState<OperationsData>(emptyOperationsData)
  const [failedSources, setFailedSources] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  // One loader, re-run via reloadKey — the refresh button and the initial mount share it instead of
  // duplicating the fetch block. allSettled means a single failed source degrades only its section.
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    void (async () => {
      const [overviewResult, auditResult, batchesResult, campaignsResult, eventsResult] = await Promise.allSettled([
        fetchAdminOverview(controller.signal),
        fetchAdminAuditLogs(60, controller.signal),
        fetchMatchImportBatches(controller.signal),
        fetchEmailCampaigns(controller.signal),
        fetchAdminOperationEvents(60, controller.signal),
      ])
      if (!active) {
        return
      }
      const next: OperationsData = { ...emptyOperationsData }
      const failed: string[] = []
      if (overviewResult.status === 'fulfilled') next.overview = overviewResult.value
      else failed.push('overview')
      if (auditResult.status === 'fulfilled') next.auditLogs = auditResult.value.items
      else failed.push('audit logs')
      if (batchesResult.status === 'fulfilled') next.batches = batchesResult.value.items
      else failed.push('pending imports')
      if (campaignsResult.status === 'fulfilled') next.campaigns = campaignsResult.value.campaigns
      else failed.push('email campaigns')
      if (eventsResult.status === 'fulfilled') next.events = eventsResult.value.items
      else failed.push('runtime events')
      setData(next)
      setFailedSources(failed)
      setLoading(false)
    })()

    // B5: abort the in-flight fetches when a refresh supersedes them or the view unmounts.
    return () => {
      active = false
      controller.abort()
    }
  }, [reloadKey])

  const hasAnyData = Object.values(data).some((value) => value !== null)

  const metrics = useMemo(() => {
    const tiles: Array<{ label: string; value: string; detail: string }> = []

    if (data.overview) {
      const filledPools = Object.values(data.overview.teamSelectionCounts).filter((count) => count > 0).length
      const totalPools = Object.keys(data.overview.teamSelectionCounts).length
      tiles.push(
        {
          label: 'Accounts',
          value: String(data.overview.counts.active),
          detail: `${data.overview.counts.pending} pending verification`,
        },
        {
          label: 'Team pools',
          value: `${filledPools}/${totalPools}`,
          detail: 'Curated pools with at least one player',
        },
      )
    }
    if (data.batches) {
      const pendingRows = data.batches.reduce((sum, batch) => sum + batch.rows.length, 0)
      tiles.push({
        label: 'Pending imports',
        value: String(data.batches.length),
        detail: `${pendingRows} match-stat rows awaiting promotion`,
      })
    }
    if (data.campaigns) {
      const pendingRecipients = data.campaigns.reduce((sum, campaign) => sum + campaign.pendingCount, 0)
      const failedRecipients = data.campaigns.reduce((sum, campaign) => sum + campaign.failedCount, 0)
      tiles.push({
        label: 'Mail queue',
        value: String(pendingRecipients),
        detail: `${failedRecipients} failed recipients across campaigns`,
      })
    }
    return tiles
  }, [data])

  const eventCounts = useMemo(() => {
    const events = data.events ?? []
    return {
      emailScheduler: events.filter((event) => event.type === 'email_scheduler').length,
      soccerverseApi: events.filter((event) => event.type === 'soccerverse_api').length,
      warnings: events.filter((event) => event.status === 'warning').length,
      errors: events.filter((event) => event.status === 'error').length,
    }
  }, [data])

  return (
    <div className="space-y-4">
      <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
        <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="eyebrow">operations</p>
            <h3 className="section-title mt-4 max-w-[11ch]">Event health and audit trail.</h3>
            <p className="mt-4 max-w-[66ch] text-sm leading-relaxed text-[var(--color-muted)]">
              Monitor import review work, outbound mail queue state, current event controls, and the latest audited admin writes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              // Re-show the skeleton on refresh from the click handler — loading starts true on mount,
              // so the effect itself never needs a synchronous setState.
              setLoading(true)
              setReloadKey((key) => key + 1)
            }}
            disabled={loading}
            className="premium-button h-11 px-6 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Refreshing...' : 'Refresh operations'}
          </button>
        </div>
      </section>

      {loading && !hasAnyData ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-32 rounded-[0.95rem]" />
          ))}
        </section>
      ) : null}

      {failedSources.length ? (
        <div className="rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
          Could not load: {failedSources.join(', ')}. The other sections still reflect what loaded.
        </div>
      ) : null}

      {!loading && !hasAnyData ? (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title="Operations data unavailable" body="The backend returned an unexpected response for every operations source." />
        </section>
      ) : null}

      {hasAnyData ? (
        <>
          {metrics.length ? (
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricTile key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
              ))}
            </section>
          ) : null}

          <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-4">
              {data.overview ? (
                <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
                  <p className="eyebrow">runtime gates</p>
                  <div className="mt-4">
                    <StatusLine
                      label="Scoring configuration"
                      value={data.overview.scoringLocked ? 'locked' : 'editable'}
                      tone={data.overview.scoringLocked ? 'warning' : 'accent'}
                    />
                    <StatusLine
                      label="Global profile reveal"
                      value={data.overview.eventControls.globalRevealProfiles ? 'on' : 'off'}
                      tone={data.overview.eventControls.globalRevealProfiles ? 'accent' : 'default'}
                    />
                    <StatusLine
                      label="Global squad reveal"
                      value={data.overview.eventControls.globalRevealSquads ? 'on' : 'off'}
                      tone={data.overview.eventControls.globalRevealSquads ? 'accent' : 'default'}
                    />
                    <StatusLine
                      label="Soccerverse API error log"
                      value={`${eventCounts.soccerverseApi} events`}
                      tone={eventCounts.soccerverseApi > 0 ? 'warning' : 'accent'}
                    />
                  </div>
                </div>
              ) : null}

              {data.campaigns ? (
                <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
                  <p className="eyebrow">email scheduler</p>
                  <div className="mt-4">
                    <StatusLine label="Active autoresponders" value={String(countCampaigns(data.campaigns, 'active'))} />
                    <StatusLine label="Scheduled newsletters" value={String(countCampaigns(data.campaigns, 'scheduled'))} />
                    <StatusLine label="Sending campaigns" value={String(countCampaigns(data.campaigns, 'sending'))} tone="accent" />
                    <StatusLine label="Scheduler runtime events" value={String(eventCounts.emailScheduler)} />
                    <StatusLine label="Latest campaign update" value={formatDateTime(data.campaigns[0]?.updatedAt)} />
                  </div>
                </div>
              ) : null}

              {data.events ? (
                <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="eyebrow">runtime events</p>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">Scheduler and API signals.</h3>
                    </div>
                    <span className="mono text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                      {eventCounts.errors} errors - {eventCounts.warnings} warnings
                    </span>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[0.95rem] border border-white/8">
                    {data.events.length ? (
                      <div className="divide-y divide-white/8">
                        {data.events.slice(0, 8).map((event) => (
                        <article key={event.eventId} className="bg-black/12 px-3.5 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white">{event.message}</p>
                              <p className="mono mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                                {eventTypeLabel(event.type)} - {formatDateTime(event.createdAt)}
                              </p>
                            </div>
                            <span
                              className={[
                                'mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]',
                                statusTone(event.status) === 'accent'
                                  ? 'border-[var(--color-accent)]/24 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                                  : statusTone(event.status) === 'warning'
                                    ? 'border-[var(--color-sand)]/24 bg-[var(--color-sand)]/10 text-[var(--color-sand)]'
                                    : 'border-white/10 text-white',
                              ].join(' ')}
                            >
                              {event.status}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-black/12 p-5">
                      <EmptyState title="No runtime events yet" body="Scheduler runs and Soccerverse API warnings will appear here after they occur." />
                    </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              {data.batches ? (
                <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="eyebrow">match imports</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">Pending review queue.</h3>
                    </div>
                    <span className="mono text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                      {data.batches.length} batches
                    </span>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[0.95rem] border border-white/8">
                    {data.batches.length ? (
                      <div className="divide-y divide-white/8">
                        {data.batches.slice(0, 6).map((batch) => (
                        <div key={batch.batchId} className="grid gap-3 bg-black/12 px-3.5 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{batch.fixtureId}</p>
                            <p className="mono mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                              v{batch.dataVersion} - {batch.rows.length} rows - {batch.confirmations.length}/2 confirmations
                            </p>
                          </div>
                          <span className="text-xs text-[var(--color-muted)]">{formatDateTime(batch.updatedAt)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-black/12 p-5">
                      <EmptyState title="No pending imports" body="All submitted match-stat batches are either promoted or no review has started yet." />
                    </div>
                    )}
                  </div>
                </div>
              ) : null}

              {data.auditLogs ? (
                <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="eyebrow">audit feed</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">Latest writes.</h3>
                    </div>
                    <span className="mono text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                      {data.auditLogs.length} rows
                    </span>
                  </div>

                  <div className="mt-4 max-h-[38rem] overflow-y-auto rounded-[0.95rem] border border-white/8">
                    {data.auditLogs.length ? (
                      <div className="divide-y divide-white/8">
                        {data.auditLogs.map((entry) => {
                          const detailLines = formatAuditDetail(entry.detail)
                          return (
                            <article key={entry.auditId} className="bg-black/12 px-3.5 py-3">
                              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-white">{actionLabel(entry.actionKey)}</p>
                                  <p className="mono mt-1 truncate text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                                    {entry.actorEmail} - {entry.entityType} - {entry.entityId}
                                  </p>
                                  {detailLines.length ? (
                                    <ul className="mono mt-1.5 grid gap-0.5 text-[11px] text-[var(--color-muted)]">
                                      {detailLines.map((line, index) => (
                                        <li key={index} className="break-words">
                                          {line}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : null}
                                </div>
                                <span className="text-xs text-[var(--color-muted)]">{formatDateTime(entry.createdAt)}</span>
                              </div>
                            </article>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="bg-black/12 p-5">
                      <EmptyState title="No audit rows yet" body="Audited admin and participant writes will appear here once they occur." />
                    </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
