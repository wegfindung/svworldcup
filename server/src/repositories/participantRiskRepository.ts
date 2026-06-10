import { randomUUID } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import type {
  ParticipantRiskCase,
  ParticipantRiskCaseMember,
  ParticipantRiskInquiryEmail,
  ParticipantRiskCaseStatus,
  ParticipantRiskSignalInput,
  ParticipantRiskSummary,
} from '../domain/types.js'

export interface ParticipantRiskRepository {
  storageKind: 'memory' | 'postgres'
  recordSignal(input: ParticipantRiskSignalInput): Promise<void>
  refreshCasesForParticipant(participantId: string): Promise<void>
  listCases(): Promise<ParticipantRiskCase[]>
  summarizeParticipants(participantIds: string[]): Promise<Record<string, ParticipantRiskSummary>>
  updateCaseStatus(caseId: string, status: ParticipantRiskCaseStatus, note?: string): Promise<ParticipantRiskCase | null>
  markInquiryEmailSent(participantId: string, actorEmail: string): Promise<ParticipantRiskInquiryEmail>
}

type StoredSignal = ParticipantRiskSignalInput & {
  signalId: string
  createdAt: string
}

function activeStatuses(status: ParticipantRiskCaseStatus) {
  return status === 'open' || status === 'reviewing'
}

function memberFromSignal(signal: StoredSignal, score: number, reasonKeys: string[]): ParticipantRiskCaseMember {
  return {
    participantId: signal.participant.participantId,
    email: signal.participant.email,
    displayName: signal.participant.displayName,
    leagueType: signal.participant.leagueType,
    status: signal.participant.status,
    primaryTeamCode: signal.participant.primaryTeamCode,
    secondaryTeamCode: signal.participant.secondaryTeamCode,
    memberScore: score,
    reasonKeys,
    lastSignalAt: signal.createdAt,
  }
}

function emptySummary(participantId: string): ParticipantRiskSummary {
  return {
    participantId,
    openCaseCount: 0,
    maxRiskScore: 0,
    caseIds: [],
  }
}

export class MemoryParticipantRiskRepository implements ParticipantRiskRepository {
  storageKind: 'memory' = 'memory'
  private readonly signals: StoredSignal[] = []
  private readonly cases = new Map<string, ParticipantRiskCase>()
  private readonly inquiries = new Map<string, ParticipantRiskInquiryEmail>()

  async recordSignal(input: ParticipantRiskSignalInput) {
    this.signals.push({
      ...input,
      signalId: randomUUID(),
      createdAt: new Date().toISOString(),
    })
  }

