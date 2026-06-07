import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { AboutPage } from './pages/AboutPage'
import { HelpPage } from './pages/HelpPage'
import { HomePage } from './pages/HomePage'
import { HowToPlayPage } from './pages/HowToPlayPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { PrizesPage } from './pages/PrizesPage'
import { RulesPage } from './pages/RulesPage'

// Build-time prerendering of the static marketing routes (see
// architecture/SOP_system_overview.md "SEO & Discoverability"). Each page renders in isolation with
// English copy and no live data fetch (data hooks resolve to their defaults during renderToString,
// since effects do not run), so a crawler that does not execute JavaScript still receives real
// content. The server injects the per-route <head> at request time; this entry only produces the body.
const PRERENDER_LOCALE = 'en'

const routeElements: Record<string, () => ReactElement> = {
  '/': () => <HomePage locale={PRERENDER_LOCALE} />,
  '/prizes': () => <PrizesPage locale={PRERENDER_LOCALE} />,
  '/rules': () => <RulesPage locale={PRERENDER_LOCALE} />,
  '/help': () => <HelpPage locale={PRERENDER_LOCALE} />,
  '/about': () => <AboutPage locale={PRERENDER_LOCALE} />,
  '/privacy': () => <PrivacyPage locale={PRERENDER_LOCALE} />,
  '/how-to-play': () => <HowToPlayPage locale={PRERENDER_LOCALE} />,
}

export const prerenderPaths = Object.keys(routeElements)

export function renderRoute(path: string): string {
  const element = routeElements[path]
  if (!element) {
    throw new Error(`No prerender route registered for ${path}`)
  }
  return renderToString(<StaticRouter location={path}>{element()}</StaticRouter>)
}
