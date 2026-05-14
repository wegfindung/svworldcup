import { env } from '../config/env.js'
import type { EmailMarketingRepository } from '../repositories/emailMarketingRepository.js'

let started = false

export function startEmailMarketingScheduler(emailMarketingRepository: EmailMarketingRepository) {
  if (started || env.NODE_ENV === 'test') {
    return
  }
  started = true

  const run = () => {
    void emailMarketingRepository.runDueCampaigns(10).catch((error) => {
      console.error('Failed to run due email campaigns', error)
    })
  }

  run()
  const timer = setInterval(run, 60_000)
  timer.unref()
}
