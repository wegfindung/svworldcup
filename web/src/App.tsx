import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
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
import { AdminPage } from './pages/AdminPage'
import { BuilderPage } from './pages/BuilderPage'
import { HomePage } from './pages/HomePage'
import { PlayerLoginPage } from './pages/PlayerLoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { PrizesPage } from './pages/PrizesPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { RulesPage } from './pages/RulesPage'
import { ResultsPage } from './pages/ResultsPage'
import { ShareComposerPage } from './pages/ShareComposerPage'
import { TablesPage } from './pages/TablesPage'
import { TournamentClosedPage } from './pages/TournamentClosedPage'
import { VerifyPage } from './pages/VerifyPage'

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
  const { data: bootstrap } = useBootstrap()
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
              <span className="block h-[3.35rem] w-[9.4rem] overflow-hidden sm:h-[5.25rem] sm:w-[14.5rem] lg:w-[15.5rem]">
                <img
                  src="/brand/logo-nav.webp"
                  alt={copy.nav.logoAlt}
                  width={960}
                  height={640}
                  className="h-auto w-[9.4rem] max-w-none -translate-y-[1.08rem] transition duration-500 group-hover:scale-[1.03] sm:w-[14.5rem] sm:-translate-y-7 lg:w-[15.5rem]"
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
            <Route path="/tables" element={<TablesPage locale={locale} />} />
            <Route path="/verify" element={<VerifyPage locale={locale} registrationClosed={registrationClosed} />} />
            <Route path="/reset-password" element={<ResetPasswordPage locale={locale} />} />
            <Route path="/admin/*" element={<AdminPage locale={locale} />} />
            <Route path="/profiles/:slug" element={<ProfilePage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
