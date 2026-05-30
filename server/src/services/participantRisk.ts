import type { Request } from 'express'
import type { ParticipantProfile, ParticipantRiskEventType } from '../domain/types.js'
import { canonicalizeEmail } from '../lib/emailCanonicalization.js'
import { checkEmailDomainHealth } from '../lib/emailDomainHealth.js'
import { isDisposableEmailDomain } from '../lib/disposableEmailDomains.js'
import { buildRequestRiskSignal, hashRiskValue } from '../lib/riskSignals.js'
import type { ParticipantRiskRepository } from '../repositories/participantRiskRepository.js'
import { logger } from '../lib/logger.js'
import { recordOperationEvent } from './operationsMonitor.js'

export async function recordParticipantRiskEvent(input: {
  repository: ParticipantRiskRepository
  participant: ParticipantProfile
  eventType: ParticipantRiskEventType
  request: Request
  checkMx?: boolean
}) {
  const email = canonicalizeEmail(input.participant.email)
  const requestSignal = buildRequestRiskSignal(input.request)
  const domainHealth = input.checkMx ? await checkEmailDomainHealth(email.canonicalDomain) : undefined

  await input.repository.recordSignal({
    participant: input.participant,
    eventType: input.eventType,
    emailCanonicalHash: hashRiskValue(email.canonicalEmail),
    emailDomain: email.canonicalDomain,
    emailProvider: email.provider,
    emailIsDisposable: isDisposableEmailDomain(email.canonicalDomain),
    emailMxStatus: domainHealth?.mxStatus,
    emailMxHostCount: domainHealth?.mxHostCount,
    ...requestSignal,
  })
  await input.repository.refreshCasesForParticipant(input.participant.participantId)
}

export function recordParticipantRiskEventAsync(input: Parameters<typeof recordParticipantRiskEvent>[0]) {
  void recordParticipantRiskEvent(input).catch((error) => {
    logger.error({ err: error, eventType: input.eventType }, 'Failed to record participant risk event')
    recordOperationEvent({
      type: 'participant_risk',
      status: 'error',
      message: 'Failed to record participant risk event.',
      detail: { eventType: input.eventType, error: error instanceof Error ? error.message : String(error) },
    })
  })
}
