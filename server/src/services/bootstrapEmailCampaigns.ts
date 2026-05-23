import { defaultEmailCampaigns } from '../data/defaultEmailCampaigns.js'
import type { EmailMarketingRepository } from '../repositories/emailMarketingRepository.js'

export async function bootstrapDefaultEmailCampaigns(emailMarketingRepository: EmailMarketingRepository) {
  const campaigns = await emailMarketingRepository.listCampaigns()

  for (const seed of defaultEmailCampaigns) {
    const existing = campaigns.find(
      (campaign) =>
        campaign.kind === seed.kind &&
        campaign.triggerKey === seed.triggerKey &&
        campaign.subject === seed.subject &&
        campaign.audienceLeague === seed.audienceLeague,
    )

    if (existing) {
      await emailMarketingRepository.saveCampaign({ ...seed, campaignId: existing.campaignId }, 'system@svworldcup.local')
      continue
    }

    await emailMarketingRepository.saveCampaign(seed, 'system@svworldcup.local')
  }
}