  async refreshCasesForParticipant(_participantId: string) {
    const latestSignals = new Map<string, StoredSignal>()
    for (const signal of this.signals) {
      latestSignals.set(signal.participant.participantId, signal)
    }

    const byCanonicalEmail = new Map<string, StoredSignal[]>()
    const byFingerprint = new Map<string, StoredSignal[]>()
    const recentRegistrations = this.signals.filter(
      (signal) => signal.eventType === 'registration' && Date.now() - new Date(signal.createdAt).getTime() <= 60 * 60 * 1000,
    )
    const recent24h = this.signals.filter((signal) => Date.now() - new Date(signal.createdAt).getTime() <= 24 * 60 * 60 * 1000)

    for (const signal of latestSignals.values()) {
      if (signal.emailCanonicalHash) {
        const group = byCanonicalEmail.get(signal.emailCanonicalHash) ?? []
        group.push(signal)
        byCanonicalEmail.set(signal.emailCanonicalHash, group)
      }
      if (signal.clientFingerprintHash) {
        const group = byFingerprint.get(signal.clientFingerprintHash) ?? []
        group.push(signal)
        byFingerprint.set(signal.clientFingerprintHash, group)
      }
      if (signal.emailIsDisposable) {
        this.upsertCase({
          caseKey: `disposable_email:${signal.participant.participantId}`,
          title: 'Disposable email domain',
          score: 45,
          reasonKeys: ['disposable_email_domain'],
          detail: { emailDomain: signal.emailDomain, eventType: signal.eventType },
          members: [memberFromSignal(signal, 45, ['disposable_email_domain'])],
        })
      }
      if (signal.emailMxStatus && signal.emailMxStatus !== 'valid') {
        this.upsertCase({
          caseKey: `email_mx_${signal.emailMxStatus}:${signal.participant.participantId}`,
          title: 'Email domain MX check warning',
          score: signal.emailMxStatus === 'missing' ? 35 : 20,
          reasonKeys: [`email_mx_${signal.emailMxStatus}`],
          detail: { emailDomain: signal.emailDomain, mxStatus: signal.emailMxStatus },
          members: [memberFromSignal(signal, signal.emailMxStatus === 'missing' ? 35 : 20, [`email_mx_${signal.emailMxStatus}`])],
        })
      }
      if (signal.clientFingerprint && signal.clientFingerprint.webdriver === true) {
        this.upsertCase({
          caseKey: `webdriver:${signal.participant.participantId}`,
          title: 'Browser automation indicator',
          score: 70,
          reasonKeys: ['webdriver_enabled'],
          detail: { eventType: signal.eventType },
          members: [memberFromSignal(signal, 70, ['webdriver_enabled'])],
        })
      }
    }

    for (const [hash, group] of byCanonicalEmail) {
      if (group.length > 1) {
        this.upsertCase({
          caseKey: `canonical_email:${hash}`,
          title: 'Canonical email collision',
          score: 85,
          reasonKeys: ['canonical_email_collision'],
          detail: { accountCount: group.length },
          members: group.map((signal) => memberFromSignal(signal, 85, ['canonical_email_collision'])),
        })
      }
    }

    for (const [hash, group] of byFingerprint) {
      if (group.length > 1) {
        const score = group.length >= 4 ? 60 : 35
        this.upsertCase({
          caseKey: `basic_fingerprint:${hash}`,
          title: 'Shared basic browser fingerprint',
          score,
          reasonKeys: ['basic_fingerprint_match'],
          detail: { accountCount: group.length },
          members: group.map((signal) => memberFromSignal(signal, score, ['basic_fingerprint_match'])),
        })
      }
    }

    this.upsertGroupedRecentCase(recentRegistrations, 'ipv4Cidr24Hash', 5, 65, 'Subnet /24 registration burst', 'subnet24_registration_burst')
    this.upsertGroupedRecentCase(recentRegistrations, 'ipv4Cidr26Hash', 3, 70, 'Subnet /26 registration burst', 'subnet26_registration_burst')
    this.upsertGroupedRecentCase(
      recent24h.filter((signal) => signal.ipv4Cidr24Hash && signal.userAgentHash),
      (signal) => `${signal.ipv4Cidr24Hash}:${signal.userAgentHash}`,
      3,
      72,
      'Shared subnet and browser signature',
      'subnet24_user_agent_cluster',
    )
  }

  async listCases() {
    return [...this.cases.values()].sort(
      (left, right) =>
        Number(activeStatuses(right.status)) - Number(activeStatuses(left.status)) ||
        right.score - left.score ||
        right.lastSeenAt.localeCompare(left.lastSeenAt),
    ).map((riskCase) => ({
      ...riskCase,
      members: riskCase.members.map((member) => this.attachInquiry(member)),
    }))
  }

  async summarizeParticipants(participantIds: string[]) {
    const summaries = Object.fromEntries(participantIds.map((participantId) => [participantId, emptySummary(participantId)]))
    for (const riskCase of this.cases.values()) {
      if (!activeStatuses(riskCase.status)) {
        continue
      }
      for (const member of riskCase.members) {
        const summary = summaries[member.participantId]
        if (!summary) {
          continue
        }
        summary.openCaseCount += 1
        summary.maxRiskScore = Math.max(summary.maxRiskScore, riskCase.score)
        summary.caseIds.push(riskCase.caseId)
      }
    }
    return summaries
  }

  async updateCaseStatus(caseId: string, status: ParticipantRiskCaseStatus) {
    const riskCase = [...this.cases.values()].find((item) => item.caseId === caseId)
    if (!riskCase) {
      return null
    }
    const updated = { ...riskCase, status, updatedAt: new Date().toISOString() }
    this.cases.set(updated.caseKey, updated)
    return {
      ...updated,
      members: updated.members.map((member) => this.attachInquiry(member)),
    }
  }

