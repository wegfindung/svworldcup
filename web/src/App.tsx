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
    <div className="min-h-[100dvh] bg-[var(--color-ink)] text-[var(--color-paper)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(24,180,133,0.15),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(228,162,74,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:88px_88px]" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1320px] flex-col px-4 py-4 sm:px-5 lg:px-6">
        <header className="glass-panel sticky top-4 z-20 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.35rem] px-4 py-3 sm:px-5">
          <NavLink to="/" className="shrink-0 transition hover:-translate-y-[1px] active:scale-[0.99]">
            <img
              src="/brand/logo-200.webp"
              alt="Soccerverse World Cup Community Event"
              width={200}
              height={133}
              className="h-auto w-[160px] max-w-full"
            />
          </NavLink>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <nav className="flex flex-wrap justify-end gap-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'rounded-full px-3.5 py-2 text-sm transition duration-300 ease-out',
                      isActive
                        ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                        : 'text-[var(--color-muted)] hover:-translate-y-[1px] hover:bg-white/6 hover:text-white active:scale-[0.98]',
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

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage locale={locale} />} />
            <Route path="/builder" element={<BuilderPage locale={locale} />} />
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
