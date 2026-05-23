import { defaultLocale, supportedLocales } from '../data/worldCupSeed.js'
import type { SupportedLocale } from '../domain/types.js'

export function normalizeSupportedLocale(value?: string | null): SupportedLocale | undefined {
  const raw = value?.trim().toLowerCase()
  if (!raw) {
    return undefined
  }

  const primary = raw.split(';')[0]?.split(',')[0]?.split('-')[0]?.trim()
  if (primary && supportedLocales.includes(primary as SupportedLocale)) {
    return primary as SupportedLocale
  }

  return undefined
}

export function resolveBrowserLocale(browserLocale?: string | null, acceptLanguage?: string | null): SupportedLocale {
  const explicitLocale = normalizeSupportedLocale(browserLocale)
  if (explicitLocale) {
    return explicitLocale
  }

  const headerLocales = acceptLanguage?.split(',') ?? []
  for (const item of headerLocales) {
    const locale = normalizeSupportedLocale(item)
    if (locale) {
      return locale
    }
  }

  return defaultLocale
}
