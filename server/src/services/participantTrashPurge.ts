import type { RegistrationRepository } from '../repositories/registrationRepository.js'
import { logger } from '../lib/logger.js'

const purgeIntervalMs = 60 * 60 * 1000

export function startParticipantTrashPurgeScheduler(registrationRepository: RegistrationRepository) {
  if (process.env.NODE_ENV === 'test') {
    return
  }

  async function run() {
    try {
      const deleted = await registrationRepository.purgeExpiredParticipantTrash(100)
      if (deleted > 0) {
        logger.info({ deleted }, 'Purged expired participant trash entries')
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to purge expired participant trash entries')
    }
  }

  void run()
  const interval = setInterval(() => void run(), purgeIntervalMs)
  interval.unref?.()
}
