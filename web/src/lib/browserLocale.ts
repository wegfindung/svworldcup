import { defaultLocale, supportedLocales } from '../data/eventConfig'
import type { LocaleCode } from './types'

export function detectBrowserLocale(): LocaleCode {
  if (typeof window === 'undefined') {
    return defaultLocale
  }

  const candidates = [...(window.navigator.languages ?? []), window.navigator.language]
  for (const candidate of candidates) {
    const primary = candidate?.trim().toLowerCase().split('-')[0]
    if (primary && supportedLocales.includes(primary as LocaleCode)) {
      return primary as LocaleCode
    }
  }

  return defaultLocale
}
