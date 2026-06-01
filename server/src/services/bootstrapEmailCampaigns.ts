import { defaultEmailCampaigns } from '../data/defaultEmailCampaigns.js'
import type { EmailMarketingRepository } from '../repositories/emailMarketingRepository.js'

const previousEventName = ['Soccerverse', 'World', 'Cup'].join(' ')
const legacySeedSubjects = new Map<string, string[]>([
  ['The Grand Tournament - How it works', [`${previousEventName} Event - How it works`]],
])

export async function bootstrapDefaultEmailCampaigns(emailMarketingRepository: EmailMarketingRepository) {
  const campaigns = await emailMarketingRepository.listCampaigns()

  for (const seed of defaultEmailCampaigns) {
    const legacySubjects = legacySeedSubjects.get(seed.subject) ?? []
    const existing = campaigns.find(
      (campaign) =>
        campaign.kind === seed.kind &&
        campaign.triggerKey === seed.triggerKey &&
        (campaign.subject === seed.subject || legacySubjects.includes(campaign.subject)) &&
        campaign.audienceStatus === seed.audienceStatus &&
        campaign.audienceLeague === seed.audienceLeague,
    )

    if (existing) {
      if (seed.kind === 'newsletter') {
        const wasManuallyEdited = existing.updatedBy !== 'system@svworldcup.local'
        const hasStartedSending = existing.status === 'sending' || existing.status === 'sent'
        if (wasManuallyEdited || hasStartedSending) {
          continue
        }
      }

      await emailMarketingRepository.saveCampaign({ ...seed, campaignId: existing.campaignId }, 'system@svworldcup.local')
      continue
    }

    await emailMarketingRepository.saveCampaign(seed, 'system@svworldcup.local')
  }
}
