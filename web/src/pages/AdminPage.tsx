import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AccountsView } from '../components/admin/AccountsView'
import { DashboardLanding } from '../components/admin/DashboardLanding'
import { EmailMarketingView } from '../components/admin/EmailMarketingView'
import { MatchImportView } from '../components/admin/MatchImportView'
import { MultiAccountingView } from '../components/admin/MultiAccountingView'
import { OperationsView } from '../components/admin/OperationsView'
import { ReferralsView } from '../components/admin/ReferralsView'
import { RevealControlsView } from '../components/admin/RevealControlsView'
import { ScoringView } from '../components/admin/ScoringView'
import { TeamPoolsView } from '../components/admin/TeamPoolsView'
import { fetchAdminSession, loginAdmin, logoutAdmin } from '../lib/api'
import type { AdminProfile, LocaleCode } from '../lib/types'

interface AdminPageProps {
  locale: LocaleCode
}

const navItems: Array<[string, string]> = [
  ['/admin', 'Home'],
  ['/admin/match-import', 'Match import'],
  ['/admin/team-pools', 'Team pools'],
  ['/admin/scoring', 'Scoring'],
  ['/admin/accounts', 'Accounts'],
  ['/admin/multi-accounting', 'Multi-accounting'],
  ['/admin/referrals', 'Referrals'],
  ['/admin/reveal', 'Reveal'],
  ['/admin/email-marketing', 'Email marketing'],
  ['/admin/operations', 'Operations'],
]

export function AdminPage({ locale: _locale }: AdminPageProps) {
  void _locale
  const [authState, setAuthState] = useState<'checking' | 'guest' | 'active'>('checking')
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginBusy, setLoginBusy] = useState(false)

  useEffect(() => {
    let active = true
    void fetchAdminSession()
      .then((response) => {
        if (!active) {
          return
        }
        setAdmin(response.admin)
        setAuthState('active')
      })
      .catch(() => {
        if (!active) {
          return
        }
        setAdmin(null)
        setAuthState('guest')
      })

    return () => {
      active = false
    }
  }, [])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginBusy(true)
    setLoginError(null)

    try {
      const response = await loginAdmin(loginEmail, loginPassword)
      setAdmin(response.admin)
      setAuthState('active')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed.')
    } finally {
      setLoginBusy(false)
    }
  }

  if (authState === 'checking') {
    return (
      <div className="mx-auto max-w-3xl pb-12">
        <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
          <p className="eyebrow">admin access</p>
          <div className="mt-6 space-y-3">
            <div className="skeleton h-8 max-w-sm rounded-full" />
            <div className="skeleton h-4 max-w-xl rounded-full" />
            <div className="skeleton h-4 max-w-lg rounded-full" />
          </div>
        </section>
      </div>
    )
  }

  if (authState === 'guest') {
    return (
      <div className="mx-auto max-w-3xl pb-12">
        <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
          <p className="eyebrow">admin access</p>
          <h2 className="section-title mt-6 max-w-[11ch]">Email and password backend access.</h2>
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
            Use the protected backend to preselect all 48 Grand Tournament team pools before public drafting opens.
          </p>

          <form onSubmit={handleLogin} className="mt-7 grid gap-4 rounded-[1.1rem] border border-white/10 bg-black/15 p-4 sm:p-5">
            <label className="grid gap-2">
              <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Admin email</span>
              <input
                required
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="admin@example.com"
                className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
              />
            </label>
            <label className="grid gap-2">
              <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Password</span>
              <input
                required
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Password"
                className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
              />
            </label>
            {loginError ? (
              <div className="rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                {loginError}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={loginBusy}
              className="inline-flex w-fit items-center rounded-full bg-[var(--color-accent)] px-8 py-4 text-base font-semibold text-[var(--color-ink)] shadow-[0_20px_30px_-20px_rgba(24,180,133,0.8)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              {loginBusy ? 'Signing in…' : 'Open admin backend'}
            </button>
          </form>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-10">
      <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="eyebrow">admin backend</p>
            <h2 className="section-title mt-6 max-w-[14ch]">The Grand Tournament control room.</h2>
            <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
              Logged in as <span className="font-medium text-white">{admin?.email}</span>. Pick a section below.
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              await logoutAdmin()
              setAdmin(null)
              setAuthState('guest')
            }}
            className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            Sign out
          </button>
        </div>
      </section>

      <nav className="glass-panel flex flex-wrap gap-2 rounded-[1.15rem] p-2">
        {navItems.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              [
                'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition active:scale-[0.98]',
                isActive
                  ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                  : 'border border-white/10 text-white hover:bg-white/6',
              ].join(' ')
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route index element={<DashboardLanding />} />
        <Route path="match-import" element={<MatchImportView adminEmail={admin?.email ?? ''} />} />
        <Route path="team-pools" element={<TeamPoolsView />} />
        <Route path="scoring" element={<ScoringView />} />
        <Route path="accounts" element={<AccountsView />} />
        <Route path="multi-accounting" element={<MultiAccountingView />} />
        <Route path="referrals" element={<ReferralsView />} />
        <Route path="reveal" element={<RevealControlsView />} />
        <Route path="email-marketing" element={<EmailMarketingView adminEmail={admin?.email ?? ''} />} />
        <Route path="operations" element={<OperationsView />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  )
}
