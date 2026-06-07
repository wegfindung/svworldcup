import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryEmailMarketingRepository } from './emailMarketingRepository.js'
import type { ParticipantProfile } from '../domain/types.js'

const mailerMock = vi.hoisted(() => ({
  sendAppMail: vi.fn(async () => undefined),
}))

vi.mock('../lib/mailer.js', () => ({
  sendAppMail: mailerMock.sendAppMail,
}))

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
  beforeEach(() => {
    mailerMock.sendAppMail.mockClear()
  })

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

  it('skips explicitly-unsubscribed participants even for transactional autoresponders', async () => {
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
      leagueType: 'veteran',
      marketingOptIn: false,
      marketingUnsubscribedAt: new Date().toISOString(),
    })
    const recipients = await repository.listRecipients(campaign.campaignId)

    expect(runs).toHaveLength(0)
    expect(recipients).toHaveLength(0)
  })

  it('renders campaign emails with the PNG logo and localized unsubscribe footer', async () => {
    const repository = new MemoryEmailMarketingRepository()
    await repository.saveCampaign(
      {
        kind: 'autoresponder',
        status: 'active',
        triggerKey: 'registration_verified',
        subject: 'Rookie briefing',
        bodyHtml: '<p><img src="{{logo_url}}" alt="Logo">Welcome {{first_name}}.</p>',
        bodyHtmlByLocale: {
          de: '<p><img src="{{logo_url}}" alt="Logo">Willkommen {{first_name}}.</p>',
        },
        audienceStatus: 'active',
        audienceLeague: 'rookie',
        requiresMarketingOptIn: false,
      },
      'admin@example.com',
    )

    await repository.queueAutoresponders('registration_verified', {
      ...participant,
      browserLocale: 'de',
      marketingOptIn: false,
    })

    expect(mailerMock.sendAppMail).toHaveBeenCalledTimes(1)
    const mail = mailerMock.sendAppMail.mock.calls[0]?.[0] as { html: string; text: string }

    expect(mail.html).toContain('/brand/logo-email.png')
    expect(mail.html).not.toContain('/brand/logo-200.webp')
    expect(mail.html).toContain('Du kannst Marketing-Mails von The Grand Tournament hier')
    expect(mail.html).toContain('>abbestellen</a>.')
    expect(mail.text).toContain('Abbestellen: ')
    expect(mail.text).not.toContain('Unsubscribe: ')
  })

  it('renders localized test campaign emails with an unsubscribe footer', async () => {
    const repository = new MemoryEmailMarketingRepository()

    await repository.sendTestMail(
      {
        kind: 'newsletter',
        status: 'draft',
        triggerKey: 'manual',
        subject: 'Submit your squad',
        bodyHtml: '<p>Submit your squad now.</p>',
        subjectByLocale: {
          de: 'Kader absenden',
        },
        bodyHtmlByLocale: {
          de: '<p>Kader jetzt absenden.</p>',
        },
        audienceStatus: 'active',
        audienceLeague: 'all',
        requiresMarketingOptIn: true,
        recipient: 'preview@example.com',
        recipientLocale: 'de',
      },
      'admin@example.com',
    )

    expect(mailerMock.sendAppMail).toHaveBeenCalledTimes(1)
    const mail = mailerMock.sendAppMail.mock.calls[0]?.[0] as {
      subject: string
      html: string
      text: string
      headers?: Record<string, string>
    }

    expect(mail.subject).toBe('[TEST] Kader absenden')
    expect(mail.html).toContain('Kader jetzt absenden.')
    expect(mail.html).toContain('Du kannst Marketing-Mails von The Grand Tournament hier')
    expect(mail.html).toContain('/api/public/email/unsubscribe?token=test-')
    expect(mail.text).toContain('Abbestellen: ')
    expect(mail.headers?.['List-Unsubscribe']).toContain('/api/public/email/unsubscribe?token=test-')
  })
})
