import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { LocaleRail } from './components/LocaleRail'
import { supportedLocales } from './data/eventConfig'
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

  return (
    <div className="stadium-shell min-h-[100dvh] bg-[var(--color-ink)] text-[var(--color-paper)]">
      <div className="noise-layer" />
      <div className="relative z-[2] mx-auto flex min-h-[100dvh] max-w-[1440px] flex-col px-3 py-3 sm:px-5 lg:px-7">
        <header className="premium-nav sticky top-3 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5 sm:px-4">
          <NavLink to="/" className="group flex shrink-0 items-center gap-3 transition active:scale-[0.99]">
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/20">
              <img
                src="/brand/logo-200.webp"
                alt="Soccerverse World Cup Community Event"
                width={90}
                height={60}
                className="h-auto w-[58px] max-w-none transition duration-500 group-hover:scale-[1.04]"
              />
            </span>
            <span className="hidden leading-none sm:block">
              <span className="block text-sm font-semibold tracking-[0.08em] text-white">SOCCERVERSE</span>
              <span className="mono mt-1 block text-[10px] uppercase tracking-[0.24em] text-[var(--color-accent)]">World Cup</span>
            </span>
          </NavLink>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <nav className="flex flex-wrap justify-end rounded-full border border-white/8 bg-black/20 p-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
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
          </div>
        </header>

        <main className="flex-1 reveal-in">
          <Routes>
            <Route path="/" element={<HomePage locale={locale} />} />
            <Route path="/builder" element={<BuilderPage locale={locale} />} />
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