  async markInquiryEmailSent(participantId: string, actorEmail: string) {
    const now = new Date().toISOString()
    const existing = this.inquiries.get(participantId)
    const inquiry = {
      participantId,
      sentAt: now,
      sentBy: actorEmail,
      sentCount: (existing?.sentCount ?? 0) + 1,
    }
    this.inquiries.set(participantId, inquiry)
    return inquiry
  }

  private attachInquiry(member: ParticipantRiskCaseMember): ParticipantRiskCaseMember {
    const inquiry = this.inquiries.get(member.participantId)
    if (!inquiry) {
      return member
    }
    return {
      ...member,
      inquiryEmailSentAt: inquiry.sentAt,
      inquiryEmailSentBy: inquiry.sentBy,
      inquiryEmailSentCount: inquiry.sentCount,
    }
  }

  private upsertCase(input: {
    caseKey: string
    title: string
    score: number
    reasonKeys: string[]
    detail: Record<string, unknown>
    members: ParticipantRiskCaseMember[]
  }) {
    const now = new Date().toISOString()
    const existing = this.cases.get(input.caseKey)
    this.cases.set(input.caseKey, {
      caseId: existing?.caseId ?? randomUUID(),
      caseKey: input.caseKey,
      title: input.title,
      status: existing?.status ?? 'open',
      score: Math.max(existing?.score ?? 0, input.score),
      reasonKeys: input.reasonKeys,
      detail: input.detail,
      firstSeenAt: existing?.firstSeenAt ?? now,
      lastSeenAt: now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      members: input.members,
    })
  }

  private upsertGroupedRecentCase(
    signals: StoredSignal[],
    keyResolver: keyof StoredSignal | ((signal: StoredSignal) => string | undefined),
    threshold: number,
    score: number,
    title: string,
    reasonKey: string,
  ) {
    const groups = new Map<string, StoredSignal[]>()
    for (const signal of signals) {
      const key = typeof keyResolver === 'function' ? keyResolver(signal) : String(signal[keyResolver] ?? '')
      if (!key) {
        continue
      }
      const participantIds = new Set(groups.get(key)?.map((item) => item.participant.participantId) ?? [])
      if (participantIds.has(signal.participant.participantId)) {
        continue
      }
      const group = groups.get(key) ?? []
      group.push(signal)
      groups.set(key, group)
    }

    for (const [key, group] of groups) {
      if (group.length >= threshold) {
        this.upsertCase({
          caseKey: `${reasonKey}:${key}`,
          title,
          score,
          reasonKeys: [reasonKey],
          detail: { accountCount: group.length, threshold },
          members: group.map((signal) => memberFromSignal(signal, score, [reasonKey])),
        })
      }
    }
  }
}

interface CaseInput {
  caseKey: string
  title: string
  score: number
  reasonKeys: string[]
  detail: Record<string, unknown>
  members: ParticipantRiskCaseMember[]
}

interface CaseRow {
  case_id: string
  case_key: string
  title: string
  status: ParticipantRiskCaseStatus
  score: number
  reason_keys: string[]
  detail_json: Record<string, unknown>
  first_seen_at: string
  last_seen_at: string
  created_at: string
  updated_at: string
}

interface MemberRow {
  case_id?: string
  participant_id: string
  email: string
  display_name: string
  league_type: 'rookie' | 'veteran'
  status: 'pending_verification' | 'active' | 'locked' | 'withdrawn'
  primary_team_code: string
  secondary_team_code: string | null
  member_score: number
  reason_keys: string[]
  last_signal_at: string | null
  inquiry_email_sent_at?: string | null
  inquiry_email_sent_by?: string | null
  inquiry_email_sent_count?: number | null
}

interface InquiryEmailRow {
  participant_id: string
  sent_at: string
  sent_by: string
  sent_count: number
}

interface SignalRow {
  email_canonical_hash: string | null
  email_is_disposable: boolean | null
  email_mx_status: string | null
  email_domain: string | null
  ipv4_cidr24_hash: string | null
  ipv4_cidr26_hash: string | null
  user_agent_hash: string | null
  client_fingerprint_hash: string | null
  client_fingerprint_json: Record<string, unknown> | null
}

