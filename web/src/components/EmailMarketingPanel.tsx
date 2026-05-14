import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  deleteEmailCampaign,
  fetchEmailCampaignRecipients,
  fetchEmailCampaigns,
  runDueEmailCampaigns,
  saveEmailCampaign,
  sendEmailCampaignNow,
  sendEmailCampaignTest,
} from '../lib/api'
import type { EmailCampaignInput, EmailCampaignRecord, EmailCampaignRecipient } from '../lib/types'

interface EmailMarketingPanelProps {
  adminEmail: string
}

const emptyDraft: EmailCampaignInput = {
  kind: 'newsletter',
  status: 'draft',
  triggerKey: 'manual',
  subject: '',
  bodyHtml: '',
  audienceStatus: 'active',
  batchSize: 50,
  delayMinutes: 0,
}

function toLocalInputValue(value?: string) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function fromLocalInputValue(value: string) {
  return value ? new Date(value).toISOString() : undefined
}

function formatDate(value?: string) {
  if (!value) {
    return 'not set'
  }
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusTone(status: string) {
  if (status === 'sent' || status === 'active') {
    return 'border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
  }
  if (status === 'failed' || status === 'paused') {
    return 'border-amber-300/25 bg-amber-300/10 text-amber-200'
  }
  return 'border-white/10 bg-black/20 text-[var(--color-muted)]'
}

export function EmailMarketingPanel({ adminEmail }: EmailMarketingPanelProps) {
  const [campaigns, setCampaigns] = useState<EmailCampaignRecord[]>([])
  const [recipients, setRecipients] = useState<EmailCampaignRecipient[]>([])
  const [draft, setDraft] = useState<EmailCampaignInput>(emptyDraft)
  const [scheduledLocal, setScheduledLocal] = useState('')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [testRecipient, setTestRecipient] = useState(adminEmail)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.campaignId === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  )

  useEffect(() => {
    let isMounted = true

    void fetchEmailCampaigns()
      .then((response) => {
        if (!isMounted) {
          return
        }
        setCampaigns(response.campaigns)
        const firstCampaign = response.campaigns[0]
        if (firstCampaign) {
          setSelectedCampaignId(firstCampaign.campaignId)
          setDraft({
            campaignId: firstCampaign.campaignId,
            kind: firstCampaign.kind,
            status: firstCampaign.status === 'sent' || firstCampaign.status === 'sending' ? 'draft' : firstCampaign.status,
            triggerKey: firstCampaign.triggerKey,
            subject: firstCampaign.subject,
            bodyHtml: firstCampaign.bodyHtml,
            audienceStatus: firstCampaign.audienceStatus,
            scheduledAt: firstCampaign.scheduledAt,
            delayMinutes: firstCampaign.delayMinutes,
            batchSize: firstCampaign.batchSize,
          })
          setScheduledLocal(toLocalInputValue(firstCampaign.scheduledAt))
          void fetchEmailCampaignRecipients(firstCampaign.campaignId).then((recipientResponse) => {
            if (isMounted) {
              setRecipients(recipientResponse.recipients)
            }
          })
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load email campaigns.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setBusy(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  async function loadCampaigns() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetchEmailCampaigns()
      setCampaigns(response.campaigns)
      if (!selectedCampaignId && response.campaigns[0]) {
        selectCampaign(response.campaigns[0])
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load email campaigns.')
    } finally {
      setBusy(false)
    }
  }

  async function loadRecipients(campaignId: string) {
    try {
      const response = await fetchEmailCampaignRecipients(campaignId)
      setRecipients(response.recipients)
    } catch {
      setRecipients([])
    }
  }

  function selectCampaign(campaign: EmailCampaignRecord) {
    setSelectedCampaignId(campaign.campaignId)
    setDraft({
      campaignId: campaign.campaignId,
      kind: campaign.kind,
      status: campaign.status === 'sent' || campaign.status === 'sending' ? 'draft' : campaign.status,
      triggerKey: campaign.triggerKey,
      subject: campaign.subject,
      bodyHtml: campaign.bodyHtml,
      audienceStatus: campaign.audienceStatus,
      scheduledAt: campaign.scheduledAt,
      delayMinutes: campaign.delayMinutes,
      batchSize: campaign.batchSize,
    })
    setScheduledLocal(toLocalInputValue(campaign.scheduledAt))
    setMessage(null)
    setError(null)
    void loadRecipients(campaign.campaignId)
  }

  function startNew(kind: EmailCampaignInput['kind']) {
    setSelectedCampaignId(null)
    setRecipients([])
    setScheduledLocal('')
    setDraft({
      ...emptyDraft,
      kind,
      status: kind === 'autoresponder' ? 'draft' : 'draft',
      triggerKey: kind === 'autoresponder' ? 'registration_verified' : 'manual',
      audienceStatus: kind === 'autoresponder' ? 'all' : 'active',
    })
    setMessage(null)
    setError(null)
  }

  function buildPayload(): EmailCampaignInput {
    return {
      ...draft,
      triggerKey: draft.kind === 'newsletter' ? 'manual' : draft.triggerKey,
      scheduledAt: draft.kind === 'newsletter' ? fromLocalInputValue(scheduledLocal) : undefined,
      delayMinutes: draft.kind === 'autoresponder' ? Number(draft.delayMinutes ?? 0) : 0,
      batchSize: Number(draft.batchSize ?? 50),
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (draft.kind === 'newsletter' && draft.status === 'scheduled' && !scheduledLocal) {
      setError('Scheduled newsletters need a send date.')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await saveEmailCampaign(buildPayload())
      setMessage('Campaign saved.')
      setSelectedCampaignId(response.campaign.campaignId)
      setDraft((current) => ({ ...current, campaignId: response.campaign.campaignId }))
      const next = await fetchEmailCampaigns()
      setCampaigns(next.campaigns)
      await loadRecipients(response.campaign.campaignId)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save campaign.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSendNow() {
    if (!selectedCampaignId) {
      return
    }
    if (!window.confirm('Send this campaign now to the selected audience?')) {
      return
    }

    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await sendEmailCampaignNow(selectedCampaignId)
      setMessage(`Sent ${response.result.sent}, failed ${response.result.failed}, pending ${response.result.pending}.`)
      await loadCampaigns()
      await loadRecipients(selectedCampaignId)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send campaign.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRunDue() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await runDueEmailCampaigns()
      const sent = response.results.reduce((sum, item) => sum + item.sent, 0)
      const failed = response.results.reduce((sum, item) => sum + item.failed, 0)
      setMessage(`Processed ${response.results.length} campaigns. Sent ${sent}, failed ${failed}.`)
      await loadCampaigns()
      if (selectedCampaignId) {
        await loadRecipients(selectedCampaignId)
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Could not process due campaigns.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSendTest() {
    if (!testRecipient) {
      return
    }

    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await sendEmailCampaignTest(buildPayload(), testRecipient)
      setMessage(`Test email sent to ${testRecipient}.`)
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : 'Could not send test email.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!selectedCampaignId) {
      return
    }
    if (!window.confirm('Delete this draft or campaign?')) {
      return
    }

    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await deleteEmailCampaign(selectedCampaignId)
      setMessage('Campaign deleted.')
      startNew('newsletter')
      const response = await fetchEmailCampaigns()
      setCampaigns(response.campaigns)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete campaign.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow">email marketing</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Campaigns and autoresponders.</h3>
          <p className="mt-3 max-w-[72ch] text-sm leading-relaxed text-[var(--color-muted)]">
            Newsletter audiences only include active marketing opt-ins. SMTP delivery is processed sequentially with the All-Inkl quota guard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => startNew('newsletter')}
            className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            New newsletter
          </button>
          <button
            type="button"
            onClick={() => startNew('autoresponder')}
            className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            New autoresponder
          </button>
          <button
            type="button"
            onClick={() => void handleRunDue()}
            disabled={busy}
            className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
          >
            Run due
          </button>
        </div>
      </div>

      {message ? <div className="mt-5 rounded-[1rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 px-4 py-3 text-sm text-[var(--color-accent)]">{message}</div> : null}
      {error ? <div className="mt-5 rounded-[1rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">{error}</div> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-3">
          {busy && campaigns.length === 0 ? (
            <>
              <div className="skeleton h-20 rounded-[1.2rem]" />
              <div className="skeleton h-20 rounded-[1.2rem]" />
            </>
          ) : null}
          {campaigns.length === 0 && !busy ? (
            <div className="rounded-[1.2rem] border border-white/8 bg-black/15 p-4 text-sm text-[var(--color-muted)]">No campaigns yet.</div>
          ) : null}
          {campaigns.map((campaign) => (
            <button
              type="button"
              key={campaign.campaignId}
              onClick={() => selectCampaign(campaign)}
              className={[
                'w-full rounded-[1.2rem] border p-4 text-left transition hover:-translate-y-[1px] active:scale-[0.99]',
                campaign.campaignId === selectedCampaignId
                  ? 'border-[var(--color-accent)]/35 bg-[var(--color-accent)]/10'
                  : 'border-white/8 bg-black/15 hover:border-white/18 hover:bg-white/6',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{campaign.subject}</p>
                  <p className="mono mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    {campaign.kind} / {campaign.kind === 'newsletter' ? formatDate(campaign.scheduledAt) : campaign.triggerKey}
                  </p>
                </div>
                <span className={['mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]', statusTone(campaign.status)].join(' ')}>
                  {campaign.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1 overflow-hidden rounded-[0.9rem] border border-white/8 bg-black/18">
                {[
                  ['audience', campaign.previewRecipientCount],
                  ['queued', campaign.queuedCount],
                  ['sent', campaign.sentCount],
                  ['failed', campaign.failedCount],
                ].map(([label, value]) => (
                  <div key={label} className="px-3 py-2">
                    <p className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-muted)]">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="rounded-[1.2rem] border border-white/8 bg-black/12 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="grid gap-2">
              <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Type</span>
              <select
                value={draft.kind}
                onChange={(event) => {
                  const kind = event.target.value as EmailCampaignInput['kind']
                  setDraft((current) => ({
                    ...current,
                    kind,
                    status: kind === 'autoresponder' ? 'draft' : 'draft',
                    triggerKey: kind === 'autoresponder' ? 'registration_verified' : 'manual',
                    audienceStatus: kind === 'autoresponder' ? 'all' : current.audienceStatus,
                  }))
                }}
                className="h-11 rounded-[1rem] border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
              >
                <option value="newsletter">Newsletter</option>
                <option value="autoresponder">Autoresponder</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Status</span>
              <select
                value={draft.status}
                onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as EmailCampaignInput['status'] }))}
                className="h-11 rounded-[1rem] border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
              >
                {draft.kind === 'newsletter' ? (
                  <>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                  </>
                ) : (
                  <>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </>
                )}
              </select>
            </label>

            {draft.kind === 'newsletter' ? (
              <label className="grid gap-2 md:col-span-2">
                <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Scheduled at</span>
                <input
                  type="datetime-local"
                  value={scheduledLocal}
                  onChange={(event) => setScheduledLocal(event.target.value)}
                  className="h-11 rounded-[1rem] border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
                />
              </label>
            ) : (
              <>
                <label className="grid gap-2">
                  <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Trigger</span>
                  <select
                    value={draft.triggerKey}
                    onChange={(event) => setDraft((current) => ({ ...current, triggerKey: event.target.value as EmailCampaignInput['triggerKey'] }))}
                    className="h-11 rounded-[1rem] border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
                  >
                    <option value="registration_created">Registration created</option>
                    <option value="registration_verified">Registration verified</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Delay minutes</span>
                  <input
                    type="number"
                    min={0}
                    max={43_200}
                    value={draft.delayMinutes ?? 0}
                    onChange={(event) => setDraft((current) => ({ ...current, delayMinutes: Number(event.target.value) }))}
                    className="h-11 rounded-[1rem] border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
                  />
                </label>
              </>
            )}

            <label className="grid gap-2 md:col-span-2">
              <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Audience</span>
              <select
                value={draft.audienceStatus}
                onChange={(event) => setDraft((current) => ({ ...current, audienceStatus: event.target.value as EmailCampaignInput['audienceStatus'] }))}
                className="h-11 rounded-[1rem] border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
              >
                <option value="active">Verified participants</option>
                <option value="pending_verification">Pending verification</option>
                <option value="all">All participants</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Batch size</span>
              <input
                type="number"
                min={1}
                max={500}
                value={draft.batchSize ?? 50}
                onChange={(event) => setDraft((current) => ({ ...current, batchSize: Number(event.target.value) }))}
                className="h-11 rounded-[1rem] border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
              />
            </label>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
            Available placeholders: {'{{display_name}}'}, {'{{email}}'}, {'{{league_type}}'}, {'{{primary_team_code}}'},{' '}
            {'{{secondary_team_code}}'}, {'{{referrer_soccerverse_username}}'}, {'{{builder_url}}'}, {'{{unsubscribe_url}}'}.
          </p>

          <label className="mt-4 grid gap-2">
            <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Subject</span>
            <input
              required
              value={draft.subject}
              onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
              placeholder="Welcome to Soccerverse World Cup"
              className="h-11 rounded-[1rem] border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
            />
          </label>

          <label className="mt-4 grid gap-2">
            <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Body</span>
            <textarea
              required
              rows={10}
              value={draft.bodyHtml}
              onChange={(event) => setDraft((current) => ({ ...current, bodyHtml: event.target.value }))}
              placeholder="Hi {{display_name}}, ..."
              className="min-h-64 resize-y rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3 text-sm leading-relaxed text-white outline-none transition focus:border-[var(--color-accent)]"
            />
          </label>

          <div className="mt-4 rounded-[1rem] border border-white/8 bg-black/18 p-4">
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Preview</p>
            <p className="mt-3 text-sm font-semibold text-white">{draft.subject || 'Subject'}</p>
            <div className="mt-3 max-h-48 overflow-auto text-sm leading-relaxed text-[var(--color-muted)] whitespace-pre-wrap">
              {draft.bodyHtml || 'Body'}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              {busy ? 'Saving...' : 'Save campaign'}
            </button>
            <button
              type="button"
              onClick={() => void handleSendNow()}
              disabled={busy || !selectedCampaign || selectedCampaign.kind !== 'newsletter'}
              className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              Send now
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={busy || !selectedCampaignId}
              className="rounded-full border border-amber-300/20 px-5 py-2.5 text-sm font-semibold text-amber-100 transition hover:-translate-y-[1px] hover:bg-amber-300/8 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              Delete
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row">
            <input
              type="email"
              value={testRecipient}
              onChange={(event) => setTestRecipient(event.target.value)}
              placeholder="test@example.com"
              className="min-h-11 flex-1 rounded-[1rem] border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
            />
            <button
              type="button"
              onClick={() => void handleSendTest()}
              disabled={busy || !testRecipient}
              className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              Send test
            </button>
          </div>

          {recipients.length ? (
            <div className="mt-5 overflow-hidden rounded-[1rem] border border-white/8">
              {recipients.slice(0, 6).map((recipient) => (
                <div key={recipient.recipientId} className="grid gap-3 border-b border-white/8 bg-black/12 px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{recipient.displayName || recipient.email}</p>
                    <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{recipient.email}</p>
                    {recipient.error ? <p className="mt-1 text-xs text-amber-200">{recipient.error}</p> : null}
                  </div>
                  <span className={['mono h-fit rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]', statusTone(recipient.status)].join(' ')}>
                    {recipient.status}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </form>
      </div>
    </section>
  )
}
