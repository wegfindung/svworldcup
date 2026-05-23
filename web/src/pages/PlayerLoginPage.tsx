import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMessages } from '../i18n/messages'
import { loginParticipant, requestParticipantPasswordReset } from '../lib/api'
import { readParticipantReady, writeParticipantReady } from '../lib/participantReady'
import { withReferral } from '../lib/referral'
import type { LocaleCode, ParticipantProfile, ParticipantSquadSummary } from '../lib/types'

interface PlayerLoginPageProps {
  locale: LocaleCode
  referrerSoccerverseUsername?: string
}

function buildReadyState(
  participant: ParticipantProfile,
  budgetLimit: number,
  squadSummary?: ParticipantSquadSummary,
) {
  return {
    displayName: participant.displayName,
    email: participant.email,
    leagueType: participant.leagueType,
    budgetLimit: squadSummary?.budgetLimit ?? budgetLimit,
    scoreMultiplier: squadSummary?.scoreMultiplier,
    budgetRemaining: squadSummary?.budgetRemaining,
    budgetUsed: squadSummary?.budgetUsed,
    draftedCount: squadSummary?.draftedCount,
    isLocked: squadSummary?.isLocked,
    hasPassword: participant.hasPassword,
  }
}

export function PlayerLoginPage({ locale, referrerSoccerverseUsername = '' }: PlayerLoginPageProps) {
  const navigate = useNavigate()
  const copy = getMessages(locale).login
  const readyState = useMemo(() => readParticipantReady(), [])
  const [email, setEmail] = useState(readyState?.email ?? '')
  const [password, setPassword] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [recoveryEmail, setRecoveryEmail] = useState(readyState?.email ?? '')
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginBusy(true)
    setLoginError(null)

    try {
      const response = await loginParticipant(email, password)
      writeParticipantReady(buildReadyState(response.participant, response.budgetLimit, response.squadSummary))
      navigate(withReferral('/builder', referrerSoccerverseUsername))
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : copy.loginFailed)
    } finally {
      setLoginBusy(false)
    }
  }

  async function handleRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRecoveryBusy(true)
    setRecoveryError(null)
    setRecoveryMessage(null)

    try {
      await requestParticipantPasswordReset(recoveryEmail)
      setRecoveryMessage(copy.recoverySent)
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : copy.recoveryFailed)
    } finally {
      setRecoveryBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6">
        <div className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="eyebrow">{copy.heroEyebrow}</p>
            <h2 className="section-title mt-6 max-w-[10ch]">{copy.title}</h2>
            <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
              {copy.body}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to={withReferral('/register', referrerSoccerverseUsername)}
                className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
              >
                {copy.createEntry}
              </Link>
              {readyState ? (
                <Link
                  to={withReferral('/builder', referrerSoccerverseUsername)}
                  className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
                >
                  {copy.continueAs} {readyState.displayName}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4">
            <form onSubmit={handleLogin} className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
              <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.accessEyebrow}</p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">{copy.accessTitle}</h3>

              <div className="mt-6 grid gap-4">
                <label className="grid gap-2">
                  <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.email}</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      if (!recoveryEmail) {
                        setRecoveryEmail(event.target.value)
                      }
                    }}
                    className="rounded-[1.2rem] border border-white/10 bg-[rgba(8,13,12,0.72)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.password}</span>
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="rounded-[1.2rem] border border-white/10 bg-[rgba(8,13,12,0.72)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
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
                  className="inline-flex w-fit items-center rounded-full bg-[var(--color-accent)] px-7 py-3 text-sm font-semibold text-[var(--color-ink)] shadow-[0_20px_30px_-20px_rgba(24,180,133,0.8)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                >
                  {loginBusy ? copy.signingIn : copy.signIn}
                </button>
              </div>
            </form>

            <form onSubmit={handleRecovery} className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
              <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.recoveryEyebrow}</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">{copy.recoveryTitle}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                {copy.recoveryBody}
              </p>

              <label className="mt-5 grid gap-2">
                <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.recoveryEmail}</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={recoveryEmail}
                  onChange={(event) => setRecoveryEmail(event.target.value)}
                  className="rounded-[1.2rem] border border-white/10 bg-[rgba(8,13,12,0.72)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                />
              </label>

              {recoveryError ? (
                <div className="mt-4 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
                  {recoveryError}
                </div>
              ) : null}
              {recoveryMessage ? (
                <div className="mt-4 rounded-[1.3rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-4 py-3 text-sm text-[var(--color-paper)]">
                  {recoveryMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={recoveryBusy}
                className="mt-5 inline-flex w-fit items-center rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
              >
                {recoveryBusy ? copy.sendingLink : copy.sendRecovery}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