function mapCase(row: CaseRow, members: ParticipantRiskCaseMember[]): ParticipantRiskCase {
  return {
    caseId: row.case_id,
    caseKey: row.case_key,
    title: row.title,
    status: row.status,
    score: row.score,
    reasonKeys: row.reason_keys ?? [],
    detail: row.detail_json ?? {},
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    members,
  }
}

function mapMember(row: MemberRow): ParticipantRiskCaseMember {
  return {
    participantId: row.participant_id,
    email: row.email,
    displayName: row.display_name,
    leagueType: row.league_type,
    status: row.status,
    primaryTeamCode: row.primary_team_code,
    secondaryTeamCode: row.secondary_team_code ?? undefined,
    memberScore: row.member_score,
    reasonKeys: row.reason_keys ?? [],
    lastSignalAt: row.last_signal_at ?? undefined,
    inquiryEmailSentAt: row.inquiry_email_sent_at ?? undefined,
    inquiryEmailSentBy: row.inquiry_email_sent_by ?? undefined,
    inquiryEmailSentCount: row.inquiry_email_sent_count ?? undefined,
  }
}

export class PostgresParticipantRiskRepository implements ParticipantRiskRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(private readonly pool: Pool) {}

  async recordSignal(input: ParticipantRiskSignalInput) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `
          UPDATE participants
          SET email_canonical_hash = COALESCE($2, email_canonical_hash)
          WHERE participant_id = $1
        `,
        [input.participant.participantId, input.emailCanonicalHash ?? null],
      )
      await client.query(
        `
          INSERT INTO participant_risk_signals (
            participant_id,
            event_type,
            email_canonical_hash,
            email_domain,
            email_provider,
            email_is_disposable,
            email_mx_status,
            email_mx_host_count,
            ip_hash,
            ipv4_cidr24_hash,
            ipv4_cidr26_hash,
            ipv6_cidr64_hash,
            user_agent_hash,
            accept_language_hash,
            accept_language,
            client_fingerprint_hash,
            client_fingerprint_json
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `,
        [
          input.participant.participantId,
          input.eventType,
          input.emailCanonicalHash ?? null,
          input.emailDomain ?? null,
          input.emailProvider ?? null,
          input.emailIsDisposable ?? false,
          input.emailMxStatus ?? null,
          input.emailMxHostCount ?? null,
          input.ipHash ?? null,
          input.ipv4Cidr24Hash ?? null,
          input.ipv4Cidr26Hash ?? null,
          input.ipv6Cidr64Hash ?? null,
          input.userAgentHash ?? null,
          input.acceptLanguageHash ?? null,
          input.acceptLanguage ?? null,
          input.clientFingerprintHash ?? null,
          input.clientFingerprint ?? null,
        ],
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async refreshCasesForParticipant(participantId: string) {
    const latest = await this.latestSignal(participantId)
    if (!latest) {
      return
    }

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      if (latest.email_canonical_hash) {
        const members = await this.membersByCanonicalEmail(client, latest.email_canonical_hash)
        if (members.length > 1) {
          await this.upsertCase(client, {
            caseKey: `canonical_email:${latest.email_canonical_hash}`,
            title: 'Canonical email collision',
            score: 85,
            reasonKeys: ['canonical_email_collision'],
            detail: { accountCount: members.length },
            members: members.map((member) => ({ ...member, memberScore: 85, reasonKeys: ['canonical_email_collision'] })),
          })
        }
      }

      if (latest.email_is_disposable) {
        const members = await this.singleParticipantMembers(client, participantId, 45, ['disposable_email_domain'])
        await this.upsertCase(client, {
          caseKey: `disposable_email:${participantId}`,
          title: 'Disposable email domain',
          score: 45,
          reasonKeys: ['disposable_email_domain'],
          detail: { emailDomain: latest.email_domain },
          members,
        })
      }

      if (latest.email_mx_status && latest.email_mx_status !== 'valid') {
        const score = latest.email_mx_status === 'missing' ? 35 : 20
        const reasonKey = `email_mx_${latest.email_mx_status}`
        const members = await this.singleParticipantMembers(client, participantId, score, [reasonKey])
        await this.upsertCase(client, {
          caseKey: `${reasonKey}:${participantId}`,
          title: 'Email domain MX check warning',
          score,
          reasonKeys: [reasonKey],
          detail: { emailDomain: latest.email_domain, mxStatus: latest.email_mx_status },
          members,
        })
      }

      if (latest.client_fingerprint_json?.webdriver === true) {
        const members = await this.singleParticipantMembers(client, participantId, 70, ['webdriver_enabled'])
        await this.upsertCase(client, {
          caseKey: `webdriver:${participantId}`,
          title: 'Browser automation indicator',
          score: 70,
          reasonKeys: ['webdriver_enabled'],
          detail: {},
          members,
        })
      }

      if (latest.ipv4_cidr24_hash) {
        await this.refreshRecentGroupCase(client, {
          signalWhere: "event_type = 'registration' AND ipv4_cidr24_hash = $1 AND created_at >= NOW() - INTERVAL '1 hour'",
          params: [latest.ipv4_cidr24_hash],
          threshold: 5,
          score: 65,
          caseKey: `subnet24_registration_burst:${latest.ipv4_cidr24_hash}`,
          title: 'Subnet /24 registration burst',
          reasonKey: 'subnet24_registration_burst',
        })
      }

      if (latest.ipv4_cidr26_hash) {
        await this.refreshRecentGroupCase(client, {
          signalWhere: "event_type = 'registration' AND ipv4_cidr26_hash = $1 AND created_at >= NOW() - INTERVAL '1 hour'",
          params: [latest.ipv4_cidr26_hash],
          threshold: 3,
          score: 70,
          caseKey: `subnet26_registration_burst:${latest.ipv4_cidr26_hash}`,
          title: 'Subnet /26 registration burst',
          reasonKey: 'subnet26_registration_burst',
        })
      }

      if (latest.ipv4_cidr24_hash && latest.user_agent_hash) {
        await this.refreshRecentGroupCase(client, {
          signalWhere: "ipv4_cidr24_hash = $1 AND user_agent_hash = $2 AND created_at >= NOW() - INTERVAL '24 hours'",
          params: [latest.ipv4_cidr24_hash, latest.user_agent_hash],
          threshold: 3,
          score: 72,
          caseKey: `subnet24_user_agent_cluster:${latest.ipv4_cidr24_hash}:${latest.user_agent_hash}`,
          title: 'Shared subnet and browser signature',
          reasonKey: 'subnet24_user_agent_cluster',
        })
      }

      if (latest.client_fingerprint_hash) {
        await this.refreshRecentGroupCase(client, {
          signalWhere: "client_fingerprint_hash = $1 AND created_at >= NOW() - INTERVAL '24 hours'",
          params: [latest.client_fingerprint_hash],
          threshold: 2,
          score: 35,
          caseKey: `basic_fingerprint:${latest.client_fingerprint_hash}`,
          title: 'Shared basic browser fingerprint',
          reasonKey: 'basic_fingerprint_match',
        })
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async listCases() {
    const cases = await this.pool.query<CaseRow>(
      `
        SELECT case_id, case_key, title, status, score, reason_keys, detail_json, first_seen_at, last_seen_at, created_at, updated_at
        FROM participant_risk_cases
        ORDER BY
          CASE WHEN status IN ('open', 'reviewing') THEN 0 ELSE 1 END,
          score DESC,
          last_seen_at DESC
      `,
    )
    if (!cases.rows.length) {
      return []
    }

    const members = await this.pool.query<MemberRow>(
      `
        SELECT
          m.case_id,
          p.participant_id,
          p.email,
          p.display_name,
          p.league_type,
          p.status,
          p.primary_team_code,
          p.secondary_team_code,
          m.member_score,
          m.reason_keys,
          m.last_signal_at,
          i.last_sent_at AS inquiry_email_sent_at,
          i.last_sent_by AS inquiry_email_sent_by,
          i.sent_count AS inquiry_email_sent_count
        FROM participant_risk_case_members m
        JOIN participants p ON p.participant_id = m.participant_id
        LEFT JOIN participant_risk_inquiry_emails i ON i.participant_id = p.participant_id
        WHERE m.case_id = ANY($1::uuid[])
        ORDER BY m.member_score DESC, p.created_at ASC
      `,
      [cases.rows.map((row) => row.case_id)],
    )
    const membersByCase = new Map<string, ParticipantRiskCaseMember[]>()
    for (const member of members.rows) {
      const group = membersByCase.get(member.case_id ?? '') ?? []
      group.push(mapMember(member))
      membersByCase.set(member.case_id ?? '', group)
    }

    return cases.rows.map((row) => mapCase(row, membersByCase.get(row.case_id) ?? []))
  }

  async summarizeParticipants(participantIds: string[]) {
    const summaries = Object.fromEntries(participantIds.map((participantId) => [participantId, emptySummary(participantId)]))
    if (!participantIds.length) {
      return summaries
    }

    const result = await this.pool.query<{
      participant_id: string
      open_case_count: string
      max_risk_score: number | null
      case_ids: string[] | null
    }>(
      `
        SELECT
          m.participant_id,
          COUNT(*)::text AS open_case_count,
          MAX(c.score)::int AS max_risk_score,
          ARRAY_AGG(c.case_id::text ORDER BY c.score DESC, c.last_seen_at DESC) AS case_ids
        FROM participant_risk_case_members m
        JOIN participant_risk_cases c ON c.case_id = m.case_id
        WHERE m.participant_id = ANY($1::uuid[])
          AND c.status IN ('open', 'reviewing')
        GROUP BY m.participant_id
      `,
      [participantIds],
    )

    for (const row of result.rows) {
      summaries[row.participant_id] = {
        participantId: row.participant_id,
        openCaseCount: Number(row.open_case_count),
        maxRiskScore: row.max_risk_score ?? 0,
        caseIds: row.case_ids ?? [],
      }
    }

    return summaries
  }

  async updateCaseStatus(caseId: string, status: ParticipantRiskCaseStatus, note?: string) {
    const result = await this.pool.query<CaseRow>(
      `
        UPDATE participant_risk_cases
        SET status = $2,
            review_note = COALESCE($3, review_note),
            updated_at = NOW()
        WHERE case_id = $1
        RETURNING case_id, case_key, title, status, score, reason_keys, detail_json, first_seen_at, last_seen_at, created_at, updated_at
      `,
      [caseId, status, note ?? null],
    )
    const row = result.rows[0]
    if (!row) {
      return null
    }
    const members = await this.pool.query<MemberRow>(
      `
        SELECT
          p.participant_id, p.email, p.display_name, p.league_type, p.status, p.primary_team_code,
          p.secondary_team_code, m.member_score, m.reason_keys, m.last_signal_at,
          i.last_sent_at AS inquiry_email_sent_at,
          i.last_sent_by AS inquiry_email_sent_by,
          i.sent_count AS inquiry_email_sent_count
        FROM participant_risk_case_members m
        JOIN participants p ON p.participant_id = m.participant_id
        LEFT JOIN participant_risk_inquiry_emails i ON i.participant_id = p.participant_id
        WHERE m.case_id = $1
        ORDER BY m.member_score DESC, p.created_at ASC
      `,
      [caseId],
    )
    return mapCase(row, members.rows.map(mapMember))
  }

  async markInquiryEmailSent(participantId: string, actorEmail: string) {
    const result = await this.pool.query<InquiryEmailRow>(
      `
        INSERT INTO participant_risk_inquiry_emails (participant_id, first_sent_by, last_sent_by)
        VALUES ($1, $2, $2)
        ON CONFLICT (participant_id)
        DO UPDATE SET
          last_sent_at = NOW(),
          last_sent_by = EXCLUDED.last_sent_by,
          sent_count = participant_risk_inquiry_emails.sent_count + 1
        RETURNING participant_id, last_sent_at AS sent_at, last_sent_by AS sent_by, sent_count
      `,
      [participantId, actorEmail],
    )
    const row = result.rows[0]
    return {
      participantId: row.participant_id,
      sentAt: row.sent_at,
      sentBy: row.sent_by,
      sentCount: row.sent_count,
    }
  }

  private async latestSignal(participantId: string) {
    const result = await this.pool.query<SignalRow>(
      `
        SELECT
          email_canonical_hash,
          email_is_disposable,
          email_mx_status,
          email_domain,
          ipv4_cidr24_hash,
          ipv4_cidr26_hash,
          user_agent_hash,
          client_fingerprint_hash,
          client_fingerprint_json
        FROM participant_risk_signals
        WHERE participant_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [participantId],
    )
    return result.rows[0] ?? null
  }

  private async membersByCanonicalEmail(client: PoolClient, emailCanonicalHash: string) {
    const result = await client.query<MemberRow>(
      `
        SELECT
          p.participant_id,
          p.email,
          p.display_name,
          p.league_type,
          p.status,
          p.primary_team_code,
          p.secondary_team_code,
          85 AS member_score,
          ARRAY['canonical_email_collision']::text[] AS reason_keys,
          MAX(s.created_at) AS last_signal_at
        FROM participants p
        LEFT JOIN participant_risk_signals s ON s.participant_id = p.participant_id
        WHERE p.email_canonical_hash = $1
        GROUP BY p.participant_id
        ORDER BY p.created_at ASC
      `,
      [emailCanonicalHash],
    )
    return result.rows.map(mapMember)
  }

  private async singleParticipantMembers(client: PoolClient, participantId: string, score: number, reasonKeys: string[]) {
    const result = await client.query<MemberRow>(
      `
        SELECT
          p.participant_id,
          p.email,
          p.display_name,
          p.league_type,
          p.status,
          p.primary_team_code,
          p.secondary_team_code,
          $2::int AS member_score,
          $3::text[] AS reason_keys,
          MAX(s.created_at) AS last_signal_at
        FROM participants p
        LEFT JOIN participant_risk_signals s ON s.participant_id = p.participant_id
        WHERE p.participant_id = $1
        GROUP BY p.participant_id
      `,
      [participantId, score, reasonKeys],
    )
    return result.rows.map(mapMember)
  }

  private async refreshRecentGroupCase(
    client: PoolClient,
    input: {
      signalWhere: string
      params: string[]
      threshold: number
      score: number
      caseKey: string
      title: string
      reasonKey: string
    },
  ) {
    const result = await client.query<MemberRow>(
      `
        WITH candidate_signals AS (
          SELECT DISTINCT ON (participant_id) participant_id, created_at
          FROM participant_risk_signals
          WHERE ${input.signalWhere}
          ORDER BY participant_id, created_at DESC
        )
        SELECT
          p.participant_id,
          p.email,
          p.display_name,
          p.league_type,
          p.status,
          p.primary_team_code,
          p.secondary_team_code,
          $${input.params.length + 1}::int AS member_score,
          ARRAY[$${input.params.length + 2}]::text[] AS reason_keys,
          cs.created_at AS last_signal_at
        FROM candidate_signals cs
        JOIN participants p ON p.participant_id = cs.participant_id
        ORDER BY cs.created_at ASC
      `,
      [...input.params, input.score, input.reasonKey],
    )
    if (result.rows.length < input.threshold) {
      return
    }

    await this.upsertCase(client, {
      caseKey: input.caseKey,
      title: input.title,
      score: input.score,
      reasonKeys: [input.reasonKey],
      detail: {
        accountCount: result.rows.length,
        threshold: input.threshold,
      },
      members: result.rows.map(mapMember),
    })
  }

  private async upsertCase(client: PoolClient, input: CaseInput) {
    const result = await client.query<{ case_id: string }>(
      `
        INSERT INTO participant_risk_cases (case_key, title, score, reason_keys, detail_json, first_seen_at, last_seen_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (case_key)
        DO UPDATE SET
          title = EXCLUDED.title,
          score = GREATEST(participant_risk_cases.score, EXCLUDED.score),
          reason_keys = EXCLUDED.reason_keys,
          detail_json = EXCLUDED.detail_json,
          last_seen_at = NOW(),
          updated_at = NOW()
        RETURNING case_id
      `,
      [input.caseKey, input.title, input.score, input.reasonKeys, input.detail],
    )
    const caseId = result.rows[0].case_id
    await client.query('DELETE FROM participant_risk_case_members WHERE case_id = $1', [caseId])

    for (const member of input.members) {
      await client.query(
        `
          INSERT INTO participant_risk_case_members (case_id, participant_id, member_score, reason_keys, last_signal_at)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [caseId, member.participantId, member.memberScore, member.reasonKeys, member.lastSignalAt ?? null],
      )
    }
  }
}
