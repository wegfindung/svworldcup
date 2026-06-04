import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { verifyPassword } from '../lib/passwords.js'
import { hashToken } from '../lib/tokens.js'
import { isEmailLikeUsername } from '../lib/soccerverseUsername.js'
import type { LeaderboardCache } from './leaderboardCache.js'
import type {
  AdminParticipantRecord,
  LeagueType,
  NationParticipationRow,
  ParticipantProfile,
  ReferralAnalyticsRow,
  RegistrationCreationResult,
  RegistrationInput,
  RegistrationRecord,
  SupportedLocale,
} from '../domain/types.js'

export class ActiveRegistrationExistsError extends Error {
  constructor(message = 'Registration is already active for this email address.') {
    super(message)
    this.name = 'ActiveRegistrationExistsError'
  }
}

export type SoccerverseLinkFailureReason =
  | 'already_linked'
  | 'username_taken'
  | 'invalid_username'
  | 'not_found'
  | 'not_linked'

export class SoccerverseLinkError extends Error {
  constructor(public readonly reason: SoccerverseLinkFailureReason, message: string) {
    super(message)
    this.name = 'SoccerverseLinkError'
  }
}

export type LeagueChangeFailureReason = 'not_found' | 'invalid_league' | 'requires_soccerverse_username'

export class LeagueChangeError extends Error {
  constructor(public readonly reason: LeagueChangeFailureReason, message: string) {
    super(message)
    this.name = 'LeagueChangeError'
  }
}

export type NationUpdateFailureReason = 'not_found'

export class NationUpdateError extends Error {
  constructor(public readonly reason: NationUpdateFailureReason, message: string) {
    super(message)
    this.name = 'NationUpdateError'
  }
}

export interface RegistrationRepository {
  storageKind: 'memory' | 'postgres'
  createPending(input: RegistrationInput, plainToken: string): Promise<RegistrationCreationResult>
  verifyByPlainToken(plainToken: string): Promise<ParticipantProfile | null>
  resendVerification(email: string, plainToken: string): Promise<RegistrationCreationResult | null>
  authenticateWithPassword(email: string, password: string): Promise<ParticipantProfile | null>
  setPassword(participantId: string, passwordHash: string): Promise<ParticipantProfile | null>
  linkSoccerverseAccount(participantId: string, soccerverseUsername: string): Promise<ParticipantProfile>
  correctSoccerverseUsername(participantId: string, soccerverseUsername: string): Promise<ParticipantProfile>
  updateParticipantNations(
    participantId: string,
    primaryTeamCode: string,
    secondaryTeamCode: string | null,
  ): Promise<ParticipantProfile>
  setParticipantLeague(participantId: string, leagueType: LeagueType): Promise<ParticipantProfile>
  createPasswordReset(email: string, plainToken: string): Promise<ParticipantProfile | null>
  resetPasswordByPlainToken(plainToken: string, passwordHash: string): Promise<ParticipantProfile | null>
  getByParticipantId(participantId: string): Promise<ParticipantProfile | null>
  getByEmail(email: string): Promise<ParticipantProfile | null>
  revealParticipant(participantId: string, revealSquad: boolean): Promise<ParticipantProfile | null>
  getPublicProfileBySlug(slug: string): Promise<ParticipantProfile | null>
  getCounts(): Promise<{ pending: number; active: number }>
  listNationParticipation(): Promise<NationParticipationRow[]>
  listForAdmin(): Promise<AdminParticipantRecord[]>
  unsubscribeMarketing(token: string): Promise<boolean>
  resubscribeMarketing(token: string): Promise<boolean>
  recordReferralClick(input: { referrerSoccerverseUsername: string; landingPath?: string; userAgent?: string }): Promise<void>
  getReferralAnalytics(): Promise<ReferralAnalyticsRow[]>
}

interface ParticipantRow {
  participant_id: string
  email: string
  display_name: string
  soccerverse_username: string | null
  referrer_soccerverse_username: string | null
  marketing_opt_in: boolean
  marketing_unsubscribed_at: string | null
  marketing_unsubscribe_token: string | null
  browser_locale?: SupportedLocale | null
  league_type: LeagueType
  primary_team_code: string
  secondary_team_code: string | null
  status: RegistrationRecord['status']
  verified_at: string | null
  soccerverse_linked_at: string | null
  created_at?: string | null
  has_password: boolean
  reveal_profile?: boolean
  reveal_squad?: boolean
}

interface AdminParticipantRow extends ParticipantRow {
  verification_sent_at: string | null
  password_set_at: string | null
  created_at: string | null
  updated_at: string | null
}

interface MemoryPasswordResetRecord {
  participantId: string
  tokenHash: string
  expiresAt: string
}

interface MemoryReferralClickRecord {
  referrerSoccerverseUsername: string
  landingPath?: string
  userAgent?: string
  createdAt: string
}

function deriveLeagueType(soccerverseUsername?: string): LeagueType {
  return soccerverseUsername?.trim() ? 'veteran' : 'rookie'
}

