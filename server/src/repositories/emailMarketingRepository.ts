import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import type {
  EmailCampaignAudienceStatus,
  EmailCampaignAudienceLeague,
  EmailCampaignDispatchSummary,
  EmailCampaignInput,
  EmailCampaignKind,
  EmailCampaignRecord,
  EmailCampaignRecipient,
  EmailCampaignStatus,
  EmailCampaignTrigger,
  EmailRecipientStatus,
  ParticipantProfile,
  SupportedLocale,
} from '../domain/types.js'
import { env } from '../config/env.js'
import { defaultLocale, supportedLocales } from '../data/worldCupSeed.js'
import { sendAppMail } from '../lib/mailer.js'

const newsletterInputStatuses: EmailCampaignStatus[] = ['draft', 'scheduled']
const autoresponderInputStatuses: EmailCampaignStatus[] = ['draft', 'active', 'paused']
const smtpMaxPerMinute = 95
const smtpMaxPerTenMinutes = 1_000

interface EmailRecipientSeed {
  participantId?: string
  email: string
  displayName: string
  leagueType?: 'rookie' | 'veteran'
  primaryTeamCode?: string
  secondaryTeamCode?: string
  referrerSoccerverseUsername?: string
  marketingUnsubscribeToken?: string
  browserLocale?: SupportedLocale
}

interface CampaignStats {
  previewRecipientCount: number
  queuedCount: number
  pendingCount: number
  sentCount: number
  failedCount: number
}

interface EmailCampaignRow {
  campaign_id: string
  kind: EmailCampaignKind
  status: EmailCampaignStatus
  trigger_key: EmailCampaignTrigger
  subject: string
  body_html: string
  subject_by_locale?: Partial<Record<SupportedLocale, string>> | null
  body_html_by_locale?: Partial<Record<SupportedLocale, string>> | null
  audience_status: EmailCampaignAudienceStatus
  audience_league: EmailCampaignAudienceLeague
  audience_team_code: string | null
  audience_referrer: string | null
  scheduled_at: Date | string | null
  delay_minutes: number
  batch_size: number
  requires_marketing_opt_in?: boolean
  created_by: string
  updated_by: string
  sent_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

interface EmailRecipientRow {
  recipient_id: string
  campaign_id: string
  participant_id: string | null
  email: string
  display_name: string
  league_type: 'rookie' | 'veteran' | null
  primary_team_code: string | null
  secondary_team_code: string | null
  referrer_soccerverse_username: string | null
  marketing_unsubscribe_token: string | null
  browser_locale?: SupportedLocale | null
  status: EmailRecipientStatus
  queued_at: Date | string
  sent_at: Date | string | null
  error: string | null
}

export interface EmailMarketingRepository {
  storageKind: 'memory' | 'postgres'
  listCampaigns(): Promise<EmailCampaignRecord[]>
  getCampaign(campaignId: string): Promise<EmailCampaignRecord | null>
  saveCampaign(input: EmailCampaignInput, actorEmail: string): Promise<EmailCampaignRecord>
  deleteCampaign(campaignId: string): Promise<boolean>
  listRecipients(campaignId: string): Promise<EmailCampaignRecipient[]>
  sendTestMail(input: EmailCampaignInput & { recipient: string }, actorEmail: string): Promise<void>
  sendNow(campaignId: string): Promise<EmailCampaignDispatchSummary>
  runDueCampaigns(limit?: number): Promise<EmailCampaignDispatchSummary[]>
  queueAutoresponders(triggerKey: EmailCampaignTrigger, participant: ParticipantProfile): Promise<EmailCampaignDispatchSummary[]>
}

function normalizeOptionalIso(value?: string) {
  const raw = value?.trim()
  if (!raw) {
    return undefined
  }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Scheduled date is invalid.')
  }
  return date.toISOString()
}

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return undefined
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString()
}

function requiredIso(value: Date | string) {
  return toIso(value) ?? new Date().toISOString()
}

function clampBatchSize(value?: number) {
  const batchSize = Number(value ?? 50)
  if (!Number.isFinite(batchSize)) {
    return 50
  }
  return Math.max(1, Math.min(500, Math.trunc(batchSize)))
}

function clampDelayMinutes(value?: number) {
  const delay = Number(value ?? 0)
  if (!Number.isFinite(delay)) {
    return 0
  }
  return Math.max(0, Math.min(60 * 24 * 30, Math.trunc(delay)))
}

function normalizeLocalizedTextMap(value?: Partial<Record<SupportedLocale, string>>) {
  const entries = Object.entries(value ?? {})
    .map(([locale, text]) => [locale.trim().toLowerCase(), text?.trim() ?? ''] as const)
    .filter(([locale, text]) => supportedLocales.includes(locale as SupportedLocale) && text)

  return Object.fromEntries(entries) as Partial<Record<SupportedLocale, string>>
}

