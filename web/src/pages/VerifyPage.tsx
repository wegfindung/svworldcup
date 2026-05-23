import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getMessages } from '../i18n/messages'
import { verifyRegistration } from '../lib/api'
import { writeParticipantReady } from '../lib/participantReady'
import type { LocaleCode } from '../lib/types'

type VerifyState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; displayName: string; email: string; leagueType: string; budgetLimit: number; hasPassword: boolean }
  | { status: 'error'; message: string }

interface VerifyPageProps {
  locale: LocaleCode
}

export function VerifyPage({ locale }: VerifyPageProps) {
  const copy = getMessages(locale).verify
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [state, setState] = useState<VerifyState>(() =>
    token ? { status: 'idle' } : { status: 'error', message: copy.missingToken },
  )

  async function handleVerify() {
    if (!token) {
      setState({ status: 'error', message: copy.missingToken })
      return
    }

    setState({ status: 'loading' })
    try {
      const response = await verifyRegistration(token)
      writeParticipantReady({
        displayName: response.displayName,
        email: response.email,
        leagueType: response.leagueType,
        budgetLimit: response.budgetLimit,
        scoreMultiplier: response.squadSummary.scoreMultiplier,
        budgetRemaining: response.squadSummary.budgetRemaining,
        budgetUsed: response.squadSummary.budgetUsed,
        draftedCount: response.squadSummary.draftedCount,
        isLocked: response.squadSummary.isLocked,
        hasPassword: response.hasPassword,
      })
      setState({
        status: 'success',
        displayName: response.displayName,
        email: response.email,
        leagueType: response.leagueType,
        budgetLimit: response.budgetLimit,
        hasPassword: response.hasPassword,
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

        {state.status === 'idle' ? (
          <div className="mt-8 space-y-6">
            <h2 className="section-title max-w-[12ch]">{copy.idleTitle}</h2>
            <p className="max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
              {copy.idleBody}
            </p>
            <button
              type="button"
              onClick={() => void handleVerify()}
              className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-7 py-4 text-base font-semibold text-[var(--color-ink)] shadow-[0_20px_30px_-20px_rgba(24,180,133,0.8)] transition hover:-translate-y-[1px] active:scale-[0.98]"
            >
              {copy.idleCta}
            </button>
          </div>
        ) : null}

        {state.status === 'loading' ? (
          <div className="mt-8 space-y-4">
            <h2 className="section-title max-w-[12ch]">{copy.loadingTitle}</h2>
            <div className="grid gap-3">
              <div className="skeleton h-24 rounded-[1.6rem]" />
              <div className="skeleton h-24 rounded-[1.6rem]" />
            </div>
          </div>
        ) : null}

        {state.status === 'success' ? (
          <div className="mt-8 space-y-6">
            <h2 className="section-title max-w-[12ch]">{copy.successTitle}</h2>
            <p className="max-w-[58ch] text-lg leading-relaxed text-[var(--color-muted)]">
              {state.displayName} {copy.successPrefix} {state.leagueType} {copy.successMiddle}{' '}
              <span className="font-semibold text-[var(--color-accent)]">{state.budgetLimit.toLocaleString(undefined)} SVC</span>.
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
              to="/register"
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
