import { describe, expect, it } from 'vitest'
import { defaultEmailCampaigns } from '../data/defaultEmailCampaigns.js'
import { supportedLocales } from '../data/worldCupSeed.js'
import { MemoryEmailMarketingRepository } from '../repositories/emailMarketingRepository.js'
import { bootstrapDefaultEmailCampaigns } from './bootstrapEmailCampaigns.js'

const squadSubmissionReminderSubject = '⚽️ Submit your squad and secure your points'
const firstSwapReminderSubject = 'Your first Squad Swap Window opens in 24 hours'
const swapNewsletterSubjects = [
  firstSwapReminderSubject,
  'Your first Squad Swap Window is open',
  'Your second Squad Swap Window opens in 24 hours',
  'Your second Squad Swap Window is open',
  'Your final Squad Swap Window opens in 24 hours',
  'Your final Squad Swap Window is open',
]

describe('bootstrapDefaultEmailCampaigns', () => {
  it('seeds separate registration-verified onboarding autoresponders for veterans and rookies', async () => {
    const repository = new MemoryEmailMarketingRepository()

    await bootstrapDefaultEmailCampaigns(repository)

    const campaigns = await repository.listCampaigns()
    const autoresponders = campaigns.filter((candidate) => candidate.kind === 'autoresponder')
    const veteran = autoresponders.find((candidate) => candidate.audienceLeague === 'veteran')
    const rookie = autoresponders.find((candidate) => candidate.subject === 'Rookie briefing: your Grand Tournament crash course')
    const rookieMainGame = autoresponders.find((candidate) => candidate.subject === 'Rookies, this is where Soccerverse really begins')

    expect(veteran).toMatchObject({
      status: 'active',
      triggerKey: 'registration_verified',
      audienceStatus: 'active',
      audienceLeague: 'veteran',
      delayMinutes: 0,
      requiresMarketingOptIn: false,
    })
    expect(rookie).toMatchObject({
      subject: 'Rookie briefing: your Grand Tournament crash course',
      status: 'active',
      triggerKey: 'registration_verified',
      audienceStatus: 'active',
      audienceLeague: 'rookie',
      delayMinutes: 0,
      requiresMarketingOptIn: false,
    })
    expect(rookie?.bodyHtml).toContain('{{logo_url}}')
    expect(rookie?.bodyHtml).toContain('{{help_url}}')
    expect(rookie?.bodyHtml).toContain('https://discord.com/invite/ze5xJgg7AM')
    expect(rookie?.subjectByLocale).toMatchObject({
      de: 'Rookie-Briefing: Dein Crashkurs für The Grand Tournament',
      es: 'Briefing Rookie: tu curso rápido para The Grand Tournament',
      ja: 'Rookie ブリーフィング: The Grand Tournament 速習ガイド',
    })
    expect(rookie?.bodyHtmlByLocale?.de).toContain('Help-Seite öffnen')
    expect(rookieMainGame).toMatchObject({
      status: 'active',
      triggerKey: 'registration_created',
      audienceStatus: 'all',
      audienceLeague: 'rookie',
      delayMinutes: 60 * 24,
      requiresMarketingOptIn: true,
    })
    expect(rookieMainGame?.bodyHtml).toContain('{{logo_url}}')
    expect(rookieMainGame?.bodyHtml).toContain('{{play_affiliate_url}}')
    expect(rookieMainGame?.bodyHtml).toContain('KNOW YOUR PLAYERS, OWN YOUR SUCCESS')
    expect(rookieMainGame?.subjectByLocale).toMatchObject({
      de: 'Rookies, hier beginnt Soccerverse wirklich',
      es: 'Rookies, aquí es donde Soccerverse empieza de verdad',
      ja: 'Rookies、Soccerverse はここから本当に始まります',
    })

    const livestream = campaigns.find(
      (candidate) => candidate.subject === 'Livestream: Soccerverse Grand Tournament 🔥',
    )
    expect(livestream).toMatchObject({
      kind: 'newsletter',
      status: 'draft',
      triggerKey: 'manual',
      requiresMarketingOptIn: true,
    })
    expect(Object.keys(livestream?.subjectByLocale ?? {}).sort()).toEqual([...supportedLocales].sort())
    expect(Object.keys(livestream?.bodyHtmlByLocale ?? {}).sort()).toEqual([...supportedLocales].sort())
    expect(livestream?.subjectByLocale?.de).toBe('Livestream: Soccerverse Grand Tournament 🔥')
    expect(livestream?.bodyHtmlByLocale?.en).toContain('https://event.svtool.info/live')
    expect(livestream?.bodyHtmlByLocale?.en).toContain('6:30 PM UTC')
  })

  it('seeds the localized swap-window newsletter series', async () => {
    const repository = new MemoryEmailMarketingRepository()

    await bootstrapDefaultEmailCampaigns(repository)

    const campaigns = await repository.listCampaigns()
    const swapCampaigns = campaigns.filter(
      (candidate) => candidate.kind === 'newsletter' && swapNewsletterSubjects.includes(candidate.subject),
    )
    const campaign = swapCampaigns.find((candidate) => candidate.subject === firstSwapReminderSubject)

    expect(swapCampaigns.map((candidate) => candidate.subject).sort()).toEqual([...swapNewsletterSubjects].sort())
    expect(campaign).toMatchObject({
      kind: 'newsletter',
      status: 'scheduled',
      triggerKey: 'manual',
      audienceStatus: 'active',
      audienceLeague: 'all',
      scheduledAt: '2026-06-17T05:00:00.000Z',
      requiresMarketingOptIn: true,
    })
    expect(campaign?.subjectByLocale?.de).toBe('Dein erstes Squad Swap Window öffnet in 24 Stunden')
    expect(campaign?.bodyHtml).toContain('{{logo_url}}')
    expect(campaign?.bodyHtml).toContain('{{help_url}}')
    expect(campaign?.bodyHtmlByLocale?.de).toContain('Starting Eleven')
  })

  it('seeds the localized squad-submission reminder newsletter', async () => {
    const repository = new MemoryEmailMarketingRepository()

    await bootstrapDefaultEmailCampaigns(repository)

    const campaigns = await repository.listCampaigns()
    const campaign = campaigns.find((candidate) => candidate.subject === squadSubmissionReminderSubject)

    expect(campaign).toMatchObject({
      kind: 'newsletter',
      status: 'scheduled',
      triggerKey: 'manual',
      audienceStatus: 'active',
      audienceLeague: 'all',
      scheduledAt: '2026-06-08T05:00:00.000Z',
      requiresMarketingOptIn: true,
    })
    expect(Object.keys(campaign?.subjectByLocale ?? {}).sort()).toEqual([...supportedLocales].sort())
    expect(Object.keys(campaign?.bodyHtmlByLocale ?? {}).sort()).toEqual([...supportedLocales].sort())
    expect(campaign?.subjectByLocale?.de).toBe('⚽️ Kader absenden und Punkte sichern')
    expect(campaign?.bodyHtml).toContain('{{logo_url}}')
    expect(campaign?.bodyHtml).toContain('{{builder_url}}')
    expect(campaign?.bodyHtmlByLocale?.de).toContain('Kader jetzt einreichen')
    expect(campaign?.bodyHtmlByLocale?.de).toContain('Hallo liebe Turnier-Teilnehmer')
  })

  it('does not overwrite a manually edited one-off newsletter on later bootstraps', async () => {
    const repository = new MemoryEmailMarketingRepository()
    const seed = defaultEmailCampaigns.find(
      (candidate) => candidate.kind === 'newsletter' && candidate.subject === firstSwapReminderSubject,
    )

    expect(seed).toBeDefined()
    const existing = await repository.saveCampaign(
      {
        ...seed!,
        status: 'draft',
        bodyHtml: '<p>Manual edit kept for testing.</p>',
      },
      'admin@example.com',
    )

    await bootstrapDefaultEmailCampaigns(repository)

    const campaign = await repository.getCampaign(existing.campaignId)
    expect(campaign?.status).toBe('draft')
    expect(campaign?.bodyHtml).toBe('<p>Manual edit kept for testing.</p>')
  })

  it('keeps system-owned one-off newsletter seeds current until they start sending', async () => {
    const repository = new MemoryEmailMarketingRepository()
    const seed = defaultEmailCampaigns.find(
      (candidate) => candidate.kind === 'newsletter' && candidate.subject === firstSwapReminderSubject,
    )

    expect(seed).toBeDefined()
    const existing = await repository.saveCampaign(
      {
        ...seed!,
        bodyHtml: '<p>Old system seed.</p>',
      },
      'system@svworldcup.local',
    )

    await bootstrapDefaultEmailCampaigns(repository)

    const campaign = await repository.getCampaign(existing.campaignId)
    expect(campaign?.bodyHtml).toContain('{{help_url}}')
    expect(campaign?.bodyHtml).not.toBe('<p>Old system seed.</p>')
  })
})
