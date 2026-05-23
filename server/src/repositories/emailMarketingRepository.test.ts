import { describe, expect, it } from 'vitest'
import { MemoryEmailMarketingRepository } from './emailMarketingRepository.js'
import type { ParticipantProfile } from '../domain/types.js'

const participant: ParticipantProfile = {
  participantId: 'participant-1',
  email: 'manager@example.com',
  displayName: 'Test Manager',
  marketingOptIn: true,
  marketingUnsubscribeToken: 'token-1',
  leagueType: 'rookie',
  primaryTeamCode: 'BRA',
  status: 'active',
  verifiedAt: new Date().toISOString(),
  hasPassword: false,
}

describe('MemoryEmailMarketingRepository', () => {
  it('queues and sends active autoresponders for matching registration events', async () => {
    const repository = new MemoryEmailMarketingRepository()
    const campaign = await repository.saveCampaign(
      {
        kind: 'autoresponder',
        status: 'active',
        triggerKey: 'registration_verified',
        subject: 'Welcome {{display_name}}',
        bodyHtml: 'Start building your squad for {{primary_team_code}}.',
        audienceStatus: 'all',
      },
      'admin@example.com',
    )

    const runs = await repository.queueAutoresponders('registration_verified', participant)
    const recipients = await repository.listRecipients(campaign.campaignId)

    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ sent: 1, failed: 0, pending: 0, status: 'active' })
    expect(recipients).toHaveLength(1)
    expect(recipients[0]).toMatchObject({ email: 'manager@example.com', status: 'sent' })
  })

  it('keeps delayed autoresponders pending until due', async () => {
    const repository = new MemoryEmailMarketingRepository()
    const campaign = await repository.saveCampaign(
      {
        kind: 'autoresponder',
        status: 'active',
        triggerKey: 'registration_created',
        subject: 'Pending registration',
        bodyHtml: 'Confirm your registration.',
        audienceStatus: 'all',
        delayMinutes: 30,
      },
      'admin@example.com',
    )

    const runs = await repository.queueAutoresponders('registration_created', participant)
    const recipients = await repository.listRecipients(campaign.campaignId)

    expect(runs).toHaveLength(0)
    expect(recipients).toHaveLength(1)
    expect(recipients[0]).toMatchObject({ email: 'manager@example.com', status: 'pending' })
  })

  it('does not queue autoresponders outside the selected audience', async () => {
    const repository = new MemoryEmailMarketingRepository()
    const campaign = await repository.saveCampaign(
      {
        kind: 'autoresponder',
        status: 'active',
        triggerKey: 'registration_verified',
        subject: 'Veteran referrer note',
        bodyHtml: 'Only a specific veteran audience should receive this.',
        audienceStatus: 'active',
        audienceLeague: 'veteran',
        audienceReferrer: 'Libertaerx',
      },
      'admin@example.com',
    )

    const runs = await repository.queueAutoresponders('registration_verified', {
      ...participant,
      referrerSoccerverseUsername: 'Libertaerx',
    })
    const recipients = await repository.listRecipients(campaign.campaignId)

    expect(runs).toHaveLength(0)
    expect(recipients).toHaveLength(0)
  })

  it('queues transactional autoresponders without marketing opt-in', async () => {
    const repository = new MemoryEmailMarketingRepository()
    const campaign = await repository.saveCampaign(
      {
        kind: 'autoresponder',
        status: 'active',
        triggerKey: 'registration_verified',
        subject: 'Veteran onboarding',
        bodyHtml: 'Welcome {{first_name}}.',
        audienceStatus: 'active',
        audienceLeague: 'veteran',
        requiresMarketingOptIn: false,
      },
      'admin@example.com',
    )

    const runs = await repository.queueAutoresponders('registration_verified', {
      ...participant,
      marketingOptIn: false,
      leagueType: 'veteran',
      browserLocale: 'de',
    })
    const recipients = await repository.listRecipients(campaign.campaignId)

    expect(runs).toHaveLength(1)
    expect(recipients[0]).toMatchObject({ browserLocale: 'de', email: 'manager@example.com', status: 'sent' })
  })
})
