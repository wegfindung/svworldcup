import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LocaleRail } from './components/LocaleRail'
import { supportedLocales } from './data/eventConfig'
import { detectBrowserLocale } from './lib/browserLocale'
import { useBootstrap } from './hooks/useBootstrap'
import { getShellMessages } from './i18n/shellMessages'
import { recordReferralClick } from './lib/api'
import { hasRegistrationClosed, resolveRegistrationCloseEpoch } from './lib/competitionWindow'
import { readParticipantReady, subscribeParticipantReady } from './lib/participantReady'
import {
  getDefaultShareReferrerSoccerverseUsername,
  readReferralFromSearch,
  resolveReferrerSoccerverseUsername,
  storeReferrerSoccerverseUsername,
  withReferral,
} from './lib/referral'
import type { LocaleCode } from './lib/types'

const AboutPage = lazy(() => import('./pages/AboutPage').then((module) => ({ default: module.AboutPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })))
const BuilderPage = lazy(() => import('./pages/BuilderPage').then((module) => ({ default: module.BuilderPage })))
const HelpPage = lazy(() => import('./pages/HelpPage').then((module) => ({ default: module.HelpPage })))
const HowToPlayPage = lazy(() => import('./pages/HowToPlayPage').then((module) => ({ default: module.HowToPlayPage })))
const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const PlayerLoginPage = lazy(() => import('./pages/PlayerLoginPage').then((module) => ({ default: module.PlayerLoginPage })))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((module) => ({ default: module.PrivacyPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const PrizesPage = lazy(() => import('./pages/PrizesPage').then((module) => ({ default: module.PrizesPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))
const ResultsPage = lazy(() => import('./pages/ResultsPage').then((module) => ({ default: module.ResultsPage })))
const RulesPage = lazy(() => import('./pages/RulesPage').then((module) => ({ default: module.RulesPage })))
const ShareComposerPage = lazy(() => import('./pages/ShareComposerPage').then((module) => ({ default: module.ShareComposerPage })))
const StatsPage = lazy(() => import('./pages/StatsPage').then((module) => ({ default: module.StatsPage })))
const TablesPage = lazy(() => import('./pages/TablesPage').then((module) => ({ default: module.TablesPage })))
const TournamentClosedPage = lazy(() =>
  import('./pages/TournamentClosedPage').then((module) => ({ default: module.TournamentClosedPage })),
)
const VerifyPage = lazy(() => import('./pages/VerifyPage').then((module) => ({ default: module.VerifyPage })))

function RouteFallback() {
  return (
    <section className="glass-panel min-h-[70dvh] rounded-[1.15rem] p-5">
      <div className="skeleton h-40 rounded-[1rem]" />
    </section>
  )
}

function readLocaleFromSearch(search: string) {
  const params = new URLSearchParams(search)
  const rawLocale = params.get('share_locale') ?? params.get('lang') ?? params.get('locale') ?? ''
  const normalizedLocale = rawLocale.trim().toLowerCase().split(/[-_]/, 1)[0] as LocaleCode
  return supportedLocales.includes(normalizedLocale) ? normalizedLocale : null
}

function App() {
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [footerAffiliateReferrer] = useState(() => getDefaultShareReferrerSoccerverseUsername())
  const [locale, setLocale] = useState<LocaleCode>(() => {
    if (typeof window === 'undefined') {
      return supportedLocales[0]
    }

    const searchLocale = readLocaleFromSearch(window.location.search)
    if (searchLocale) {
      return searchLocale
    }

    const storedLocale = window.localStorage.getItem('svworldcup-locale')
    if (storedLocale && supportedLocales.includes(storedLocale as LocaleCode)) {
      return storedLocale as LocaleCode
    }

    // First-time visitor with no explicit choice → match the browser language when we support it.
    return detectBrowserLocale()
  })

  const [participantReady, setParticipantReady] = useState(() => readParticipantReady())
  const importantMenuRef = useRef<HTMLDetailsElement>(null)

  // Keep the nav in sync with same-tab login/logout (App never unmounts on SPA navigation).
  useEffect(() => subscribeParticipantReady(() => setParticipantReady(readParticipantReady())), [])

  // Native <details> only toggles on its own summary, so the guide dropdown would stay open after a click
  // elsewhere on the page. Close it on any outside pointer press so it behaves like a normal menu.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const menu = importantMenuRef.current
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.removeAttribute('open')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('svworldcup-locale', locale)
  }, [locale])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const referrerSoccerverseUsername = resolveReferrerSoccerverseUsername(location.search)
  const copy = getShellMessages(locale)
  const footerCopy = copy.footer
  const { data: bootstrap, error: bootstrapError } = useBootstrap()
  const registrationCloseEpoch = resolveRegistrationCloseEpoch(bootstrap?.registrationCloseEpoch)
  const registrationClosed = hasRegistrationClosed(registrationCloseEpoch)
  // When logged in, the "Login" item becomes the participant's name linking to their dashboard
  // (/builder) instead of the login page. Logged out keeps the localized "Login" item as-is.
  const headerAccountItems = copy.nav.account
    .filter((item) => item.to !== '/admin')
    .map((item) =>
      item.to === '/login' && participantReady ? { to: '/builder', label: participantReady.displayName } : item,
    )
  const adminItem = copy.nav.account.find((item) => item.to === '/admin')
  const footerAffiliateUrl = `https://play.soccerverse.com/?ref=${encodeURIComponent(footerAffiliateReferrer)}`
  const importantActive = copy.nav.important.items.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  )

  useEffect(() => {
    const referrer = readReferralFromSearch(location.search)
    if (referrer) {
      storeReferrerSoccerverseUsername(referrer)
      const clickStorageKey = `svworldcup-referral-click:${referrer}`
      if (!window.sessionStorage.getItem(clickStorageKey)) {
        window.sessionStorage.setItem(clickStorageKey, '1')
        void recordReferralClick(referrer, `${location.pathname}${location.search}`).catch(() => undefined)
      }
    }
  }, [location.pathname, location.search])

  return (
    <div className="stadium-shell min-h-[100dvh] bg-[var(--color-ink)] text-[var(--color-paper)]">
      <div className="noise-layer" />
      <div className="relative z-[2] mx-auto flex min-h-[100dvh] max-w-[1440px] flex-col px-3 py-3 sm:px-5 lg:px-7">
        <header className="premium-nav z-20 mb-4 flex flex-col gap-3 rounded-[1.15rem] px-3 py-2 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <NavLink
              to={withReferral('/', referrerSoccerverseUsername)}
              onClick={() => setMobileNavOpen(false)}
              className="group flex shrink-0 items-center transition active:scale-[0.99]"
            >
              <span className="block h-[4.25rem] w-fit sm:h-[6.75rem] lg:h-[8.25rem] xl:h-[8.75rem]">
                <img
                  src="/brand/logo-nav-tournament-280.webp"
                  srcSet="/brand/logo-nav-tournament-280.webp 280w, /brand/logo-nav-tournament-560.webp 560w"
                  sizes="(min-width: 1280px) 276px, (min-width: 1024px) 260px, (min-width: 640px) 213px, 134px"
                  alt={copy.nav.logoAlt}
                  width={560}
                  height={284}
                  decoding="async"
                  className="h-full w-auto object-contain transition duration-500 group-hover:scale-[1.03]"
                />
              </span>
            </NavLink>

            <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
              <div className="hidden items-center justify-end gap-2 lg:flex">
                <nav className="flex items-center rounded-full border border-white/8 bg-black/20 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  {copy.nav.primary.map((item) => (
                    <NavLink
                      key={item.to}
                      to={withReferral(item.to, referrerSoccerverseUsername)}
                      className={({ isActive }) =>
                        [
                          'rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em]',
                          isActive
                            ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                            : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white active:scale-[0.98]',
                        ].join(' ')
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}

                  <details ref={importantMenuRef} className="nav-disclosure group relative">
                    <summary
                      className={[
                        'flex cursor-pointer list-none items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em]',
                        importantActive
                          ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                          : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white active:scale-[0.98]',
                      ].join(' ')}
                    >
                      {copy.nav.important.label}
                      <svg
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-[var(--color-accent)] transition group-open:rotate-180"
                      >
                        <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </summary>
                    <div className="absolute right-0 top-[calc(100%+0.55rem)] z-30 grid min-w-44 gap-1 rounded-[1rem] border border-white/10 bg-[rgba(7,16,14,0.98)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_70px_-38px_rgba(0,0,0,0.96)]">
                      {copy.nav.important.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={withReferral(item.to, referrerSoccerverseUsername)}
                          onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}
                          className={({ isActive }) =>
                            [
                              'rounded-[0.75rem] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]',
                              isActive
                                ? 'bg-white/10 text-white'
                                : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white active:scale-[0.98]',
                            ].join(' ')
                          }
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </details>
                </nav>

                {registrationClosed ? null : (
                  <NavLink
                    to={withReferral('/register', referrerSoccerverseUsername)}
                    className={({ isActive }) =>
                      [
                        'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] active:scale-[0.98]',
                        isActive
                          ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                          : 'border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)]',
                      ].join(' ')
                    }
                  >
                    {copy.nav.register}
                  </NavLink>
                )}

                <nav className="flex items-center rounded-full border border-white/8 bg-black/14 p-1">
                  {headerAccountItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={withReferral(item.to, referrerSoccerverseUsername)}
                      className={({ isActive }) =>
                        [
                          'rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]',
                          isActive
                            ? 'bg-[var(--color-sand)]/14 text-[var(--color-sand)]'
                            : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white active:scale-[0.98]',
                        ].join(' ')
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
              </div>

              <LocaleRail
                activeLocale={locale}
                locales={supportedLocales}
                onChange={setLocale}
              />

              <button
                type="button"
                aria-label={copy.nav.toggle}
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen((current) => !current)}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/4 transition duration-300 ease-out hover:bg-white/8 active:scale-[0.96] lg:hidden"
              >
                <span className="grid gap-1">
                  <span className={['block h-0.5 w-4 rounded-full bg-white transition', mobileNavOpen ? 'translate-y-1.5 rotate-45' : ''].join(' ')} />
                  <span className={['block h-0.5 w-4 rounded-full bg-white transition', mobileNavOpen ? 'opacity-0' : ''].join(' ')} />
                  <span className={['block h-0.5 w-4 rounded-full bg-white transition', mobileNavOpen ? '-translate-y-1.5 -rotate-45' : ''].join(' ')} />
                </span>
              </button>
            </div>
          </div>

          {mobileNavOpen ? (
            <nav className="grid gap-3 border-t border-white/8 pt-3 lg:hidden">
              {registrationClosed ? null : (
                <NavLink
                  to={withReferral('/register', referrerSoccerverseUsername)}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    [
                      'rounded-full px-3 py-2.5 text-center text-xs font-bold uppercase tracking-[0.14em]',
                      isActive
                        ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                        : 'border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
                    ].join(' ')
                  }
                >
                  {copy.nav.register}
                </NavLink>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {copy.nav.primary.map((item) => (
                  <NavLink
                    key={item.to}
                    to={withReferral(item.to, referrerSoccerverseUsername)}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      [
                        'rounded-full px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em]',
                        isActive
                          ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                          : 'border border-white/8 bg-black/20 text-[var(--color-muted)] hover:bg-white/7 hover:text-white active:scale-[0.98]',
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <div className="grid gap-2 rounded-[1rem] border border-white/8 bg-black/14 p-2">
                <p className="mono px-1 text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">{copy.nav.important.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {copy.nav.important.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={withReferral(item.to, referrerSoccerverseUsername)}
                      onClick={() => setMobileNavOpen(false)}
                      className={({ isActive }) =>
                        [
                          'rounded-full px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em]',
                          isActive
                            ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                            : 'border border-white/8 bg-black/20 text-[var(--color-muted)] hover:bg-white/7 hover:text-white active:scale-[0.98]',
                        ].join(' ')
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {headerAccountItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={withReferral(item.to, referrerSoccerverseUsername)}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      [
                        'rounded-full px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em]',
                        isActive
                          ? 'bg-[var(--color-sand)]/14 text-[var(--color-sand)]'
                          : 'border border-white/8 bg-black/20 text-[var(--color-muted)] hover:bg-white/7 hover:text-white active:scale-[0.98]',
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </nav>
          ) : null}
        </header>

        <main className="flex-1 reveal-in">
          {bootstrapError ? (
            <div
              role="status"
              className="mb-4 rounded-[1rem] border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
            >
              {copy.bootstrapError.message}
            </div>
          ) : null}
          <ErrorBoundary key={location.pathname} copy={copy.errorBoundary}>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
              <Route path="/" element={<HomePage locale={locale} referrerSoccerverseUsername={referrerSoccerverseUsername} />} />
              <Route
                path="/register"
                element={
                  registrationClosed ? (
                    <TournamentClosedPage locale={locale} />
                  ) : (
                    <BuilderPage
                      key="register"
                      locale={locale}
                      referrerSoccerverseUsername={referrerSoccerverseUsername}
                      mode="register"
                    />
                  )
                }
              />
              <Route
                path="/builder"
                element={
                  <BuilderPage
                    key="builder"
                    locale={locale}
                    referrerSoccerverseUsername={referrerSoccerverseUsername}
                    mode="builder"
                  />
                }
              />
              <Route path="/login" element={<PlayerLoginPage locale={locale} referrerSoccerverseUsername={referrerSoccerverseUsername} />} />
              <Route path="/builder/share" element={<ShareComposerPage locale={locale} />} />
              <Route path="/results" element={<ResultsPage locale={locale} />} />
              <Route path="/stats" element={<StatsPage locale={locale} active="usage" />} />
              <Route path="/stats/points" element={<StatsPage locale={locale} active="points" />} />
              <Route path="/stats/leaders" element={<StatsPage locale={locale} active="leaders" />} />
              <Route path="/stats/value" element={<StatsPage locale={locale} active="value" />} />
              <Route path="/stats/best-xi" element={<StatsPage locale={locale} active="bestxi" />} />
              <Route path="/stats/boosts" element={<StatsPage locale={locale} active="boosts" />} />
              <Route path="/stats/budgets" element={<StatsPage locale={locale} active="budgets" />} />
              <Route path="/squad-usage" element={<Navigate to="/stats" replace />} />
              <Route path="/prizes" element={<PrizesPage locale={locale} />} />
              <Route path="/rules" element={<RulesPage locale={locale} />} />
              <Route path="/help" element={<HelpPage locale={locale} />} />
              <Route path="/how-to-play" element={<HowToPlayPage locale={locale} />} />
              <Route path="/about" element={<AboutPage locale={locale} />} />
              <Route path="/privacy" element={<PrivacyPage locale={locale} />} />
              <Route path="/tables" element={<TablesPage locale={locale} />} />
              <Route path="/verify" element={<VerifyPage locale={locale} registrationClosed={registrationClosed} />} />
              <Route path="/reset-password" element={<ResetPasswordPage locale={locale} />} />
              <Route path="/admin/*" element={<AdminPage locale={locale} />} />
              <Route path="/profiles/:slug" element={<ProfilePage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>

        <footer className="mt-8 grid gap-5 border-t border-white/10 py-6 text-sm text-[var(--color-muted)] md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="max-w-[44rem]">
            <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-accent)]">{footerCopy.event}</p>
            <p className="mt-2 leading-relaxed">{footerCopy.note}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <a
              href={footerAffiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[var(--color-accent)]/28 bg-[var(--color-accent)]/10 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] active:scale-[0.98]"
              aria-label={footerCopy.mainProject}
            >
              {footerCopy.playSoccerverse}
            </a>
            <NavLink
              to={withReferral('/help', referrerSoccerverseUsername)}
              className="rounded-full border border-white/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:bg-white/7 hover:text-white active:scale-[0.98]"
            >
              {footerCopy.help}
            </NavLink>
            <NavLink
              to={withReferral('/about', referrerSoccerverseUsername)}
              className="rounded-full border border-white/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:bg-white/7 hover:text-white active:scale-[0.98]"
            >
              {footerCopy.about}
            </NavLink>
            <NavLink
              to={withReferral('/privacy', referrerSoccerverseUsername)}
              className="rounded-full border border-white/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:bg-white/7 hover:text-white active:scale-[0.98]"
            >
              {footerCopy.privacy}
            </NavLink>
            {adminItem ? (
              <NavLink
                to={withReferral(adminItem.to, referrerSoccerverseUsername)}
                className="rounded-full border border-white/10 bg-black/14 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:bg-white/7 hover:text-white active:scale-[0.98]"
              >
                {footerCopy.admin}
              </NavLink>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
