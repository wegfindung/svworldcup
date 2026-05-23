import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getMessages } from '../i18n/messages'
import { resetParticipantPassword } from '../lib/api'
import { writeParticipantReady } from '../lib/participantReady'
import type { LocaleCode } from '../lib/types'

type ResetState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; displayName: string }
  | { status: 'error'; message: string }

interface ResetPasswordPageProps {
  locale: LocaleCode
}

export function ResetPasswordPage({ locale }: ResetPasswordPageProps) {
  const copy = getMessages(locale).resetPassword
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [state, setState] = useState<ResetState>(() =>
    token ? { status: 'idle' } : { status: 'error', message: copy.missingToken },
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      setState({ status: 'error', message: copy.missingToken })
      return
    }
    if (password !== confirmPassword) {
      setState({ status: 'error', message: copy.mismatch })
      return
    }

    setState({ status: 'loading' })
    try {
      const response = await resetParticipantPassword(token, password)
      writeParticipantReady({
        displayName: response.participant.displayName,
        email: response.participant.email,
        leagueType: response.participant.leagueType,
        budgetLimit: response.budgetLimit,
        scoreMultiplier: response.squadSummary.scoreMultiplier,
        budgetRemaining: response.squadSummary.budgetRemaining,
        budgetUsed: response.squadSummary.budgetUsed,
        draftedCount: response.squadSummary.draftedCount,
        isLocked: response.squadSummary.isLocked,
        hasPassword: response.participant.hasPassword,
      })
      setState({
        status: 'success',
        displayName: response.participant.displayName,
      })
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : copy.failed,
      })
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <section className="hero-card rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
        <p className="eyebrow">{copy.eyebrow}</p>

        {state.status === 'idle' || state.status === 'loading' ? (
          <div className="mt-8 space-y-6">
            <h2 className="section-title max-w-[12ch]">{copy.title}</h2>
            <p className="max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
              {copy.body}
            </p>
            <form onSubmit={handleSubmit} className="grid gap-4 rounded-[1.8rem] border border-white/10 bg-black/20 p-6">
              <label className="grid gap-2">
                <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.newPassword}</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                />
              </label>
              <label className="grid gap-2">
                <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{copy.confirmPassword}</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                />
              </label>
              <button
                type="submit"
                disabled={state.status === 'loading'}
                className="inline-flex w-fit items-center rounded-full bg-[var(--color-accent)] px-7 py-4 text-base font-semibold text-[var(--color-ink)] shadow-[0_20px_30px_-20px_rgba(24,180,133,0.8)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
              >
                {state.status === 'loading' ? copy.saving : copy.save}
              </button>
            </form>
          </div>
        ) : null}

        {state.status === 'success' ? (
          <div className="mt-8 space-y-6">
            <h2 className="section-title max-w-[12ch]">{copy.successTitlePrefix} {state.displayName}{copy.successTitleSuffix}</h2>
            <p className="max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
              {copy.successBody}
            </p>
            <Link
              to="/builder"
              className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-7 py-4 text-base font-semibold text-[var(--color-ink)] shadow-[0_20px_30px_-20px_rgba(24,180,133,0.8)] transition hover:-translate-y-[1px] active:scale-[0.98]"
            >
              {copy.successCta}
            </Link>
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="mt-8 space-y-6">
            <h2 className="section-title max-w-[12ch]">{copy.errorTitle}</h2>
            <p className="max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">{state.message}</p>
            <Link
              to="/builder"
              className="inline-flex items-center rounded-full border border-white/12 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
            >
              {copy.errorCta}
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  )
}
