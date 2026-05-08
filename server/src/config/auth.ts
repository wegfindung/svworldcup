import { env } from './env.js'

export const participantSessionCookieName = 'svworldcup_participant'
export const adminSessionCookieName = 'svworldcup_admin'
export const participantSessionTtlSeconds = 60 * 60 * 24 * 30
export const adminSessionTtlSeconds = 60 * 60 * 12

export function shouldUseSecureCookies() {
  return env.NODE_ENV === 'production'
}
