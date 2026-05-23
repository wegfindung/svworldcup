import { describe, expect, it } from 'vitest'
import { canonicalizeEmail } from '../lib/emailCanonicalization.js'
import { hashRiskValue } from '../lib/riskSignals.js'
import { MemoryParticipantRiskRepository } from './participantRiskRepository.js'

function participant(participantId: string, email: string) {
  return {
    participantId,
    email,
    displayName: `Manager ${participantId}`,
    leagueType: 'rookie' as const,
    primaryTeamCode: 'FRA',
    status: 'active' as const,
    marketingOptIn: false,
    hasPassword: false,
  }
}

async function recordRegistration(repo: MemoryParticipantRiskRepository, participantId: string, email: string) {
  const canonical = canonicalizeEmail(email)
  await repo.recordSignal({
    participant: participant(participantId, email),
    eventType: 'registration',
    emailCanonicalHash: hashRiskValue(canonical.canonicalEmail),
    emailDomain: canonical.canonicalDomain,
    emailProvider: canonical.provider,
  })
  await repo.refreshCasesForParticipant(participantId)
}

describe('MemoryParticipantRiskRepository', () => {
  it('creates a review case for canonical email collisions without rejecting accounts', async () => {
    const repo = new MemoryParticipantRiskRepository()
    await recordRegistration(repo, 'p-1', 'manager+one@gmail.com')
    await recordRegistration(repo, 'p-2', 'm.a.n.a.g.e.r+two@googlemail.com')

    const cases = await repo.listCases()
    expect(cases).toHaveLength(1)
    expect(cases[0]?.reasonKeys).toContain('canonical_email_collision')
    expect(cases[0]?.members.map((member) => member.participantId).sort()).toEqual(['p-1', 'p-2'])
  })
})
