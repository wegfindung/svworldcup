import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'
import type { EmailMarketingRepository } from '../repositories/emailMarketingRepository.js'
import { recordOperationEvent } from './operationsMonitor.js'

let started = false

export function startEmailMarketingScheduler(emailMarketingRepository: EmailMarketingRepository) {
  if (started || env.NODE_ENV === 'test') {
    return
  }
  started = true

  const run = () => {
    const startedAt = Date.now()
    void emailMarketingRepository.runDueCampaigns(10)
      .then((results) => {
        const sent = results.reduce((sum, result) => sum + result.sent, 0)
        const failed = results.reduce((sum, result) => sum + result.failed, 0)
        const pending = results.reduce((sum, result) => sum + result.pending, 0)
        recordOperationEvent({
          type: 'email_scheduler',
          status: failed > 0 ? 'warning' : 'ok',
          message: results.length ? `Processed ${results.length} due email campaign(s).` : 'No due email campaigns.',
          detail: {
            durationMs: Date.now() - startedAt,
            campaignCount: results.length,
            sent,
            failed,
            pending,
          },
        })
      })
      .catch((error) => {
        recordOperationEvent({
          type: 'email_scheduler',
          status: 'error',
          message: 'Failed to run due email campaigns.',
          detail: {
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
          },
        })
        logger.error({ err: error }, 'Failed to run due email campaigns')
      })
  }

  run()
  const timer = setInterval(run, 60_000)
  timer.unref()
}