function localizedText(
  fallback: string,
  localized: Partial<Record<SupportedLocale, string>> | undefined,
  locale?: SupportedLocale,
) {
  const resolvedLocale = locale && supportedLocales.includes(locale) ? locale : defaultLocale
  return localized?.[resolvedLocale] ?? localized?.[defaultLocale] ?? fallback
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function htmlFromEditorValue(value: string) {
  const trimmed = value.trim()
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed
  }

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function wrapMarketingHtml(content: string, unsubscribeUrl?: string) {
  const unsubscribeFooter = unsubscribeUrl
    ? `<p style="margin:18px 0 0;font-size:12px;color:#8fa39b;">You can unsubscribe from The Grand Tournament marketing emails here: <a href="${escapeHtml(
        unsubscribeUrl,
      )}" style="color:#22bd93;">unsubscribe</a></p>`
    : ''

  return `
    <div style="margin:0;padding:28px;background:#07100e;color:#f2efe7;font-family:Arial,sans-serif;line-height:1.55;">
      <div style="max-width:640px;margin:0 auto;border:1px solid rgba(242,239,231,0.16);border-radius:18px;padding:28px;background:#101815;">
        ${content}
        <p style="margin:28px 0 0;font-size:12px;color:#8fa39b;">The Grand Tournament</p>
        ${unsubscribeFooter}
      </div>
    </div>
  `
}

function normalizeInput(input: EmailCampaignInput) {
  const kind = input.kind
  if (kind !== 'newsletter' && kind !== 'autoresponder') {
    throw new Error('Campaign kind is invalid.')
  }

  const subject = input.subject.trim()
  const bodyHtml = input.bodyHtml.trim()
  if (!subject || !bodyHtml) {
    throw new Error('Subject and body are required.')
  }

  const scheduledAt = kind === 'newsletter' ? normalizeOptionalIso(input.scheduledAt) : undefined
  const triggerKey: EmailCampaignTrigger = kind === 'newsletter' ? 'manual' : input.triggerKey ?? 'registration_verified'
  const allowedStatuses = kind === 'newsletter' ? newsletterInputStatuses : autoresponderInputStatuses
  const fallbackStatus: EmailCampaignStatus = kind === 'newsletter' ? (scheduledAt ? 'scheduled' : 'draft') : 'draft'
  const requestedStatus = input.status ?? fallbackStatus
  const status = allowedStatuses.includes(requestedStatus) ? requestedStatus : fallbackStatus
  const subjectByLocale = normalizeLocalizedTextMap(input.subjectByLocale)
  const bodyHtmlByLocale = normalizeLocalizedTextMap(input.bodyHtmlByLocale)

  return {
    campaignId: input.campaignId?.trim() || undefined,
    kind,
    status,
    triggerKey,
    subject,
    bodyHtml,
    subjectByLocale: Object.keys(subjectByLocale).length ? subjectByLocale : undefined,
    bodyHtmlByLocale: Object.keys(bodyHtmlByLocale).length ? bodyHtmlByLocale : undefined,
    audienceStatus: input.audienceStatus ?? 'active',
    audienceLeague: input.audienceLeague ?? 'all',
    audienceTeamCode: input.audienceTeamCode?.trim().toUpperCase() || undefined,
    audienceReferrer: input.audienceReferrer?.trim() || undefined,
    scheduledAt,
    delayMinutes: kind === 'autoresponder' ? clampDelayMinutes(input.delayMinutes) : 0,
    batchSize: clampBatchSize(input.batchSize),
    requiresMarketingOptIn: input.requiresMarketingOptIn ?? true,
  }
}

function campaignAudienceMatchesParticipant(
  campaign: Pick<EmailCampaignRecord, 'audienceStatus' | 'audienceLeague' | 'audienceTeamCode' | 'audienceReferrer'>,
  participant: ParticipantProfile,
) {
  if (campaign.audienceStatus !== 'all' && participant.status !== campaign.audienceStatus) {
    return false
  }

  const audienceLeague = campaign.audienceLeague ?? 'all'
  if (audienceLeague !== 'all' && participant.leagueType !== audienceLeague) {
    return false
  }

  const audienceTeamCode = campaign.audienceTeamCode?.trim().toUpperCase()
  if (audienceTeamCode && participant.primaryTeamCode !== audienceTeamCode && participant.secondaryTeamCode !== audienceTeamCode) {
    return false
  }

  const audienceReferrer = campaign.audienceReferrer?.trim().toLowerCase()
  if (audienceReferrer && participant.referrerSoccerverseUsername?.trim().toLowerCase() !== audienceReferrer) {
    return false
  }

  return true
}

function campaignRowAudienceMatchesParticipant(campaign: EmailCampaignRow, participant: ParticipantProfile) {
  return campaignAudienceMatchesParticipant(
    {
      audienceStatus: campaign.audience_status,
      audienceLeague: campaign.audience_league ?? 'all',
      audienceTeamCode: campaign.audience_team_code ?? undefined,
      audienceReferrer: campaign.audience_referrer ?? undefined,
    },
    participant,
  )
}

function campaignConsentMatchesParticipant(
  campaign: Pick<EmailCampaignRecord, 'requiresMarketingOptIn'>,
  participant: ParticipantProfile,
) {
  // An explicit unsubscribe always excludes, even from transactional (no-opt-in) campaigns.
  // The never-opted-in gate applies only when the campaign requires marketing consent.
  return !participant.marketingUnsubscribedAt && (campaign.requiresMarketingOptIn === false || participant.marketingOptIn)
}

function campaignRowConsentMatchesParticipant(campaign: EmailCampaignRow, participant: ParticipantProfile) {
  return !participant.marketingUnsubscribedAt && (campaign.requires_marketing_opt_in === false || participant.marketingOptIn)
}

function applyPlaceholders(value: string, recipient: EmailRecipientSeed, unsubscribeUrl?: string) {
  const displayName = recipient.displayName.trim() || recipient.email
  const firstName = displayName.split(/\s+/)[0] || displayName
  const publicWebUrl = env.PUBLIC_WEB_URL.replace(/\/+$/, '')
  const replacements: Record<string, string> = {
    '{{first_name}}': firstName,
    '{{display_name}}': displayName,
    '{{email}}': recipient.email,
    '{{league_type}}': recipient.leagueType ?? '',
    '{{primary_team_code}}': recipient.primaryTeamCode ?? '',
    '{{secondary_team_code}}': recipient.secondaryTeamCode ?? '',
    '{{referrer_soccerverse_username}}': recipient.referrerSoccerverseUsername ?? '',
    '{{unsubscribe_url}}': unsubscribeUrl ?? '',
    '{{builder_url}}': `${publicWebUrl}/builder`,
    '{{prizes_url}}': `${publicWebUrl}/prizes`,
    '{{play_url}}': 'https://play.soccerverse.com/',
    '{{logo_url}}': `${publicWebUrl}/brand/logo-200.webp`,
    '{{public_web_url}}': publicWebUrl,
  }

  let result = value
  for (const [token, replacement] of Object.entries(replacements)) {
    result = result.replaceAll(token, replacement)
  }
  return result
}

function seedFromParticipant(participant: ParticipantProfile): EmailRecipientSeed {
  return {
    participantId: participant.participantId,
    email: participant.email,
    displayName: participant.displayName,
    leagueType: participant.leagueType,
    primaryTeamCode: participant.primaryTeamCode,
    secondaryTeamCode: participant.secondaryTeamCode,
    referrerSoccerverseUsername: participant.referrerSoccerverseUsername,
    marketingUnsubscribeToken: participant.marketingUnsubscribeToken,
    browserLocale: participant.browserLocale,
  }
}

function mapRecipientRow(row: EmailRecipientRow): EmailCampaignRecipient {
  return {
    recipientId: row.recipient_id,
    campaignId: row.campaign_id,
    participantId: row.participant_id ?? undefined,
    email: row.email,
    displayName: row.display_name,
    leagueType: row.league_type ?? undefined,
    primaryTeamCode: row.primary_team_code ?? undefined,
    secondaryTeamCode: row.secondary_team_code ?? undefined,
    referrerSoccerverseUsername: row.referrer_soccerverse_username ?? undefined,
    marketingUnsubscribeToken: row.marketing_unsubscribe_token ?? undefined,
    browserLocale: row.browser_locale ?? undefined,
    status: row.status,
    queuedAt: requiredIso(row.queued_at),
    sentAt: toIso(row.sent_at),
    error: row.error ?? undefined,
  }
}

function mapCampaignRow(row: EmailCampaignRow, stats: CampaignStats): EmailCampaignRecord {
  return {
    campaignId: row.campaign_id,
    kind: row.kind,
    status: row.status,
    triggerKey: row.trigger_key,
    subject: row.subject,
    bodyHtml: row.body_html,
    subjectByLocale: row.subject_by_locale ?? undefined,
    bodyHtmlByLocale: row.body_html_by_locale ?? undefined,
    audienceStatus: row.audience_status,
    audienceLeague: row.audience_league ?? 'all',
    audienceTeamCode: row.audience_team_code ?? undefined,
    audienceReferrer: row.audience_referrer ?? undefined,
    scheduledAt: toIso(row.scheduled_at),
    delayMinutes: row.delay_minutes,
    batchSize: row.batch_size,
    requiresMarketingOptIn: row.requires_marketing_opt_in ?? true,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    sentAt: toIso(row.sent_at),
    createdAt: requiredIso(row.created_at),
    updatedAt: requiredIso(row.updated_at),
    ...stats,
  }
}

async function sendCampaignMail(
  campaign: Pick<EmailCampaignRecord, 'subject' | 'bodyHtml' | 'subjectByLocale' | 'bodyHtmlByLocale'>,
  recipient: EmailRecipientSeed,
) {
  // Every campaign email — marketing or transactional — must carry an unsubscribe link
  // (SOP_email_marketing.md line 22). The token is always present (participants
  // .marketing_unsubscribe_token is NOT NULL), so this is unconditional.
  const unsubscribeUrl = recipient.marketingUnsubscribeToken
    ? `${env.PUBLIC_WEB_URL.replace(/\/+$/, '')}/api/public/email/unsubscribe?token=${encodeURIComponent(
        recipient.marketingUnsubscribeToken,
      )}`
    : undefined
  const subject = applyPlaceholders(
    localizedText(campaign.subject, campaign.subjectByLocale, recipient.browserLocale),
    recipient,
    unsubscribeUrl,
  )
  const body = htmlFromEditorValue(
    applyPlaceholders(localizedText(campaign.bodyHtml, campaign.bodyHtmlByLocale, recipient.browserLocale), recipient, unsubscribeUrl),
  )
  await sendAppMail({
    to: recipient.email,
    subject,
    html: wrapMarketingHtml(body, unsubscribeUrl),
    text: unsubscribeUrl ? `${stripHtml(body)}\n\nUnsubscribe: ${unsubscribeUrl}` : stripHtml(body),
    headers: unsubscribeUrl
      ? {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }
      : undefined,
  })
}

export class MemoryEmailMarketingRepository implements EmailMarketingRepository {
  storageKind: 'memory' = 'memory'
  private readonly campaigns = new Map<string, Omit<EmailCampaignRecord, keyof CampaignStats>>()
  private readonly recipients = new Map<string, EmailCampaignRecipient>()
  private readonly deliveryLog: number[] = []
  private processingCampaigns = false

  private campaignStats(campaignId: string): CampaignStats {
    const rows = [...this.recipients.values()].filter((recipient) => recipient.campaignId === campaignId)
    return {
      previewRecipientCount: 0,
      queuedCount: rows.length,
      pendingCount: rows.filter((row) => row.status === 'pending').length,
      sentCount: rows.filter((row) => row.status === 'sent').length,
      failedCount: rows.filter((row) => row.status === 'failed').length,
    }
  }

  async listCampaigns() {
    return [...this.campaigns.values()]
      .map((campaign) => ({ ...campaign, ...this.campaignStats(campaign.campaignId) }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }

  async getCampaign(campaignId: string) {
    const campaign = this.campaigns.get(campaignId)
    return campaign ? { ...campaign, ...this.campaignStats(campaignId) } : null
  }

  async saveCampaign(input: EmailCampaignInput, actorEmail: string) {
    const normalized = normalizeInput(input)
    const now = new Date().toISOString()
    const existing = normalized.campaignId ? this.campaigns.get(normalized.campaignId) : null
    const campaign = {
      campaignId: normalized.campaignId ?? randomUUID(),
      kind: normalized.kind,
      status: normalized.status,
      triggerKey: normalized.triggerKey,
      subject: normalized.subject,
      bodyHtml: normalized.bodyHtml,
      subjectByLocale: normalized.subjectByLocale,
      bodyHtmlByLocale: normalized.bodyHtmlByLocale,
      audienceStatus: normalized.audienceStatus,
      audienceLeague: normalized.audienceLeague,
      audienceTeamCode: normalized.audienceTeamCode,
      audienceReferrer: normalized.audienceReferrer,
      scheduledAt: normalized.scheduledAt,
      delayMinutes: normalized.delayMinutes,
      batchSize: normalized.batchSize,
      requiresMarketingOptIn: normalized.requiresMarketingOptIn,
      createdBy: existing?.createdBy ?? actorEmail,
      updatedBy: actorEmail,
      sentAt: existing?.sentAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    this.campaigns.set(campaign.campaignId, campaign)
    return { ...campaign, ...this.campaignStats(campaign.campaignId) }
  }

  async deleteCampaign(campaignId: string) {
    const deleted = this.campaigns.delete(campaignId)
    for (const [recipientId, recipient] of this.recipients.entries()) {
      if (recipient.campaignId === campaignId) {
        this.recipients.delete(recipientId)
      }
    }
    return deleted
  }

  async listRecipients(campaignId: string) {
    return [...this.recipients.values()]
      .filter((recipient) => recipient.campaignId === campaignId)
      .sort((left, right) => right.queuedAt.localeCompare(left.queuedAt))
  }

  async sendTestMail(input: EmailCampaignInput & { recipient: string }, actorEmail: string) {
    const normalized = normalizeInput(input)
    await sendCampaignMail(
      { subject: `[TEST] ${normalized.subject}`, bodyHtml: normalized.bodyHtml },
      { email: input.recipient, displayName: actorEmail },
    )
  }

  async sendNow(campaignId: string) {
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found.')
    }
    return this.processCampaign(campaign, true)
  }

  async runDueCampaigns(limit = 10) {
    const now = Date.now()
    const dueCampaigns = (await this.listCampaigns())
      .filter((campaign) => {
        if (campaign.kind === 'newsletter') {
          return campaign.status === 'scheduled' && campaign.scheduledAt && new Date(campaign.scheduledAt).getTime() <= now
        }
        return campaign.status === 'active' && campaign.pendingCount > 0
      })
      .slice(0, limit)

    const summaries: EmailCampaignDispatchSummary[] = []
    for (const campaign of dueCampaigns) {
      summaries.push(await this.processCampaign(campaign, false))
    }
    return summaries
  }

  async queueAutoresponders(triggerKey: EmailCampaignTrigger, participant: ParticipantProfile) {
    const matching = (await this.listCampaigns()).filter(
      (campaign) =>
        campaign.kind === 'autoresponder' &&
        campaign.status === 'active' &&
        campaign.triggerKey === triggerKey &&
        campaignConsentMatchesParticipant(campaign, participant) &&
        campaignAudienceMatchesParticipant(campaign, participant),
    )
    const summaries: EmailCampaignDispatchSummary[] = []
    for (const campaign of matching) {
      const queuedAt = new Date(Date.now() + campaign.delayMinutes * 60 * 1000).toISOString()
      const existing = [...this.recipients.values()].find(
        (recipient) => recipient.campaignId === campaign.campaignId && recipient.email === participant.email,
      )
      if (!existing) {
        this.recipients.set(randomUUID(), {
          recipientId: randomUUID(),
          campaignId: campaign.campaignId,
          participantId: participant.participantId,
          email: participant.email,
          displayName: participant.displayName,
          leagueType: participant.leagueType,
          primaryTeamCode: participant.primaryTeamCode,
          secondaryTeamCode: participant.secondaryTeamCode,
          referrerSoccerverseUsername: participant.referrerSoccerverseUsername,
          marketingUnsubscribeToken: participant.marketingUnsubscribeToken,
          browserLocale: participant.browserLocale,
          status: 'pending',
          queuedAt,
        })
      }
      if (new Date(queuedAt).getTime() <= Date.now()) {
        summaries.push(await this.processCampaign(campaign, false))
      }
    }
    return summaries
  }

  private async processCampaign(campaign: EmailCampaignRecord, sendAllNewsletterRecipients: boolean) {
    if (this.processingCampaigns) {
      const pending = this.campaignStats(campaign.campaignId).pendingCount
      return { campaignId: campaign.campaignId, sent: 0, failed: 0, skipped: 0, pending, status: campaign.status }
    }

    this.processingCampaigns = true
    const recipients = [...this.recipients.values()].filter((recipient) => {
      if (recipient.campaignId !== campaign.campaignId || recipient.status !== 'pending') {
        return false
      }
      return sendAllNewsletterRecipients || new Date(recipient.queuedAt).getTime() <= Date.now()
    })
    let sent = 0
    let failed = 0
    try {
      const availableQuota = this.availableSendQuota()
      for (const recipient of recipients.slice(0, Math.min(campaign.batchSize, availableQuota))) {
        try {
          await sendCampaignMail(campaign, recipient)
          recipient.status = 'sent'
          recipient.sentAt = new Date().toISOString()
          recipient.error = undefined
          this.recordAcceptedDelivery()
          sent += 1
        } catch (error) {
          recipient.status = 'failed'
          recipient.error = error instanceof Error ? error.message : 'Send failed.'
          failed += 1
        }
      }

      const pending = this.campaignStats(campaign.campaignId).pendingCount
      const status: EmailCampaignStatus = campaign.kind === 'newsletter' ? (pending > 0 ? 'sending' : 'sent') : 'active'
      const existing = this.campaigns.get(campaign.campaignId)
      if (existing) {
        this.campaigns.set(campaign.campaignId, {
          ...existing,
          status,
          sentAt: status === 'sent' ? new Date().toISOString() : existing.sentAt,
          updatedAt: new Date().toISOString(),
        })
      }
      return { campaignId: campaign.campaignId, sent, failed, skipped: 0, pending, status }
    } finally {
      this.processingCampaigns = false
    }
  }

  private availableSendQuota() {
    const now = Date.now()
    const tenMinutesAgo = now - 10 * 60 * 1000
    const oneMinuteAgo = now - 60 * 1000
    while (this.deliveryLog.length && this.deliveryLog[0] < tenMinutesAgo) {
      this.deliveryLog.shift()
    }

    const sentLastTenMinutes = this.deliveryLog.length
    const sentLastMinute = this.deliveryLog.filter((sentAt) => sentAt >= oneMinuteAgo).length
    return Math.max(0, Math.min(smtpMaxPerTenMinutes - sentLastTenMinutes, smtpMaxPerMinute - sentLastMinute))
  }

  private recordAcceptedDelivery() {
    this.deliveryLog.push(Date.now())
  }
}

export class PostgresEmailMarketingRepository implements EmailMarketingRepository {
  storageKind: 'postgres' = 'postgres'
  private processingCampaigns = false

  constructor(private readonly pool: Pool) {}

  async listCampaigns() {
    const result = await this.pool.query<EmailCampaignRow>('SELECT * FROM email_campaigns ORDER BY updated_at DESC')
    const campaigns: EmailCampaignRecord[] = []
    for (const row of result.rows) {
      campaigns.push(mapCampaignRow(row, await this.getCampaignStats(row)))
    }
    return campaigns
  }

  async getCampaign(campaignId: string) {
    const result = await this.pool.query<EmailCampaignRow>('SELECT * FROM email_campaigns WHERE campaign_id = $1', [
      campaignId,
    ])
    const row = result.rows[0]
    return row ? mapCampaignRow(row, await this.getCampaignStats(row)) : null
  }

  async saveCampaign(input: EmailCampaignInput, actorEmail: string) {
    const normalized = normalizeInput(input)

    if (normalized.campaignId) {
      const result = await this.pool.query<EmailCampaignRow>(
        `
          UPDATE email_campaigns
          SET kind = $2,
              status = $3,
              trigger_key = $4,
              subject = $5,
              body_html = $6,
              subject_by_locale = $7,
              body_html_by_locale = $8,
              audience_status = $9,
              audience_league = $10,
              audience_team_code = $11,
              audience_referrer = $12,
              scheduled_at = $13,
              delay_minutes = $14,
              batch_size = $15,
              requires_marketing_opt_in = $16,
              updated_by = $17,
              updated_at = NOW()
          WHERE campaign_id = $1
          RETURNING *
        `,
        [
          normalized.campaignId,
          normalized.kind,
          normalized.status,
          normalized.triggerKey,
          normalized.subject,
          normalized.bodyHtml,
          normalized.subjectByLocale ?? null,
          normalized.bodyHtmlByLocale ?? null,
          normalized.audienceStatus,
          normalized.audienceLeague,
          normalized.audienceTeamCode ?? null,
          normalized.audienceReferrer ?? null,
          normalized.scheduledAt ?? null,
          normalized.delayMinutes,
          normalized.batchSize,
          normalized.requiresMarketingOptIn,
          actorEmail,
        ],
      )
      const row = result.rows[0]
      if (!row) {
        throw new Error('Campaign not found.')
      }
      return mapCampaignRow(row, await this.getCampaignStats(row))
    }

    const result = await this.pool.query<EmailCampaignRow>(
      `
        INSERT INTO email_campaigns (
          kind,
          status,
          trigger_key,
          subject,
          body_html,
          subject_by_locale,
          body_html_by_locale,
          audience_status,
          audience_league,
          audience_team_code,
          audience_referrer,
          scheduled_at,
          delay_minutes,
          batch_size,
          requires_marketing_opt_in,
          created_by,
          updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
        RETURNING *
      `,
      [
        normalized.kind,
        normalized.status,
        normalized.triggerKey,
        normalized.subject,
        normalized.bodyHtml,
        normalized.subjectByLocale ?? null,
        normalized.bodyHtmlByLocale ?? null,
        normalized.audienceStatus,
        normalized.audienceLeague,
        normalized.audienceTeamCode ?? null,
        normalized.audienceReferrer ?? null,
        normalized.scheduledAt ?? null,
        normalized.delayMinutes,
        normalized.batchSize,
        normalized.requiresMarketingOptIn,
        actorEmail,
      ],
    )
    const row = result.rows[0]
    return mapCampaignRow(row, await this.getCampaignStats(row))
  }

  async deleteCampaign(campaignId: string) {
    const result = await this.pool.query('DELETE FROM email_campaigns WHERE campaign_id = $1', [campaignId])
    return (result.rowCount ?? 0) > 0
  }

  async listRecipients(campaignId: string) {
    const result = await this.pool.query<EmailRecipientRow>(
      `
        SELECT *
        FROM email_campaign_recipients
        WHERE campaign_id = $1
        ORDER BY queued_at DESC, created_at DESC
        LIMIT 500
      `,
      [campaignId],
    )
    return result.rows.map(mapRecipientRow)
  }

  async sendTestMail(input: EmailCampaignInput & { recipient: string }, actorEmail: string) {
    const normalized = normalizeInput(input)
    await sendCampaignMail(
      { subject: `[TEST] ${normalized.subject}`, bodyHtml: normalized.bodyHtml },
      { email: input.recipient, displayName: actorEmail },
    )
  }

  async sendNow(campaignId: string) {
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found.')
    }

    if (campaign.kind === 'newsletter') {
      await this.prepareNewsletterRecipients(campaign, new Date().toISOString())
    }
    await this.updateCampaignStatus(campaignId, 'sending')
    return await this.processCampaign(campaignId)
  }

  async runDueCampaigns(limit = 10) {
    const dueNewsletterResult = await this.pool.query<{ campaign_id: string }>(
      `
        SELECT campaign_id
        FROM email_campaigns
        WHERE kind = 'newsletter'
          AND status = 'scheduled'
          AND scheduled_at IS NOT NULL
          AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC
        LIMIT $1
      `,
      [limit],
    )

    const ids = new Set<string>()
    for (const row of dueNewsletterResult.rows) {
      const campaign = await this.getCampaign(row.campaign_id)
      if (campaign) {
        await this.prepareNewsletterRecipients(campaign, new Date().toISOString())
        await this.updateCampaignStatus(campaign.campaignId, 'sending')
        ids.add(campaign.campaignId)
      }
    }

    const dueRecipientResult = await this.pool.query<{ campaign_id: string }>(
      `
        SELECT DISTINCT c.campaign_id
        FROM email_campaigns c
        JOIN email_campaign_recipients r ON r.campaign_id = c.campaign_id
        WHERE r.status = 'pending'
          AND r.queued_at <= NOW()
          AND c.status IN ('active', 'scheduled', 'sending')
        ORDER BY c.campaign_id
        LIMIT $1
      `,
      [limit],
    )
    dueRecipientResult.rows.forEach((row) => ids.add(row.campaign_id))

    const summaries: EmailCampaignDispatchSummary[] = []
    for (const campaignId of [...ids].slice(0, limit)) {
      summaries.push(await this.processCampaign(campaignId))
    }
    return summaries
  }

  async queueAutoresponders(triggerKey: EmailCampaignTrigger, participant: ParticipantProfile) {
    if (triggerKey === 'manual') {
      return []
    }

    const campaigns = await this.pool.query<EmailCampaignRow>(
      `
        SELECT *
        FROM email_campaigns
        WHERE kind = 'autoresponder'
          AND status = 'active'
          AND trigger_key = $1
      `,
      [triggerKey],
    )

    const summaries: EmailCampaignDispatchSummary[] = []
    for (const row of campaigns.rows) {
      if (!campaignRowConsentMatchesParticipant(row, participant) || !campaignRowAudienceMatchesParticipant(row, participant)) {
        continue
      }

      const queuedAt = new Date(Date.now() + row.delay_minutes * 60 * 1000).toISOString()
      await this.insertRecipient(row.campaign_id, seedFromParticipant(participant), queuedAt)
      if (new Date(queuedAt).getTime() <= Date.now()) {
        summaries.push(await this.processCampaign(row.campaign_id))
      }
    }
    return summaries
  }

  private async getCampaignStats(campaign: EmailCampaignRow): Promise<CampaignStats> {
    const [previewResult, statsResult] = await Promise.all([
      this.pool.query<{ count: string }>(
        `
          SELECT COUNT(*)::int AS count
          FROM participants
          WHERE email IS NOT NULL
            AND email <> ''
            AND marketing_unsubscribed_at IS NULL
            AND ($5::boolean = FALSE OR marketing_opt_in = TRUE)
            AND ($1 = 'all' OR status = $1)
            AND ($2 = 'all' OR league_type = $2)
            AND ($3::text IS NULL OR primary_team_code = $3 OR secondary_team_code = $3)
            AND ($4::text IS NULL OR LOWER(referrer_soccerverse_username) = LOWER($4))
        `,
        [
          campaign.audience_status,
          campaign.audience_league ?? 'all',
          campaign.audience_team_code,
          campaign.audience_referrer,
          campaign.requires_marketing_opt_in ?? true,
        ],
      ),
      this.pool.query<{
        queued_count: string
        pending_count: string
        sent_count: string
        failed_count: string
      }>(
        `
          SELECT
            COUNT(*)::int AS queued_count,
            COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
            COUNT(*) FILTER (WHERE status = 'sent')::int AS sent_count,
            COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count
          FROM email_campaign_recipients
          WHERE campaign_id = $1
        `,
        [campaign.campaign_id],
      ),
    ])

    const stats = statsResult.rows[0]
    return {
      previewRecipientCount: Number(previewResult.rows[0]?.count ?? 0),
      queuedCount: Number(stats?.queued_count ?? 0),
      pendingCount: Number(stats?.pending_count ?? 0),
      sentCount: Number(stats?.sent_count ?? 0),
      failedCount: Number(stats?.failed_count ?? 0),
    }
  }

  private async prepareNewsletterRecipients(campaign: EmailCampaignRecord, queuedAt: string) {
    const result = await this.pool.query<{
      participant_id: string
      email: string
      display_name: string
      league_type: 'rookie' | 'veteran'
      primary_team_code: string
      secondary_team_code: string | null
      referrer_soccerverse_username: string | null
      marketing_unsubscribe_token: string | null
      browser_locale: SupportedLocale | null
    }>(
      `
        SELECT
          participant_id,
          email,
          display_name,
          league_type,
          primary_team_code,
          secondary_team_code,
          referrer_soccerverse_username,
          marketing_unsubscribe_token,
          browser_locale
        FROM participants
        WHERE email IS NOT NULL
          AND email <> ''
          AND marketing_unsubscribed_at IS NULL
          AND ($5::boolean = FALSE OR marketing_opt_in = TRUE)
          AND ($1 = 'all' OR status = $1)
          AND ($2 = 'all' OR league_type = $2)
          AND ($3::text IS NULL OR primary_team_code = $3 OR secondary_team_code = $3)
          AND ($4::text IS NULL OR LOWER(referrer_soccerverse_username) = LOWER($4))
        ORDER BY created_at ASC
      `,
      [
        campaign.audienceStatus,
        campaign.audienceLeague ?? 'all',
        campaign.audienceTeamCode ?? null,
        campaign.audienceReferrer ?? null,
        campaign.requiresMarketingOptIn ?? true,
      ],
    )

    for (const row of result.rows) {
      await this.insertRecipient(
        campaign.campaignId,
        {
          participantId: row.participant_id,
          email: row.email,
          displayName: row.display_name,
          leagueType: row.league_type,
          primaryTeamCode: row.primary_team_code,
          secondaryTeamCode: row.secondary_team_code ?? undefined,
          referrerSoccerverseUsername: row.referrer_soccerverse_username ?? undefined,
          marketingUnsubscribeToken: row.marketing_unsubscribe_token ?? undefined,
          browserLocale: row.browser_locale ?? undefined,
        },
        queuedAt,
      )
    }
  }

  private async insertRecipient(campaignId: string, recipient: EmailRecipientSeed, queuedAt: string) {
    await this.pool.query(
      `
        INSERT INTO email_campaign_recipients (
          campaign_id,
          participant_id,
          email,
          display_name,
          league_type,
          primary_team_code,
          secondary_team_code,
          referrer_soccerverse_username,
          marketing_unsubscribe_token,
          browser_locale,
          queued_at
        )
        VALUES ($1, $2, LOWER($3), $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (campaign_id, email)
        DO UPDATE SET
          participant_id = COALESCE(email_campaign_recipients.participant_id, EXCLUDED.participant_id),
          display_name = EXCLUDED.display_name,
          league_type = EXCLUDED.league_type,
          primary_team_code = EXCLUDED.primary_team_code,
          secondary_team_code = EXCLUDED.secondary_team_code,
          referrer_soccerverse_username = EXCLUDED.referrer_soccerverse_username,
          marketing_unsubscribe_token = EXCLUDED.marketing_unsubscribe_token,
          browser_locale = EXCLUDED.browser_locale,
          queued_at = CASE
            WHEN email_campaign_recipients.status = 'pending' THEN EXCLUDED.queued_at
            ELSE email_campaign_recipients.queued_at
          END
      `,
      [
        campaignId,
        recipient.participantId ?? null,
        recipient.email,
        recipient.displayName,
        recipient.leagueType ?? null,
        recipient.primaryTeamCode ?? null,
        recipient.secondaryTeamCode ?? null,
        recipient.referrerSoccerverseUsername ?? null,
        recipient.marketingUnsubscribeToken ?? null,
        recipient.browserLocale ?? null,
        queuedAt,
      ],
    )
  }

  private async processCampaign(campaignId: string) {
    if (this.processingCampaigns) {
      const pending = await this.countPending(campaignId)
      const campaign = await this.getCampaign(campaignId)
      return {
        campaignId,
        sent: 0,
        failed: 0,
        skipped: 0,
        pending,
        status: campaign?.status ?? 'sending',
      }
    }

    this.processingCampaigns = true
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) {
      this.processingCampaigns = false
      throw new Error('Campaign not found.')
    }

    try {
      const skipped = await this.skipUnsubscribedRecipients(campaignId, campaign.requiresMarketingOptIn ?? true)
      const availableQuota = await this.availableSendQuota()
      const recipientResult = await this.pool.query<EmailRecipientRow>(
        `
          SELECT *
          FROM email_campaign_recipients
          WHERE campaign_id = $1
            AND status = 'pending'
            AND queued_at <= NOW()
          ORDER BY queued_at ASC, created_at ASC
          LIMIT $2
        `,
        [campaignId, Math.min(campaign.batchSize, availableQuota)],
      )

      let sent = 0
      let failed = 0
      for (const row of recipientResult.rows) {
        const recipient = mapRecipientRow(row)
        try {
          await sendCampaignMail(campaign, recipient)
          await this.pool.query(
            `
              UPDATE email_campaign_recipients
              SET status = 'sent', sent_at = NOW(), error = NULL
              WHERE recipient_id = $1
            `,
            [recipient.recipientId],
          )
          await this.recordAcceptedDelivery()
          sent += 1
        } catch (error) {
          await this.pool.query(
            `
              UPDATE email_campaign_recipients
              SET status = 'failed', error = $2
              WHERE recipient_id = $1
            `,
            [recipient.recipientId, error instanceof Error ? error.message : 'Send failed.'],
          )
          failed += 1
        }
      }

      const pending = await this.countPending(campaignId)
      const nextStatus: EmailCampaignStatus = campaign.kind === 'newsletter' ? (pending > 0 ? 'sending' : 'sent') : 'active'
      await this.updateCampaignStatus(campaignId, nextStatus, nextStatus === 'sent')
      return {
        campaignId,
        sent,
        failed,
        skipped,
        pending,
        status: nextStatus,
      }
    } finally {
      this.processingCampaigns = false
    }
  }

  private async skipUnsubscribedRecipients(campaignId: string, requiresMarketingOptIn: boolean) {
    // Explicitly-unsubscribed recipients are skipped before dispatch for every campaign
    // (SOP_email_marketing.md line 22) — even transactional ones, and even if they unsubscribed
    // after being queued. The never-opted-in skip applies only when the campaign requires consent.
    const result = await this.pool.query(
      `
        UPDATE email_campaign_recipients r
        SET status = 'skipped',
            error = 'Recipient unsubscribed or has no active marketing consent.'
        FROM participants p
        WHERE r.participant_id = p.participant_id
          AND r.campaign_id = $1
          AND r.status = 'pending'
          AND (p.marketing_unsubscribed_at IS NOT NULL OR ($2::boolean = TRUE AND p.marketing_opt_in = FALSE))
      `,
      [campaignId, requiresMarketingOptIn],
    )
    return result.rowCount ?? 0
  }

  private async availableSendQuota() {
    const cleanupCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await this.pool.query('DELETE FROM email_delivery_log WHERE sent_at < $1', [cleanupCutoff])
    const result = await this.pool.query<{
      sent_last_minute: string
      sent_last_ten_minutes: string
    }>(
      `
        SELECT
          COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '1 minute')::int AS sent_last_minute,
          COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '10 minutes')::int AS sent_last_ten_minutes
        FROM email_delivery_log
      `,
    )
    const row = result.rows[0]
    const sentLastMinute = Number(row?.sent_last_minute ?? 0)
    const sentLastTenMinutes = Number(row?.sent_last_ten_minutes ?? 0)
    return Math.max(0, Math.min(smtpMaxPerMinute - sentLastMinute, smtpMaxPerTenMinutes - sentLastTenMinutes))
  }

  private async recordAcceptedDelivery() {
    await this.pool.query('INSERT INTO email_delivery_log DEFAULT VALUES')
  }

  private async countPending(campaignId: string) {
    const result = await this.pool.query<{ count: string }>(
      `
        SELECT COUNT(*)::int AS count
        FROM email_campaign_recipients
        WHERE campaign_id = $1
          AND status = 'pending'
      `,
      [campaignId],
    )
    return Number(result.rows[0]?.count ?? 0)
  }

  private async updateCampaignStatus(campaignId: string, status: EmailCampaignStatus, markSent = false) {
    await this.pool.query(
      `
        UPDATE email_campaigns
        SET status = $2,
            sent_at = CASE WHEN $3 THEN COALESCE(sent_at, NOW()) ELSE sent_at END,
            updated_at = NOW()
        WHERE campaign_id = $1
      `,
      [campaignId, status, markSent],
    )
  }
}
