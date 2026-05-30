import { Suspense, lazy, useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LocaleRail } from './components/LocaleRail'
import { supportedLocales } from './data/eventConfig'
import { useBootstrap } from './hooks/useBootstrap'
import { getMessages } from './i18n/messages'
import { recordReferralClick } from './lib/api'
import { hasRegistrationClosed, resolveRegistrationCloseEpoch } from './lib/competitionWindow'
import {
  readReferralFromSearch,
  resolveReferrerSoccerverseUsername,
  storeReferrerSoccerverseUsername,
  withReferral,
} from './lib/referral'
import type { LocaleCode } from './lib/types'

const AboutPage = lazy(() => import('./pages/AboutPage').then((module) => ({ default: module.AboutPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })))
const BuilderPage = lazy(() => import('./pages/BuilderPage').then((module) => ({ default: module.BuilderPage })))
const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const PlayerLoginPage = lazy(() => import('./pages/PlayerLoginPage').then((module) => ({ default: module.PlayerLoginPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const PrizesPage = lazy(() => import('./pages/PrizesPage').then((module) => ({ default: module.PrizesPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))
const ResultsPage = lazy(() => import('./pages/ResultsPage').then((module) => ({ default: module.ResultsPage })))
const RulesPage = lazy(() => import('./pages/RulesPage').then((module) => ({ default: module.RulesPage })))
const ShareComposerPage = lazy(() => import('./pages/ShareComposerPage').then((module) => ({ default: module.ShareComposerPage })))
const TablesPage = lazy(() => import('./pages/TablesPage').then((module) => ({ default: module.TablesPage })))
const TournamentClosedPage = lazy(() =>
  import('./pages/TournamentClosedPage').then((module) => ({ default: module.TournamentClosedPage })),
)
const VerifyPage = lazy(() => import('./pages/VerifyPage').then((module) => ({ default: module.VerifyPage })))

function RouteFallback() {
  return (
    <section className="glass-panel rounded-[1.15rem] p-5">
      <div className="skeleton h-40 rounded-[1rem]" />
    </section>
  )
}

function App() {
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [locale, setLocale] = useState<LocaleCode>(() => {
    if (typeof window === 'undefined') {
      return supportedLocales[0]
    }

    const storedLocale = window.localStorage.getItem('svworldcup-locale')
    if (storedLocale && supportedLocales.includes(storedLocale as LocaleCode)) {
      return storedLocale as LocaleCode
    }

    return supportedLocales[0]
  })

  useEffect(() => {
    window.localStorage.setItem('svworldcup-locale', locale)
  }, [locale])

  const referrerSoccerverseUsername = resolveReferrerSoccerverseUsername(location.search)
  const copy = getMessages(locale)
  const { data: bootstrap, error: bootstrapError } = useBootstrap()
  const registrationCloseEpoch = resolveRegistrationCloseEpoch(bootstrap?.registrationCloseEpoch)
  const registrationClosed = hasRegistrationClosed(registrationCloseEpoch)

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
                  src="/brand/logo-nav-tournament-large.webp"
                  alt={copy.nav.logoAlt}
                  width={1536}
                  height={1024}
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
                  {copy.nav.account.map((item) => (
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

              <div className="grid grid-cols-2 gap-2">
                {copy.nav.account.map((item) => (
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
              <Route path="/prizes" element={<PrizesPage locale={locale} />} />
              <Route path="/rules" element={<RulesPage locale={locale} />} />
              <Route path="/about" element={<AboutPage locale={locale} />} />
              <Route path="/tables" element={<TablesPage locale={locale} />} />
              <Route path="/verify" element={<VerifyPage locale={locale} registrationClosed={registrationClosed} />} />
              <Route path="/reset-password" element={<ResetPasswordPage locale={locale} />} />
              <Route path="/admin/*" element={<AdminPage locale={locale} />} />
              <Route path="/profiles/:slug" element={<ProfilePage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default App
