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

interface OperationsPayload {
  overview: AdminOverview
  auditLogs: AuditLogEntry[]
  batches: PendingMatchBatch[]
  campaigns: EmailCampaignRecord[]
  events: OperationEvent[]
}

type LoadState = 'loading' | 'ready' | 'error'

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
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [payload, setPayload] = useState<OperationsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadOperations() {
    setLoadState('loading')
    setError(null)

    try {
      const [overview, auditResponse, batchesResponse, campaignsResponse, eventsResponse] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminAuditLogs(60),
        fetchMatchImportBatches(),
        fetchEmailCampaigns(),
        fetchAdminOperationEvents(60),
      ])
      setPayload({
        overview,
        auditLogs: auditResponse.items,
        batches: batchesResponse.items,
        campaigns: campaignsResponse.campaigns,
        events: eventsResponse.items,
      })
      setLoadState('ready')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load operations data.')
      setLoadState('error')
    }
  }

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const [overview, auditResponse, batchesResponse, campaignsResponse, eventsResponse] = await Promise.all([
          fetchAdminOverview(),
          fetchAdminAuditLogs(60),
          fetchMatchImportBatches(),
          fetchEmailCampaigns(),
          fetchAdminOperationEvents(60),
        ])
        if (!active) {
          return
        }
        setPayload({
          overview,
          auditLogs: auditResponse.items,
          batches: batchesResponse.items,
          campaigns: campaignsResponse.campaigns,
          events: eventsResponse.items,
        })
        setLoadState('ready')
      } catch (loadError) {
        if (!active) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Could not load operations data.')
        setLoadState('error')
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const metrics = useMemo(() => {
    if (!payload) {
      return []
    }

    const filledPools = Object.values(payload.overview.teamSelectionCounts).filter((count) => count > 0).length
    const totalPools = Object.keys(payload.overview.teamSelectionCounts).length
    const pendingRecipients = payload.campaigns.reduce((sum, campaign) => sum + campaign.pendingCount, 0)
    const failedRecipients = payload.campaigns.reduce((sum, campaign) => sum + campaign.failedCount, 0)
    const pendingRows = payload.batches.reduce((sum, batch) => sum + batch.rows.length, 0)

    return [
      {
        label: 'Accounts',
        value: String(payload.overview.counts.active),
        detail: `${payload.overview.counts.pending} pending verification`,
      },
      {
        label: 'Team pools',
        value: `${filledPools}/${totalPools}`,
        detail: 'Curated pools with at least one player',
      },
      {
        label: 'Pending imports',
        value: String(payload.batches.length),
        detail: `${pendingRows} match-stat rows awaiting promotion`,
      },
      {
        label: 'Mail queue',
        value: String(pendingRecipients),
        detail: `${failedRecipients} failed recipients across campaigns`,
      },
    ]
  }, [payload])

  const eventCounts = useMemo(() => {
    const events = payload?.events ?? []
    return {
      emailScheduler: events.filter((event) => event.type === 'email_scheduler').length,
      soccerverseApi: events.filter((event) => event.type === 'soccerverse_api').length,
      warnings: events.filter((event) => event.status === 'warning').length,
      errors: events.filter((event) => event.status === 'error').length,
    }
  }, [payload])

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
            onClick={() => void loadOperations()}
            disabled={loadState === 'loading'}
            className="premium-button h-11 px-6 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadState === 'loading' ? 'Refreshing...' : 'Refresh operations'}
          </button>
        </div>
      </section>

      {loadState === 'loading' ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-32 rounded-[0.95rem]" />
          ))}
        </section>
      ) : null}

      {loadState === 'error' ? (
        <section className="glass-panel rounded-[1.15rem] p-5">
          <EmptyState title="Operations data unavailable" body={error ?? 'The backend returned an unexpected response.'} />
        </section>
      ) : null}

      {loadState === 'ready' && payload ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricTile key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-4">
              <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
                <p className="eyebrow">runtime gates</p>
                <div className="mt-4">
                  <StatusLine
                    label="Scoring configuration"
                    value={payload.overview.scoringLocked ? 'locked' : 'editable'}
                    tone={payload.overview.scoringLocked ? 'warning' : 'accent'}
                  />
                  <StatusLine
                    label="Global profile reveal"
                    value={payload.overview.eventControls.globalRevealProfiles ? 'on' : 'off'}
                    tone={payload.overview.eventControls.globalRevealProfiles ? 'accent' : 'default'}
                  />
                  <StatusLine
                    label="Global squad reveal"
                    value={payload.overview.eventControls.globalRevealSquads ? 'on' : 'off'}
                    tone={payload.overview.eventControls.globalRevealSquads ? 'accent' : 'default'}
                  />
                  <StatusLine
                    label="Soccerverse API error log"
                    value={`${eventCounts.soccerverseApi} events`}
                    tone={eventCounts.soccerverseApi > 0 ? 'warning' : 'accent'}
                  />
                </div>
              </div>

              <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
                <p className="eyebrow">email scheduler</p>
                <div className="mt-4">
                  <StatusLine label="Active autoresponders" value={String(countCampaigns(payload.campaigns, 'active'))} />
                  <StatusLine label="Scheduled newsletters" value={String(countCampaigns(payload.campaigns, 'scheduled'))} />
                  <StatusLine label="Sending campaigns" value={String(countCampaigns(payload.campaigns, 'sending'))} tone="accent" />
                  <StatusLine label="Scheduler runtime events" value={String(eventCounts.emailScheduler)} />
                  <StatusLine
                    label="Latest campaign update"
                    value={formatDateTime(payload.campaigns[0]?.updatedAt)}
                  />
                </div>
              </div>

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
                  {payload.events.length ? (
                    <div className="divide-y divide-white/8">
                      {payload.events.slice(0, 8).map((event) => (
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
            </div>

            <div className="space-y-4">
              <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">match imports</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">Pending review queue.</h3>
                  </div>
                  <span className="mono text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                    {payload.batches.length} batches
                  </span>
                </div>

                <div className="mt-4 overflow-hidden rounded-[0.95rem] border border-white/8">
                  {payload.batches.length ? (
                    <div className="divide-y divide-white/8">
                      {payload.batches.slice(0, 6).map((batch) => (
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

              <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">audit feed</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">Latest writes.</h3>
                  </div>
                  <span className="mono text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                    {payload.auditLogs.length} rows
                  </span>
                </div>

                <div className="mt-4 max-h-[38rem] overflow-y-auto rounded-[0.95rem] border border-white/8">
                  {payload.auditLogs.length ? (
                    <div className="divide-y divide-white/8">
                      {payload.auditLogs.map((entry) => (
                        <article key={entry.auditId} className="bg-black/12 px-3.5 py-3">
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{actionLabel(entry.actionKey)}</p>
                              <p className="mono mt-1 truncate text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                                {entry.actorEmail} - {entry.entityType} - {entry.entityId}
                              </p>
                            </div>
                            <span className="text-xs text-[var(--color-muted)]">{formatDateTime(entry.createdAt)}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-black/12 p-5">
                      <EmptyState title="No audit rows yet" body="Audited admin and participant writes will appear here once they occur." />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
