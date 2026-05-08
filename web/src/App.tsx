import { NavLink, Route, Routes } from 'react-router-dom'
import { BuilderPage } from './pages/BuilderPage'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { TablesPage } from './pages/TablesPage'

const navigation = [
  { to: '/', label: 'Overview' },
  { to: '/builder', label: 'Builder' },
  { to: '/tables', label: 'Tables' },
  { to: '/profiles/demo-veteran', label: 'Profile demo' },
]

function App() {
  return (
    <div className="min-h-[100dvh] bg-[var(--color-ink)] text-[var(--color-paper)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(24,180,133,0.15),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(228,162,74,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:88px_88px]" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="glass-panel sticky top-4 z-20 mb-8 flex items-center justify-between gap-4 rounded-full px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span className="font-mono text-sm font-semibold tracking-[0.28em] text-[var(--color-accent)]">SV</span>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)]">soccerverse world cup</p>
              <h1 className="text-sm font-semibold text-white">Draft. Hide. Reveal.</h1>
            </div>
          </div>

          <nav className="flex flex-wrap justify-end gap-2">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'rounded-full px-4 py-2 text-sm transition duration-300 ease-out',
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
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/builder" element={<BuilderPage />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/profiles/:slug" element={<ProfilePage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