function expiryIso(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString()
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function publicProfileSlug(displayName: string, participantId: string) {
  const base = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'manager'}-${participantId.slice(0, 8)}`
}

function toParticipantProfile(record: RegistrationRecord): ParticipantProfile {
  return {
    participantId: record.participantId,
    email: record.email,
    displayName: record.displayName,
    soccerverseUsername: record.soccerverseUsername,
    referrerSoccerverseUsername: record.referrerSoccerverseUsername,
    marketingOptIn: record.marketingOptIn,
    marketingUnsubscribedAt: record.marketingUnsubscribedAt,
    marketingUnsubscribeToken: record.marketingUnsubscribeToken,
    browserLocale: record.browserLocale,
    leagueType: record.leagueType,
    primaryTeamCode: record.primaryTeamCode,
    secondaryTeamCode: record.secondaryTeamCode,
    status: record.status,
    verifiedAt: record.verifiedAt,
    soccerverseLinkedAt: record.soccerverseLinkedAt,
    createdAt: record.createdAt,
    hasPassword: record.hasPassword,
    revealProfile: record.revealProfile,
    revealSquad: record.revealSquad,
  }
}

function mapParticipantRow(row: ParticipantRow): ParticipantProfile {
  return {
    participantId: row.participant_id,
    email: row.email,
    displayName: row.display_name,
    soccerverseUsername: row.soccerverse_username ?? undefined,
    referrerSoccerverseUsername: row.referrer_soccerverse_username ?? undefined,
    marketingOptIn: row.marketing_opt_in,
    marketingUnsubscribedAt: row.marketing_unsubscribed_at ?? undefined,
    marketingUnsubscribeToken: row.marketing_unsubscribe_token ?? undefined,
    browserLocale: row.browser_locale ?? undefined,
    leagueType: row.league_type,
    primaryTeamCode: row.primary_team_code,
    secondaryTeamCode: row.secondary_team_code ?? undefined,
    status: row.status,
    verifiedAt: row.verified_at ?? undefined,
    soccerverseLinkedAt: row.soccerverse_linked_at ?? undefined,
    createdAt: row.created_at ?? undefined,
    hasPassword: row.has_password,
    revealProfile: row.reveal_profile ?? false,
    revealSquad: row.reveal_squad ?? false,
  }
}

function mapAdminParticipantRow(row: AdminParticipantRow): AdminParticipantRecord {
  return {
    ...mapParticipantRow(row),
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    verificationSentAt: row.verification_sent_at ?? undefined,
    passwordSetAt: row.password_set_at ?? undefined,
  }
}

function rankNationParticipation(rows: NationParticipationRow[]) {
  return rows.sort(
    (left, right) =>
      right.participantCount - left.participantCount ||
      right.veteranCount - left.veteranCount ||
      left.teamCode.localeCompare(right.teamCode),
  )
}

export class MemoryRegistrationRepository implements RegistrationRepository {
  storageKind: 'memory' = 'memory'
  private readonly byEmail = new Map<string, RegistrationRecord>()
  private readonly byTokenHash = new Map<string, string>()
  private readonly passwordHashes = new Map<string, string>()
  private readonly passwordResetByTokenHash = new Map<string, MemoryPasswordResetRecord>()
  private readonly referralClicks: MemoryReferralClickRecord[] = []

  constructor(private readonly leaderboardCache?: LeaderboardCache) {}

  private attachPasswordState(record: RegistrationRecord): RegistrationRecord {
    return {
      ...record,
      hasPassword: this.passwordHashes.has(record.participantId),
    }
  }

  async createPending(input: RegistrationInput, plainToken: string): Promise<RegistrationCreationResult> {
    const email = normalizeEmail(input.email)
    const tokenHash = hashToken(plainToken)
    const leagueType = deriveLeagueType(input.soccerverseUsername)
    const existing = this.byEmail.get(email)

    if (existing?.status === 'active') {
      throw new ActiveRegistrationExistsError()
    }

    const participantId = existing?.participantId ?? randomUUID()
    const record = this.attachPasswordState({
      participantId,
      email,
      displayName: input.displayName.trim(),
      soccerverseUsername: input.soccerverseUsername?.trim() || undefined,
      referrerSoccerverseUsername: input.referrerSoccerverseUsername?.trim() || existing?.referrerSoccerverseUsername,
      marketingOptIn: input.marketingOptIn ? true : (existing?.marketingOptIn ?? false),
      marketingUnsubscribedAt: input.marketingOptIn ? undefined : existing?.marketingUnsubscribedAt,
      marketingUnsubscribeToken: existing?.marketingUnsubscribeToken ?? randomUUID(),
      browserLocale: input.browserLocale ?? existing?.browserLocale,
      leagueType,
      primaryTeamCode: input.primaryTeamCode,
      secondaryTeamCode: input.secondaryTeamCode,
      status: 'pending_verification',
      verificationTokenHash: tokenHash,
      verificationTokenExpiresAt: expiryIso(48),
      verifiedAt: existing?.verifiedAt,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      hasPassword: false,
    })

    this.byEmail.set(email, record)
    this.byTokenHash.set(tokenHash, email)
    this.leaderboardCache?.invalidate()
    return { record, plainToken }
  }

  async verifyByPlainToken(plainToken: string): Promise<ParticipantProfile | null> {
    const tokenHash = hashToken(plainToken)
    const email = this.byTokenHash.get(tokenHash)
    if (!email) {
      return null
    }

    const record = this.byEmail.get(email)
    if (!record || record.verificationTokenHash !== tokenHash) {
      return null
    }

    if (new Date(record.verificationTokenExpiresAt).getTime() < Date.now()) {
      return null
    }

    const nextRecord = this.attachPasswordState({
      ...record,
      status: record.status === 'pending_verification' ? 'active' : record.status,
      verifiedAt: record.verifiedAt ?? new Date().toISOString(),
    })
    this.byEmail.set(email, nextRecord)
    // status flip to 'active' adds the participant to the board (board filters status='active').
    this.leaderboardCache?.invalidate()
    return toParticipantProfile(nextRecord)
  }

  async resendVerification(email: string, plainToken: string): Promise<RegistrationCreationResult | null> {
    const normalizedEmail = normalizeEmail(email)
    const existing = this.byEmail.get(normalizedEmail)
    if (!existing) {
      return null
    }

    const tokenHash = hashToken(plainToken)
    const nextRecord = this.attachPasswordState({
      ...existing,
      verificationTokenHash: tokenHash,
      verificationTokenExpiresAt: expiryIso(48),
    })

    this.byEmail.set(normalizedEmail, nextRecord)
    this.byTokenHash.set(tokenHash, normalizedEmail)
    return { record: nextRecord, plainToken }
  }

  async authenticateWithPassword(email: string, password: string) {
    const record = this.byEmail.get(normalizeEmail(email))
    if (!record || record.status !== 'active') {
      return null
    }

    const passwordHash = this.passwordHashes.get(record.participantId)
    if (!verifyPassword(password, passwordHash)) {
      return null
    }

    return toParticipantProfile(this.attachPasswordState(record))
  }

  async setPassword(participantId: string, passwordHash: string) {
    const record = [...this.byEmail.values()].find((item) => item.participantId === participantId)
    if (!record) {
      return null
    }

    this.passwordHashes.set(participantId, passwordHash)
    const nextRecord = this.attachPasswordState(record)
    this.byEmail.set(nextRecord.email, nextRecord)
    return toParticipantProfile(nextRecord)
  }

  async linkSoccerverseAccount(participantId: string, soccerverseUsername: string) {
    const trimmed = soccerverseUsername.trim()
    if (!trimmed || trimmed.length > 60 || isEmailLikeUsername(trimmed)) {
      throw new SoccerverseLinkError('invalid_username', 'Enter a valid Soccerverse username (1-60 characters, not an email address).')
    }

    const record = [...this.byEmail.values()].find((item) => item.participantId === participantId)
    if (!record) {
      throw new SoccerverseLinkError('not_found', 'Participant not found.')
    }
    if (record.soccerverseUsername?.trim()) {
      throw new SoccerverseLinkError('already_linked', 'A Soccerverse account is already linked to this participant.')
    }

    const duplicate = [...this.byEmail.values()].some(
      (item) => item.participantId !== participantId && item.soccerverseUsername?.trim() === trimmed,
    )
    if (duplicate) {
      throw new SoccerverseLinkError('username_taken', 'Soccerverse username is already linked to another participant.')
    }

    const nextRecord: RegistrationRecord = this.attachPasswordState({
      ...record,
      soccerverseUsername: trimmed,
      soccerverseLinkedAt: new Date().toISOString(),
    })
    this.byEmail.set(nextRecord.email, nextRecord)
    // affects veteran-bonus eligibility on the board.
    this.leaderboardCache?.invalidate()
    return toParticipantProfile(nextRecord)
  }

  async correctSoccerverseUsername(participantId: string, soccerverseUsername: string) {
    const trimmed = soccerverseUsername.trim()
    if (!trimmed || trimmed.length > 60 || isEmailLikeUsername(trimmed)) {
      throw new SoccerverseLinkError('invalid_username', 'Enter a valid Soccerverse username (1–60 characters, not an email address).')
    }

    const record = [...this.byEmail.values()].find((item) => item.participantId === participantId)
    if (!record) {
      throw new SoccerverseLinkError('not_found', 'Participant not found.')
    }
    if (!record.soccerverseUsername?.trim()) {
      throw new SoccerverseLinkError('not_linked', 'This participant has no Soccerverse username to correct.')
    }

    const duplicate = [...this.byEmail.values()].some(
      (item) => item.participantId !== participantId && item.soccerverseUsername?.trim() === trimmed,
    )
    if (duplicate) {
      throw new SoccerverseLinkError('username_taken', 'Soccerverse username is already linked to another participant.')
    }

    // Correction only: update the username but DELIBERATELY preserve soccerverseLinkedAt, so the boost
    // cutoff stays the original link/attempt date (see SOP_registration_and_auth.md).
    const nextRecord: RegistrationRecord = this.attachPasswordState({ ...record, soccerverseUsername: trimmed })
    this.byEmail.set(nextRecord.email, nextRecord)
    this.leaderboardCache?.invalidate()
    return toParticipantProfile(nextRecord)
  }

  async updateParticipantNations(participantId: string, primaryTeamCode: string, secondaryTeamCode: string | null) {
    const record = [...this.byEmail.values()].find((item) => item.participantId === participantId)
    if (!record) {
      throw new NationUpdateError('not_found', 'Participant not found.')
    }

    const nextRecord: RegistrationRecord = this.attachPasswordState({
      ...record,
      primaryTeamCode,
      secondaryTeamCode: secondaryTeamCode ?? undefined,
    })
    this.byEmail.set(nextRecord.email, nextRecord)
    // Nation picks feed the nation leaderboard, so the cached boards must recompute.
    this.leaderboardCache?.invalidate()
    return toParticipantProfile(nextRecord)
  }

  async setParticipantLeague(participantId: string, leagueType: LeagueType) {
    if (leagueType !== 'rookie' && leagueType !== 'veteran') {
      throw new LeagueChangeError('invalid_league', 'League type must be either rookie or veteran.')
    }

    const record = [...this.byEmail.values()].find((item) => item.participantId === participantId)
    if (!record) {
      throw new LeagueChangeError('not_found', 'Participant not found.')
    }
    if (leagueType === 'veteran' && !record.soccerverseUsername?.trim()) {
      throw new LeagueChangeError(
        'requires_soccerverse_username',
        'Participant must link a Soccerverse account before joining the Veteran league.',
      )
    }

    if (record.leagueType === leagueType) {
      return toParticipantProfile(record)
    }

    const nextRecord: RegistrationRecord = this.attachPasswordState({ ...record, leagueType })
    this.byEmail.set(nextRecord.email, nextRecord)
    // moves the participant between the rookie and veteran boards.
    this.leaderboardCache?.invalidate()
    return toParticipantProfile(nextRecord)
  }

  async createPasswordReset(email: string, plainToken: string) {
    const record = this.byEmail.get(normalizeEmail(email))
    if (!record || record.status !== 'active') {
      return null
    }

    const tokenHash = hashToken(plainToken)
    this.passwordResetByTokenHash.set(tokenHash, {
      participantId: record.participantId,
      tokenHash,
      expiresAt: expiryIso(2),
    })

    return toParticipantProfile(this.attachPasswordState(record))
  }

  async resetPasswordByPlainToken(plainToken: string, passwordHash: string) {
    const tokenHash = hashToken(plainToken)
    const tokenRecord = this.passwordResetByTokenHash.get(tokenHash)
    if (!tokenRecord || new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
      return null
    }

    const record = [...this.byEmail.values()].find((item) => item.participantId === tokenRecord.participantId)
    if (!record) {
      return null
    }

    this.passwordHashes.set(record.participantId, passwordHash)
    this.passwordResetByTokenHash.delete(tokenHash)
    const nextRecord = this.attachPasswordState(record)
    this.byEmail.set(nextRecord.email, nextRecord)
    return toParticipantProfile(nextRecord)
  }

  async getByParticipantId(participantId: string) {
    const record = [...this.byEmail.values()].find((item) => item.participantId === participantId)
    return record ? toParticipantProfile(this.attachPasswordState(record)) : null
  }

  async getByEmail(email: string) {
    const record = this.byEmail.get(normalizeEmail(email))
    return record ? toParticipantProfile(this.attachPasswordState(record)) : null
  }

  async revealParticipant(participantId: string, revealSquad: boolean) {
    const record = [...this.byEmail.values()].find((item) => item.participantId === participantId)
    if (!record) {
      return null
    }

    const nextRecord: RegistrationRecord = this.attachPasswordState({
      ...record,
      revealProfile: true,
      revealSquad: revealSquad || record.revealSquad,
    })
    this.byEmail.set(nextRecord.email, nextRecord)
    return toParticipantProfile(nextRecord)
  }

  async getPublicProfileBySlug(slug: string) {
    const record = [...this.byEmail.values()].find((item) => publicProfileSlug(item.displayName, item.participantId) === slug)
    return record && record.status === 'active' ? toParticipantProfile(this.attachPasswordState(record)) : null
  }

  async getCounts() {
    let pending = 0
    let active = 0
    for (const record of this.byEmail.values()) {
      if (record.status === 'pending_verification') {
        pending += 1
      }
      if (record.status === 'active') {
        active += 1
      }
    }
    return { pending, active }
  }

  async listForAdmin() {
    return [...this.byEmail.values()]
      .map((record): AdminParticipantRecord => ({
        ...toParticipantProfile(this.attachPasswordState(record)),
        createdAt: record.createdAt,
      }))
      .sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? '') || left.email.localeCompare(right.email))
  }

  async listNationParticipation() {
    const rowsByTeam = new Map<string, NationParticipationRow>()
    const ensureRow = (teamCode: string) => {
      const existing = rowsByTeam.get(teamCode)
      if (existing) {
        return existing
      }
      const next = { teamCode, participantCount: 0, rookieCount: 0, veteranCount: 0 }
      rowsByTeam.set(teamCode, next)
      return next
    }

    for (const record of this.byEmail.values()) {
      if (record.status !== 'active') {
        continue
      }
      const teamCodes = [record.primaryTeamCode, record.secondaryTeamCode].filter(Boolean) as string[]
      for (const teamCode of new Set(teamCodes)) {
        const row = ensureRow(teamCode)
        row.participantCount += 1
        if (record.leagueType === 'rookie') {
          row.rookieCount += 1
        } else {
          row.veteranCount += 1
        }
      }
    }

    return rankNationParticipation([...rowsByTeam.values()])
  }

  async unsubscribeMarketing(token: string) {
    const trimmedToken = token.trim()
    const record = [...this.byEmail.values()].find((item) => item.marketingUnsubscribeToken === trimmedToken)
    if (!record) {
      return false
    }

    const nextRecord = this.attachPasswordState({
      ...record,
      marketingOptIn: false,
      marketingUnsubscribedAt: new Date().toISOString(),
    })
    this.byEmail.set(nextRecord.email, nextRecord)
    return true
  }

  async resubscribeMarketing(token: string) {
    const trimmedToken = token.trim()
    const record = [...this.byEmail.values()].find((item) => item.marketingUnsubscribeToken === trimmedToken)
    if (!record) {
      return false
    }

    const nextRecord = this.attachPasswordState({
      ...record,
      marketingOptIn: true,
      marketingUnsubscribedAt: undefined,
    })
    this.byEmail.set(nextRecord.email, nextRecord)
    return true
  }

  async recordReferralClick(input: { referrerSoccerverseUsername: string; landingPath?: string; userAgent?: string }) {
    const referrerSoccerverseUsername = input.referrerSoccerverseUsername.trim()
    if (!referrerSoccerverseUsername) {
      return
    }

    this.referralClicks.push({
      referrerSoccerverseUsername,
      landingPath: input.landingPath,
      userAgent: input.userAgent,
      createdAt: new Date().toISOString(),
    })
  }

  async getReferralAnalytics(): Promise<ReferralAnalyticsRow[]> {
    const rows = new Map<string, ReferralAnalyticsRow>()
    const ensureRow = (referrer: string) => {
      const key = referrer.toLowerCase()
      const existing = rows.get(key)
      if (existing) {
        return existing
      }

      const next: ReferralAnalyticsRow = {
        referrerSoccerverseUsername: referrer,
        clickCount: 0,
        registrationCount: 0,
        verifiedCount: 0,
        marketingOptInCount: 0,
        conversionRate: 0,
      }
      rows.set(key, next)
      return next
    }

    for (const click of this.referralClicks) {
      ensureRow(click.referrerSoccerverseUsername).clickCount += 1
    }

    for (const record of this.byEmail.values()) {
      const referrer = record.referrerSoccerverseUsername?.trim()
      if (!referrer) {
        continue
      }

      const row = ensureRow(referrer)
      row.registrationCount += 1
      if (record.status === 'active') {
        row.verifiedCount += 1
      }
      if (record.marketingOptIn && !record.marketingUnsubscribedAt) {
        row.marketingOptInCount += 1
      }
    }

    return [...rows.values()]
      .map((row) => ({
        ...row,
        conversionRate: row.clickCount > 0 ? row.registrationCount / row.clickCount : 0,
      }))
      .sort(
        (left, right) =>
          right.verifiedCount - left.verifiedCount ||
          right.registrationCount - left.registrationCount ||
          right.clickCount - left.clickCount ||
          left.referrerSoccerverseUsername.localeCompare(right.referrerSoccerverseUsername),
      )
  }
}

export class PostgresRegistrationRepository implements RegistrationRepository {
  storageKind: 'postgres' = 'postgres'

  constructor(
    private readonly pool: Pool,
    private readonly leaderboardCache?: LeaderboardCache,
  ) {}

  async createPending(input: RegistrationInput, plainToken: string): Promise<RegistrationCreationResult> {
    const email = normalizeEmail(input.email)
    const tokenHash = hashToken(plainToken)
    const leagueType = deriveLeagueType(input.soccerverseUsername)
    const expiresAt = expiryIso(48)
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const existingResult = await client.query<{
        participant_id: string
        status: RegistrationRecord['status']
      }>(
        `
          SELECT participant_id, status
          FROM participants
          WHERE email = $1
          FOR UPDATE
        `,
        [email],
      )

      const existing = existingResult.rows[0]
      if (existing?.status === 'active') {
        throw new ActiveRegistrationExistsError()
      }

      const participantResult = await client.query<
        ParticipantRow & {
          verification_token_hash: string
          verification_token_expires_at: string
        }
      >(
        `
          INSERT INTO participants (
            email,
            display_name,
            soccerverse_username,
            referrer_soccerverse_username,
            marketing_opt_in,
            marketing_unsubscribe_token,
            browser_locale,
            league_type,
            primary_team_code,
            secondary_team_code,
            status,
            verification_sent_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_verification', NOW())
          ON CONFLICT (email)
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            soccerverse_username = EXCLUDED.soccerverse_username,
            referrer_soccerverse_username = COALESCE(EXCLUDED.referrer_soccerverse_username, participants.referrer_soccerverse_username),
            marketing_opt_in = CASE WHEN EXCLUDED.marketing_opt_in THEN TRUE ELSE participants.marketing_opt_in END,
            marketing_unsubscribed_at = CASE WHEN EXCLUDED.marketing_opt_in THEN NULL ELSE participants.marketing_unsubscribed_at END,
            marketing_unsubscribe_token = COALESCE(participants.marketing_unsubscribe_token, EXCLUDED.marketing_unsubscribe_token),
            browser_locale = COALESCE(EXCLUDED.browser_locale, participants.browser_locale),
            league_type = EXCLUDED.league_type,
            primary_team_code = EXCLUDED.primary_team_code,
            secondary_team_code = EXCLUDED.secondary_team_code,
            status = 'pending_verification',
            verification_sent_at = NOW(),
            updated_at = NOW()
          RETURNING
            participant_id,
            email,
            display_name,
            soccerverse_username,
            referrer_soccerverse_username,
            marketing_opt_in,
            marketing_unsubscribed_at,
            marketing_unsubscribe_token,
            browser_locale,
            league_type,
            primary_team_code,
            secondary_team_code,
            status,
            verified_at,
            soccerverse_linked_at,
            (password_hash IS NOT NULL) AS has_password
        `,
        [
          email,
          input.displayName.trim(),
          input.soccerverseUsername?.trim() || null,
          input.referrerSoccerverseUsername?.trim() || null,
          input.marketingOptIn ? true : false,
          randomUUID(),
          input.browserLocale ?? null,
          leagueType,
          input.primaryTeamCode,
          input.secondaryTeamCode ?? null,
        ],
      )

      const participant = participantResult.rows[0]
      await client.query('UPDATE verification_tokens SET consumed_at = NOW() WHERE participant_id = $1 AND consumed_at IS NULL', [
        participant.participant_id,
      ])
      await client.query(
        `
          INSERT INTO verification_tokens (participant_id, token_hash, expires_at)
          VALUES ($1, $2, $3)
        `,
        [participant.participant_id, tokenHash, expiresAt],
      )
      await client.query('COMMIT')

      return {
        plainToken,
        record: {
          participantId: participant.participant_id,
          email: participant.email,
          displayName: participant.display_name,
          soccerverseUsername: participant.soccerverse_username ?? undefined,
          referrerSoccerverseUsername: participant.referrer_soccerverse_username ?? undefined,
          marketingOptIn: participant.marketing_opt_in,
          marketingUnsubscribedAt: participant.marketing_unsubscribed_at ?? undefined,
          marketingUnsubscribeToken: participant.marketing_unsubscribe_token ?? undefined,
          browserLocale: participant.browser_locale ?? undefined,
          leagueType: participant.league_type,
          primaryTeamCode: participant.primary_team_code,
          secondaryTeamCode: participant.secondary_team_code ?? undefined,
          status: participant.status,
          verificationTokenHash: tokenHash,
          verificationTokenExpiresAt: expiresAt,
          verifiedAt: participant.verified_at ?? undefined,
          soccerverseLinkedAt: participant.soccerverse_linked_at ?? undefined,
          hasPassword: participant.has_password,
        },
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async verifyByPlainToken(plainToken: string): Promise<ParticipantProfile | null> {
    const tokenHash = hashToken(plainToken)
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const tokenResult = await client.query<
        ParticipantRow & {
          expires_at: string
        }
      >(
        `
          SELECT
            p.participant_id,
            p.email,
            p.display_name,
            p.soccerverse_username,
            p.referrer_soccerverse_username,
            p.marketing_opt_in,
            p.marketing_unsubscribed_at,
            p.marketing_unsubscribe_token,
            p.browser_locale,
            p.league_type,
            p.primary_team_code,
            p.secondary_team_code,
            p.status,
            p.verified_at,
            p.soccerverse_linked_at,
            (p.password_hash IS NOT NULL) AS has_password,
            vt.expires_at
          FROM verification_tokens vt
          JOIN participants p ON p.participant_id = vt.participant_id
          WHERE vt.token_hash = $1
            AND vt.consumed_at IS NULL
          FOR UPDATE
        `,
        [tokenHash],
      )
      const tokenRow = tokenResult.rows[0]
      if (!tokenRow) {
        await client.query('ROLLBACK')
        return null
      }

      if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
        await client.query('ROLLBACK')
        return null
      }

      await client.query('UPDATE verification_tokens SET consumed_at = NOW() WHERE token_hash = $1', [tokenHash])

      let profile = mapParticipantRow(tokenRow)
      if (tokenRow.status === 'pending_verification') {
        const updated = await client.query<ParticipantRow>(
          `
            UPDATE participants
            SET status = 'active', verified_at = NOW(), updated_at = NOW()
            WHERE participant_id = $1
            RETURNING
              participant_id,
              email,
              display_name,
              soccerverse_username,
              referrer_soccerverse_username,
              marketing_opt_in,
              marketing_unsubscribed_at,
              marketing_unsubscribe_token,
              browser_locale,
              league_type,
              primary_team_code,
              secondary_team_code,
              status,
              verified_at,
              soccerverse_linked_at,
              (password_hash IS NOT NULL) AS has_password
          `,
          [tokenRow.participant_id],
        )
        profile = mapParticipantRow(updated.rows[0])
      }

      await client.query('COMMIT')
      // status flip to 'active' adds the participant to the board (board filters status='active').
      this.leaderboardCache?.invalidate()
      return profile
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async resendVerification(email: string, plainToken: string): Promise<RegistrationCreationResult | null> {
    const normalizedEmail = normalizeEmail(email)
    const tokenHash = hashToken(plainToken)
    const expiresAt = expiryIso(48)
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const existing = await client.query<ParticipantRow>(
        `
          SELECT
            participant_id,
            email,
            display_name,
            soccerverse_username,
            referrer_soccerverse_username,
            marketing_opt_in,
            marketing_unsubscribed_at,
            marketing_unsubscribe_token,
            browser_locale,
            league_type,
            primary_team_code,
            secondary_team_code,
            status,
            verified_at,
            soccerverse_linked_at,
            (password_hash IS NOT NULL) AS has_password
          FROM participants
          WHERE email = $1
          FOR UPDATE
        `,
        [normalizedEmail],
      )

      const participant = existing.rows[0]
      if (!participant) {
        await client.query('ROLLBACK')
        return null
      }

      await client.query('UPDATE verification_tokens SET consumed_at = NOW() WHERE participant_id = $1 AND consumed_at IS NULL', [
        participant.participant_id,
      ])
      await client.query('UPDATE participants SET verification_sent_at = NOW(), updated_at = NOW() WHERE participant_id = $1', [
        participant.participant_id,
      ])
      await client.query(
        `
          INSERT INTO verification_tokens (participant_id, token_hash, expires_at)
          VALUES ($1, $2, $3)
        `,
        [participant.participant_id, tokenHash, expiresAt],
      )
      await client.query('COMMIT')

      return {
        plainToken,
        record: {
          participantId: participant.participant_id,
          email: participant.email,
          displayName: participant.display_name,
          soccerverseUsername: participant.soccerverse_username ?? undefined,
          referrerSoccerverseUsername: participant.referrer_soccerverse_username ?? undefined,
          marketingOptIn: participant.marketing_opt_in,
          marketingUnsubscribedAt: participant.marketing_unsubscribed_at ?? undefined,
          marketingUnsubscribeToken: participant.marketing_unsubscribe_token ?? undefined,
          browserLocale: participant.browser_locale ?? undefined,
          leagueType: participant.league_type,
          primaryTeamCode: participant.primary_team_code,
          secondaryTeamCode: participant.secondary_team_code ?? undefined,
          status: participant.status,
          verificationTokenHash: tokenHash,
          verificationTokenExpiresAt: expiresAt,
          verifiedAt: participant.verified_at ?? undefined,
          soccerverseLinkedAt: participant.soccerverse_linked_at ?? undefined,
          hasPassword: participant.has_password,
        },
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async authenticateWithPassword(email: string, password: string) {
    const result = await this.pool.query<
      ParticipantRow & {
        password_hash: string | null
      }
    >(
      `
        SELECT
          participant_id,
          email,
          display_name,
          soccerverse_username,
          referrer_soccerverse_username,
          marketing_opt_in,
          marketing_unsubscribed_at,
          marketing_unsubscribe_token,
          league_type,
          primary_team_code,
          secondary_team_code,
          status,
          verified_at,
          soccerverse_linked_at,
          password_hash,
          (password_hash IS NOT NULL) AS has_password,
          reveal_profile,
          reveal_squad
        FROM participants
        WHERE email = $1
          AND status = 'active'
        LIMIT 1
      `,
      [normalizeEmail(email)],
    )
    const row = result.rows[0]
    if (!row || !verifyPassword(password, row.password_hash)) {
      return null
    }

    return mapParticipantRow(row)
  }

  async setPassword(participantId: string, passwordHash: string) {
    const result = await this.pool.query<ParticipantRow>(
      `
        UPDATE participants
        SET password_hash = $2, password_set_at = NOW(), updated_at = NOW()
        WHERE participant_id = $1
        RETURNING
          participant_id,
          email,
          display_name,
          soccerverse_username,
          referrer_soccerverse_username,
          marketing_opt_in,
          marketing_unsubscribed_at,
          marketing_unsubscribe_token,
          league_type,
          primary_team_code,
          secondary_team_code,
          status,
          verified_at,
          soccerverse_linked_at,
          (password_hash IS NOT NULL) AS has_password,
          reveal_profile,
          reveal_squad
      `,
      [participantId, passwordHash],
    )
    const row = result.rows[0]
    return row ? mapParticipantRow(row) : null
  }

  async linkSoccerverseAccount(participantId: string, soccerverseUsername: string) {
    const trimmed = soccerverseUsername.trim()
    if (!trimmed || trimmed.length > 60 || isEmailLikeUsername(trimmed)) {
      throw new SoccerverseLinkError('invalid_username', 'Enter a valid Soccerverse username (1-60 characters, not an email address).')
    }

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      const existing = await client.query<{ soccerverse_username: string | null }>(
        'SELECT soccerverse_username FROM participants WHERE participant_id = $1 FOR UPDATE',
        [participantId],
      )
      const target = existing.rows[0]
      if (!target) {
        await client.query('ROLLBACK')
        throw new SoccerverseLinkError('not_found', 'Participant not found.')
      }
      if (target.soccerverse_username && target.soccerverse_username.trim()) {
        await client.query('ROLLBACK')
        throw new SoccerverseLinkError('already_linked', 'A Soccerverse account is already linked to this participant.')
      }

      const duplicate = await client.query<{ participant_id: string }>(
        `
          SELECT participant_id
          FROM participants
          WHERE soccerverse_username = $2
            AND participant_id <> $1
          LIMIT 1
        `,
        [participantId, trimmed],
      )
      if (duplicate.rows[0]) {
        await client.query('ROLLBACK')
        throw new SoccerverseLinkError('username_taken', 'Soccerverse username is already linked to another participant.')
      }

      const updated = await client.query<ParticipantRow>(
        `
          UPDATE participants
          SET soccerverse_username = $2,
              soccerverse_linked_at = NOW(),
              updated_at = NOW()
          WHERE participant_id = $1
          RETURNING
            participant_id,
            email,
            display_name,
            soccerverse_username,
            referrer_soccerverse_username,
            marketing_opt_in,
            marketing_unsubscribed_at,
            marketing_unsubscribe_token,
            league_type,
            primary_team_code,
            secondary_team_code,
            status,
            verified_at,
            soccerverse_linked_at,
            (password_hash IS NOT NULL) AS has_password,
            reveal_profile,
            reveal_squad
        `,
        [participantId, trimmed],
      )
      await client.query('COMMIT')
      // affects veteran-bonus eligibility on the board.
      this.leaderboardCache?.invalidate()
      return mapParticipantRow(updated.rows[0])
    } catch (error) {
      if (!(error instanceof SoccerverseLinkError)) {
        await client.query('ROLLBACK')
      }
      throw error
    } finally {
      client.release()
    }
  }

  async correctSoccerverseUsername(participantId: string, soccerverseUsername: string) {
    const trimmed = soccerverseUsername.trim()
    if (!trimmed || trimmed.length > 60 || isEmailLikeUsername(trimmed)) {
      throw new SoccerverseLinkError('invalid_username', 'Enter a valid Soccerverse username (1–60 characters, not an email address).')
    }

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      const existing = await client.query<{ soccerverse_username: string | null }>(
        'SELECT soccerverse_username FROM participants WHERE participant_id = $1 FOR UPDATE',
        [participantId],
      )
      const target = existing.rows[0]
      if (!target) {
        await client.query('ROLLBACK')
        throw new SoccerverseLinkError('not_found', 'Participant not found.')
      }
      if (!target.soccerverse_username || !target.soccerverse_username.trim()) {
        await client.query('ROLLBACK')
        throw new SoccerverseLinkError('not_linked', 'This participant has no Soccerverse username to correct.')
      }

      const duplicate = await client.query<{ participant_id: string }>(
        `
          SELECT participant_id
          FROM participants
          WHERE soccerverse_username = $2
            AND participant_id <> $1
          LIMIT 1
        `,
        [participantId, trimmed],
      )
      if (duplicate.rows[0]) {
        await client.query('ROLLBACK')
        throw new SoccerverseLinkError('username_taken', 'Soccerverse username is already linked to another participant.')
      }

      // Correction only: update the username but DELIBERATELY preserve soccerverse_linked_at, so the boost
      // cutoff stays the original link/attempt date (see SOP_registration_and_auth.md).
      const updated = await client.query<ParticipantRow>(
        `
          UPDATE participants
          SET soccerverse_username = $2,
              updated_at = NOW()
          WHERE participant_id = $1
          RETURNING
            participant_id,
            email,
            display_name,
            soccerverse_username,
            referrer_soccerverse_username,
            marketing_opt_in,
            marketing_unsubscribed_at,
            marketing_unsubscribe_token,
            league_type,
            primary_team_code,
            secondary_team_code,
            status,
            verified_at,
            soccerverse_linked_at,
            created_at,
            (password_hash IS NOT NULL) AS has_password,
            reveal_profile,
            reveal_squad
        `,
        [participantId, trimmed],
      )
      await client.query('COMMIT')
      this.leaderboardCache?.invalidate()
      return mapParticipantRow(updated.rows[0])
    } catch (error) {
      if (!(error instanceof SoccerverseLinkError)) {
        await client.query('ROLLBACK')
      }
      throw error
    } finally {
      client.release()
    }
  }

  async updateParticipantNations(participantId: string, primaryTeamCode: string, secondaryTeamCode: string | null) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      const existing = await client.query<{ participant_id: string }>(
        'SELECT participant_id FROM participants WHERE participant_id = $1 FOR UPDATE',
        [participantId],
      )
      if (!existing.rows[0]) {
        await client.query('ROLLBACK')
        throw new NationUpdateError('not_found', 'Participant not found.')
      }

      const updated = await client.query<ParticipantRow>(
        `
          UPDATE participants
          SET primary_team_code = $2,
              secondary_team_code = $3,
              updated_at = NOW()
          WHERE participant_id = $1
          RETURNING
            participant_id,
            email,
            display_name,
            soccerverse_username,
            referrer_soccerverse_username,
            marketing_opt_in,
            marketing_unsubscribed_at,
            marketing_unsubscribe_token,
            league_type,
            primary_team_code,
            secondary_team_code,
            status,
            verified_at,
            soccerverse_linked_at,
            created_at,
            (password_hash IS NOT NULL) AS has_password,
            reveal_profile,
            reveal_squad
        `,
        [participantId, primaryTeamCode, secondaryTeamCode],
      )
      await client.query('COMMIT')
      // Nation picks feed the nation leaderboard, so the cached boards must recompute.
      this.leaderboardCache?.invalidate()
      return mapParticipantRow(updated.rows[0])
    } catch (error) {
      if (!(error instanceof NationUpdateError)) {
        await client.query('ROLLBACK')
      }
      throw error
    } finally {
      client.release()
    }
  }

  async setParticipantLeague(participantId: string, leagueType: LeagueType) {
    if (leagueType !== 'rookie' && leagueType !== 'veteran') {
      throw new LeagueChangeError('invalid_league', 'League type must be either rookie or veteran.')
    }

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      const existing = await client.query<{ league_type: LeagueType; soccerverse_username: string | null }>(
        'SELECT league_type, soccerverse_username FROM participants WHERE participant_id = $1 FOR UPDATE',
        [participantId],
      )
      const target = existing.rows[0]
      if (!target) {
        await client.query('ROLLBACK')
        throw new LeagueChangeError('not_found', 'Participant not found.')
      }
      if (leagueType === 'veteran' && !(target.soccerverse_username && target.soccerverse_username.trim())) {
        await client.query('ROLLBACK')
        throw new LeagueChangeError(
          'requires_soccerverse_username',
          'Participant must link a Soccerverse account before joining the Veteran league.',
        )
      }
      if (target.league_type === leagueType) {
        await client.query('COMMIT')
        const current = await this.pool.query<ParticipantRow>(
          `
            SELECT
              participant_id, email, display_name, soccerverse_username, referrer_soccerverse_username,
              marketing_opt_in, marketing_unsubscribed_at, marketing_unsubscribe_token, league_type,
              primary_team_code, secondary_team_code, status, verified_at, soccerverse_linked_at,
              (password_hash IS NOT NULL) AS has_password, reveal_profile, reveal_squad
            FROM participants WHERE participant_id = $1
          `,
          [participantId],
        )
        return mapParticipantRow(current.rows[0])
      }

      const updated = await client.query<ParticipantRow>(
        `
          UPDATE participants
          SET league_type = $2, updated_at = NOW()
          WHERE participant_id = $1
          RETURNING
            participant_id, email, display_name, soccerverse_username, referrer_soccerverse_username,
            marketing_opt_in, marketing_unsubscribed_at, marketing_unsubscribe_token, league_type,
            primary_team_code, secondary_team_code, status, verified_at, soccerverse_linked_at,
            (password_hash IS NOT NULL) AS has_password, reveal_profile, reveal_squad
        `,
        [participantId, leagueType],
      )
      await client.query('COMMIT')
      // moves the participant between the rookie and veteran boards.
      this.leaderboardCache?.invalidate()
      return mapParticipantRow(updated.rows[0])
    } catch (error) {
      if (!(error instanceof LeagueChangeError)) {
        await client.query('ROLLBACK')
      }
      throw error
    } finally {
      client.release()
    }
  }

  async createPasswordReset(email: string, plainToken: string) {
    const normalizedEmail = normalizeEmail(email)
    const tokenHash = hashToken(plainToken)
    const expiresAt = expiryIso(2)
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const existing = await client.query<ParticipantRow>(
        `
          SELECT
            participant_id,
            email,
            display_name,
            soccerverse_username,
            referrer_soccerverse_username,
            marketing_opt_in,
            marketing_unsubscribed_at,
            marketing_unsubscribe_token,
            league_type,
            primary_team_code,
            secondary_team_code,
            status,
            verified_at,
            soccerverse_linked_at,
            (password_hash IS NOT NULL) AS has_password,
            reveal_profile,
            reveal_squad
          FROM participants
          WHERE email = $1
            AND status = 'active'
          FOR UPDATE
        `,
        [normalizedEmail],
      )

      const participant = existing.rows[0]
      if (!participant) {
        await client.query('ROLLBACK')
        return null
      }

      await client.query(
        'UPDATE participant_password_reset_tokens SET consumed_at = NOW() WHERE participant_id = $1 AND consumed_at IS NULL',
        [participant.participant_id],
      )
      await client.query(
        `
          INSERT INTO participant_password_reset_tokens (participant_id, token_hash, expires_at)
          VALUES ($1, $2, $3)
        `,
        [participant.participant_id, tokenHash, expiresAt],
      )
      await client.query('COMMIT')

      return mapParticipantRow(participant)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async resetPasswordByPlainToken(plainToken: string, passwordHash: string) {
    const tokenHash = hashToken(plainToken)
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const tokenResult = await client.query<
        ParticipantRow & {
          expires_at: string
        }
      >(
        `
          SELECT
            p.participant_id,
            p.email,
            p.display_name,
            p.soccerverse_username,
            p.referrer_soccerverse_username,
            p.marketing_opt_in,
            p.marketing_unsubscribed_at,
            p.marketing_unsubscribe_token,
            p.league_type,
            p.primary_team_code,
            p.secondary_team_code,
            p.status,
            p.verified_at,
            p.soccerverse_linked_at,
            (p.password_hash IS NOT NULL) AS has_password,
            prt.expires_at
          FROM participant_password_reset_tokens prt
          JOIN participants p ON p.participant_id = prt.participant_id
          WHERE prt.token_hash = $1
            AND prt.consumed_at IS NULL
          FOR UPDATE
        `,
        [tokenHash],
      )

      const tokenRow = tokenResult.rows[0]
      if (!tokenRow || new Date(tokenRow.expires_at).getTime() < Date.now()) {
        await client.query('ROLLBACK')
        return null
      }

      await client.query(
        'UPDATE participant_password_reset_tokens SET consumed_at = NOW() WHERE token_hash = $1 AND consumed_at IS NULL',
        [tokenHash],
      )
      const updated = await client.query<ParticipantRow>(
        `
          UPDATE participants
          SET password_hash = $2, password_set_at = NOW(), updated_at = NOW()
          WHERE participant_id = $1
          RETURNING
            participant_id,
            email,
            display_name,
            soccerverse_username,
            referrer_soccerverse_username,
            marketing_opt_in,
            marketing_unsubscribed_at,
            marketing_unsubscribe_token,
            league_type,
            primary_team_code,
            secondary_team_code,
            status,
            verified_at,
            soccerverse_linked_at,
            (password_hash IS NOT NULL) AS has_password
        `,
        [tokenRow.participant_id, passwordHash],
      )
      await client.query('COMMIT')
      return mapParticipantRow(updated.rows[0])
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async getByParticipantId(participantId: string) {
    const result = await this.pool.query<ParticipantRow>(
      `
        SELECT
          participant_id,
          email,
          display_name,
          soccerverse_username,
          referrer_soccerverse_username,
          marketing_opt_in,
          marketing_unsubscribed_at,
          marketing_unsubscribe_token,
          league_type,
          primary_team_code,
          secondary_team_code,
          status,
          verified_at,
          soccerverse_linked_at,
          created_at,
          (password_hash IS NOT NULL) AS has_password,
          reveal_profile,
          reveal_squad
        FROM participants
        WHERE participant_id = $1
      `,
      [participantId],
    )
    const row = result.rows[0]
    return row ? mapParticipantRow(row) : null
  }

  async getByEmail(email: string) {
    const result = await this.pool.query<ParticipantRow>(
      `
        SELECT
          participant_id,
          email,
          display_name,
          soccerverse_username,
          referrer_soccerverse_username,
          marketing_opt_in,
          marketing_unsubscribed_at,
          marketing_unsubscribe_token,
          league_type,
          primary_team_code,
          secondary_team_code,
          status,
          verified_at,
          soccerverse_linked_at,
          (password_hash IS NOT NULL) AS has_password,
          reveal_profile,
          reveal_squad
        FROM participants
        WHERE email = $1
      `,
      [normalizeEmail(email)],
    )
    const row = result.rows[0]
    return row ? mapParticipantRow(row) : null
  }

  async revealParticipant(participantId: string, revealSquad: boolean) {
    const result = await this.pool.query<ParticipantRow>(
      `
        UPDATE participants
        SET reveal_profile = TRUE,
            reveal_squad = CASE WHEN $2 THEN TRUE ELSE reveal_squad END,
            updated_at = NOW()
        WHERE participant_id = $1
        RETURNING
          participant_id,
          email,
          display_name,
          soccerverse_username,
          referrer_soccerverse_username,
          marketing_opt_in,
          marketing_unsubscribed_at,
          marketing_unsubscribe_token,
          league_type,
          primary_team_code,
          secondary_team_code,
          status,
          verified_at,
          soccerverse_linked_at,
          (password_hash IS NOT NULL) AS has_password,
          reveal_profile,
          reveal_squad
      `,
      [participantId, revealSquad],
    )
    const row = result.rows[0]
    return row ? mapParticipantRow(row) : null
  }

  async getPublicProfileBySlug(slug: string) {
    const result = await this.pool.query<ParticipantRow>(
      `
        SELECT
          participant_id,
          email,
          display_name,
          soccerverse_username,
          referrer_soccerverse_username,
          marketing_opt_in,
          marketing_unsubscribed_at,
          marketing_unsubscribe_token,
          league_type,
          primary_team_code,
          secondary_team_code,
          status,
          verified_at,
          soccerverse_linked_at,
          (password_hash IS NOT NULL) AS has_password,
          reveal_profile,
          reveal_squad
        FROM participants
        WHERE status = 'active'
      `,
    )
    const row = result.rows.find((participant) => publicProfileSlug(participant.display_name, participant.participant_id) === slug)
    return row ? mapParticipantRow(row) : null
  }

  async getCounts() {
    const result = await this.pool.query<{ status: RegistrationRecord['status']; count: string }>(
      `
        SELECT status, COUNT(*)::text AS count
        FROM participants
        GROUP BY status
      `,
    )
    const counts = Object.fromEntries(result.rows.map((row) => [row.status, Number(row.count)]))
    return {
      pending: counts.pending_verification ?? 0,
      active: counts.active ?? 0,
    }
  }

  async listForAdmin() {
    const result = await this.pool.query<AdminParticipantRow>(
      `
        SELECT
          participant_id,
          email,
          display_name,
          soccerverse_username,
          referrer_soccerverse_username,
          marketing_opt_in,
          marketing_unsubscribed_at,
          marketing_unsubscribe_token,
          league_type,
          primary_team_code,
          secondary_team_code,
          status,
          verified_at,
          soccerverse_linked_at,
          verification_sent_at,
          password_set_at,
          created_at,
          updated_at,
          (password_hash IS NOT NULL) AS has_password,
          reveal_profile,
          reveal_squad
        FROM participants
        ORDER BY created_at DESC, email ASC
      `,
    )
    return result.rows.map(mapAdminParticipantRow)
  }

  async listNationParticipation() {
    const result = await this.pool.query<NationParticipationRow>(
      `
        WITH participant_nations AS (
          SELECT participant_id, league_type, primary_team_code AS team_code
          FROM participants
          WHERE status = 'active'
          UNION
          SELECT participant_id, league_type, secondary_team_code AS team_code
          FROM participants
          WHERE status = 'active'
            AND secondary_team_code IS NOT NULL
        )
        SELECT
          team_code AS "teamCode",
          COUNT(*)::int AS "participantCount",
          COUNT(*) FILTER (WHERE league_type = 'rookie')::int AS "rookieCount",
          COUNT(*) FILTER (WHERE league_type = 'veteran')::int AS "veteranCount"
        FROM participant_nations
        GROUP BY team_code
        ORDER BY "participantCount" DESC, "veteranCount" DESC, team_code ASC
      `,
    )
    return result.rows
  }

  async unsubscribeMarketing(token: string) {
    const trimmedToken = token.trim()
    if (!trimmedToken) {
      return false
    }

    const result = await this.pool.query(
      `
        UPDATE participants
        SET marketing_opt_in = FALSE,
            marketing_unsubscribed_at = COALESCE(marketing_unsubscribed_at, NOW()),
            updated_at = NOW()
        WHERE marketing_unsubscribe_token = $1
        RETURNING participant_id
      `,
      [trimmedToken],
    )
    return (result.rowCount ?? 0) > 0
  }

  async resubscribeMarketing(token: string) {
    const trimmedToken = token.trim()
    if (!trimmedToken) {
      return false
    }

    const result = await this.pool.query(
      `
        UPDATE participants
        SET marketing_opt_in = TRUE,
            marketing_unsubscribed_at = NULL,
            updated_at = NOW()
        WHERE marketing_unsubscribe_token = $1
        RETURNING participant_id
      `,
      [trimmedToken],
    )
    return (result.rowCount ?? 0) > 0
  }

  async recordReferralClick(input: { referrerSoccerverseUsername: string; landingPath?: string; userAgent?: string }) {
    const referrerSoccerverseUsername = input.referrerSoccerverseUsername.trim()
    if (!referrerSoccerverseUsername) {
      return
    }

    await this.pool.query(
      `
        INSERT INTO referral_clicks (referrer_soccerverse_username, landing_path, user_agent)
        VALUES ($1, $2, $3)
      `,
      [referrerSoccerverseUsername, input.landingPath ?? null, input.userAgent ?? null],
    )
  }

  async getReferralAnalytics(): Promise<ReferralAnalyticsRow[]> {
    const result = await this.pool.query<{
      referrer_soccerverse_username: string
      click_count: number | string
      registration_count: number | string
      verified_count: number | string
      marketing_opt_in_count: number | string
    }>(
      `
        WITH clicks AS (
          SELECT
            LOWER(referrer_soccerverse_username) AS ref_key,
            MIN(referrer_soccerverse_username) AS referrer_soccerverse_username,
            COUNT(*)::int AS click_count
          FROM referral_clicks
          GROUP BY LOWER(referrer_soccerverse_username)
        ),
        registrations AS (
          SELECT
            LOWER(referrer_soccerverse_username) AS ref_key,
            MIN(referrer_soccerverse_username) AS referrer_soccerverse_username,
            COUNT(*)::int AS registration_count,
            COUNT(*) FILTER (WHERE status = 'active')::int AS verified_count,
            COUNT(*) FILTER (WHERE marketing_opt_in = TRUE AND marketing_unsubscribed_at IS NULL)::int AS marketing_opt_in_count
          FROM participants
          WHERE referrer_soccerverse_username IS NOT NULL
            AND referrer_soccerverse_username <> ''
          GROUP BY LOWER(referrer_soccerverse_username)
        )
        SELECT
          COALESCE(clicks.referrer_soccerverse_username, registrations.referrer_soccerverse_username) AS referrer_soccerverse_username,
          COALESCE(clicks.click_count, 0)::int AS click_count,
          COALESCE(registrations.registration_count, 0)::int AS registration_count,
          COALESCE(registrations.verified_count, 0)::int AS verified_count,
          COALESCE(registrations.marketing_opt_in_count, 0)::int AS marketing_opt_in_count
        FROM clicks
        FULL JOIN registrations USING (ref_key)
        ORDER BY verified_count DESC, registration_count DESC, click_count DESC, referrer_soccerverse_username ASC
      `,
    )

    return result.rows.map((row) => {
      const clickCount = Number(row.click_count)
      const registrationCount = Number(row.registration_count)
      return {
        referrerSoccerverseUsername: row.referrer_soccerverse_username,
        clickCount,
        registrationCount,
        verifiedCount: Number(row.verified_count),
        marketingOptInCount: Number(row.marketing_opt_in_count),
        conversionRate: clickCount > 0 ? registrationCount / clickCount : 0,
      }
    })
  }
}
