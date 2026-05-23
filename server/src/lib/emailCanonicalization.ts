import { domainToASCII } from 'node:url'

export interface CanonicalEmail {
  normalizedEmail: string
  canonicalEmail: string
  canonicalDomain: string
  provider: 'gmail' | 'microsoft' | 'generic'
}

const gmailDomains = new Set(['gmail.com', 'googlemail.com'])
const microsoftDomains = new Set(['outlook.com', 'hotmail.com', 'live.com'])

function splitEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const at = normalizedEmail.lastIndexOf('@')
  if (at <= 0 || at === normalizedEmail.length - 1) {
    return null
  }

  const localPart = normalizedEmail.slice(0, at)
  const rawDomain = normalizedEmail.slice(at + 1)
  const asciiDomain = domainToASCII(rawDomain) || rawDomain
  return {
    normalizedEmail: `${localPart}@${asciiDomain}`,
    localPart,
    domain: asciiDomain,
  }
}

function stripPlusTag(localPart: string) {
  return localPart.split('+', 1)[0]
}

export function canonicalizeEmail(email: string): CanonicalEmail {
  const parsed = splitEmail(email)
  if (!parsed) {
    const normalizedEmail = email.trim().toLowerCase()
    return {
      normalizedEmail,
      canonicalEmail: normalizedEmail,
      canonicalDomain: '',
      provider: 'generic',
    }
  }

  if (gmailDomains.has(parsed.domain)) {
    const canonicalLocal = stripPlusTag(parsed.localPart).replace(/\./g, '')
    return {
      normalizedEmail: parsed.normalizedEmail,
      canonicalEmail: `${canonicalLocal}@gmail.com`,
      canonicalDomain: 'gmail.com',
      provider: 'gmail',
    }
  }

  if (microsoftDomains.has(parsed.domain)) {
    const canonicalLocal = stripPlusTag(parsed.localPart)
    return {
      normalizedEmail: parsed.normalizedEmail,
      canonicalEmail: `${canonicalLocal}@${parsed.domain}`,
      canonicalDomain: parsed.domain,
      provider: 'microsoft',
    }
  }

  return {
    normalizedEmail: parsed.normalizedEmail,
    canonicalEmail: parsed.normalizedEmail,
    canonicalDomain: parsed.domain,
    provider: 'generic',
  }
}
