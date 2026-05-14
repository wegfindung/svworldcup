import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { LocaleRail } from './components/LocaleRail'
import { supportedLocales } from './data/eventConfig'
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
import { ProfilePage } from './pages/ProfilePage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ShareComposerPage } from './pages/ShareComposerPage'
import { TablesPage } from './pages/TablesPage'
import { VerifyPage } from './pages/VerifyPage'

const navigation = [
  { to: '/', label: 'Overview' },
  { to: '/builder', label: 'Builder' },
  { to: '/tables', label: 'Tables' },
  { to: '/admin', label: 'Admin' },
]

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

  useEffect(() => {
    const referrer = readReferralFromSearch(location.search)
    if (referrer) {
      storeReferrerSoccerverseUsername(referrer)
    }
  }, [location.search])

  return (
    <div className="stadium-shell min-h-[100dvh] bg-[var(--color-ink)] text-[var(--color-paper)]">
      <div className="noise-layer" />
      <div className="relative z-[2] mx-auto flex min-h-[100dvh] max-w-[1440px] flex-col px-3 py-3 sm:px-5 lg:px-7">
        <header className="premium-nav sticky top-3 z-20 mb-4 flex flex-col gap-3 rounded-[1.15rem] px-3 py-2 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <NavLink
              to={withReferral('/', referrerSoccerverseUsername)}
              onClick={() => setMobileNavOpen(false)}
              className="group flex shrink-0 items-center transition active:scale-[0.99]"
            >
              <span className="block h-[3.35rem] w-[9.4rem] overflow-hidden sm:h-[5.25rem] sm:w-[14.5rem] lg:w-[15.5rem]">
                <img
                  src="/brand/logo-nav.webp"
                  alt="Soccerverse World Cup Community Event"
                  width={960}
                  height={640}
                  className="h-auto w-[9.4rem] max-w-none -translate-y-[1.08rem] transition duration-500 group-hover:scale-[1.03] sm:w-[14.5rem] sm:-translate-y-7 lg:w-[15.5rem]"
                />
              </span>
            </NavLink>

            <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
              <nav className="hidden flex-wrap justify-end rounded-full border border-white/8 bg-black/20 p-1 md:flex">
                {navigation.map((item) => (
                  <NavLink
                    key={item.to}
                    to={withReferral(item.to, referrerSoccerverseUsername)}
                    className={({ isActive }) =>
                      [
                        'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]',
                        isActive
                          ? 'bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
                          : 'text-[var(--color-muted)] hover:bg-white/7 hover:text-white active:scale-[0.98]',
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <LocaleRail
                activeLocale={locale}
                locales={supportedLocales}
                onChange={setLocale}
              />

              <button
                type="button"
                aria-label="Toggle navigation"
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen((current) => !current)}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/4 transition duration-300 ease-out hover:bg-white/8 active:scale-[0.96] md:hidden"
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
            <nav className="grid grid-cols-2 gap-2 border-t border-white/8 pt-3 md:hidden">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={withReferral(item.to, referrerSoccerverseUsername)}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    [
                      'rounded-full px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em]',
                      isActive
                        ? 'bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
                        : 'border border-white/8 bg-black/20 text-[var(--color-muted)] hover:bg-white/7 hover:text-white active:scale-[0.98]',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
        </header>

        <main className="flex-1 reveal-in">
          <Routes>
            <Route path="/" element={<HomePage locale={locale} referrerSoccerverseUsername={referrerSoccerverseUsername} />} />
            <Route
              path="/builder"
              element={<BuilderPage locale={locale} referrerSoccerverseUsername={referrerSoccerverseUsername} />}
            />
            <Route path="/builder/share" element={<ShareComposerPage locale={locale} />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={<AdminPage locale={locale} />} />
            <Route path="/profiles/:slug" element={<ProfilePage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
