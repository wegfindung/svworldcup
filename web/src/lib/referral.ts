const storageKey = 'svworldcup-referrer-soccerverse-username'

const referralParamNames = ['ref', 'sv_ref', 'soccerverse_ref', 'referrer', 'referrerSoccerverseUsername'] as const
const defaultShareReferrers = ['ackydraal', 'Libertaerx', 'Blvck9999', 'klo'] as const

export function sanitizeReferrerSoccerverseUsername(value: string) {
  const trimmed = value.trim().replace(/^@+/, '')
  if (!trimmed) {
    return ''
  }

  return trimmed.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60)
}

export function readReferralFromSearch(search: string) {
  const params = new URLSearchParams(search)
  for (const name of referralParamNames) {
    const value = params.get(name)
    if (!value) {
      continue
    }

    const sanitized = sanitizeReferrerSoccerverseUsername(value)
    if (sanitized) {
      return sanitized
    }
  }

  return ''
}

export function storeReferrerSoccerverseUsername(value: string) {
  if (typeof window === 'undefined') {
    return
  }

  const sanitized = sanitizeReferrerSoccerverseUsername(value)
  if (sanitized) {
    window.sessionStorage.setItem(storageKey, sanitized)
  }
}

export function readStoredReferrerSoccerverseUsername() {
  if (typeof window === 'undefined') {
    return ''
  }

  return sanitizeReferrerSoccerverseUsername(window.sessionStorage.getItem(storageKey) ?? '')
}

export function resolveReferrerSoccerverseUsername(search: string) {
  return readReferralFromSearch(search) || readStoredReferrerSoccerverseUsername()
}

export function withReferral(path: string, referrerSoccerverseUsername: string) {
  const referrer = sanitizeReferrerSoccerverseUsername(referrerSoccerverseUsername)
  if (!referrer) {
    return path
  }

  const [base, hash] = path.split('#', 2)
  const [pathname, search] = base.split('?', 2)
  const params = new URLSearchParams(search ?? '')
  if (!params.has('ref')) {
    params.set('ref', referrer)
  }

  const nextSearch = params.toString()
  return `${pathname}${nextSearch ? `?${nextSearch}` : ''}${hash ? `#${hash}` : ''}`
}

export function buildLandingReferralUrl(referrerSoccerverseUsername: string, origin?: string) {
  const baseOrigin = origin ?? (typeof window === 'undefined' ? 'https://worldcup.svtool.info' : window.location.origin)
  const normalizedOrigin = baseOrigin.replace(/\/+$/, '')
  const referrer = sanitizeReferrerSoccerverseUsername(referrerSoccerverseUsername)
  if (referrer) {
    return `${normalizedOrigin}?ref=${encodeURIComponent(referrer)}`
  }

  return normalizedOrigin
}

export function getDefaultShareReferrerSoccerverseUsername(seed = '') {
  const normalizedSeed = seed.trim()
  if (!normalizedSeed) {
    return defaultShareReferrers[Math.floor(Math.random() * defaultShareReferrers.length)]
  }

  const seedHash = [...normalizedSeed].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0)
  return defaultShareReferrers[seedHash % defaultShareReferrers.length]
}

export function resolveShareReferrerSoccerverseUsername(soccerverseUsername?: string, seed?: string) {
  return sanitizeReferrerSoccerverseUsername(soccerverseUsername ?? '') || getDefaultShareReferrerSoccerverseUsername(seed)
}

export function buildReferralInvitationText(referrerSoccerverseUsername: string, origin?: string) {
  return `Show that you have the best soccer knowledge and join the competition ${buildLandingReferralUrl(
    referrerSoccerverseUsername,
    origin,
  )}`
}
