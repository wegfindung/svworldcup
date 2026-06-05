import { Link } from 'react-router-dom'
import type { AppMessages } from '../i18n/messages'
import { resolveSquadNudgeStatus } from '../lib/squadNudgeStatus'
import type { LocaleCode } from '../lib/types'

function formatFirstMatchDate(epoch: number | null, locale: LocaleCode): string | null {
  if (epoch === null) {
    return null
  }

  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(epoch)
  } catch {
    return null
  }
}

function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''))
}

type NudgeCta = {
  to?: string
  onClick?: () => void
  label?: string
  disabled?: boolean
  busy?: boolean
}

interface SquadNudgeProps {
  draftedCount: number
  isLocked: boolean
  competitionStarted: boolean
  firstMatchEpoch: number | null
  locale: LocaleCode
  copy: AppMessages['builder']['nudge']
  cta?: NudgeCta
  className?: string
}

// Tone styling per cohort, reusing the palette already used by the registration-closed banner and the
// accent panels in BuilderPage.
const tone = {
  attention: 'border-[var(--color-sand)]/25 bg-[var(--color-sand)]/8',
  action: 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10',
  calm: 'border-[var(--color-accent)]/18 bg-[var(--color-accent)]/[0.06]',
} as const

const eyebrowToneClass = {
  attention: 'text-[var(--color-sand)]',
  action: 'text-[var(--color-accent)]',
  calm: 'text-[var(--color-accent)]',
} as const

export function SquadNudge({
  draftedCount,
  isLocked,
  competitionStarted,
  firstMatchEpoch,
  locale,
  copy,
  cta,
  className,
}: SquadNudgeProps) {
  const status = resolveSquadNudgeStatus({ draftedCount, isLocked, competitionStarted })
  if (status === 'none') {
    return null
  }

  const date = formatFirstMatchDate(firstMatchEpoch, locale)

  let title: string
  let body: string
  let defaultCtaLabel: string
  let toneKey: keyof typeof tone

  switch (status) {
    case 'empty':
      title = copy.emptyTitle
      body = date ? fill(copy.emptyBody, { date }) : copy.emptyBodyNoDate
      defaultCtaLabel = copy.emptyCta
      toneKey = 'attention'
      break
    case 'partial': {
      const remaining = Math.max(1, 15 - draftedCount)
      title = remaining === 1 ? copy.partialTitleOne : fill(copy.partialTitle, { remaining })
      body = date ? fill(copy.partialBody, { date }) : copy.partialBodyNoDate
      defaultCtaLabel = copy.partialCta
      toneKey = 'attention'
      break
    }
    case 'complete':
      title = copy.completeTitle
      body = date ? fill(copy.completeBody, { date }) : copy.completeBodyNoDate
      defaultCtaLabel = copy.completeCta
      toneKey = 'action'
      break
    case 'startedUnlocked':
      title = copy.startedUnlockedTitle
      body = copy.startedUnlockedBody
      defaultCtaLabel = copy.startedUnlockedCta
      toneKey = 'action'
      break
    case 'locked':
    default:
      title = copy.lockedTitle
      body = date ? fill(copy.lockedBody, { date }) : copy.lockedBodyNoDate
      defaultCtaLabel = copy.lockedCta
      toneKey = 'calm'
      break
  }

  const ctaLabel = cta?.label ?? defaultCtaLabel
  const showCta = Boolean(cta && (cta.to || cta.onClick))

  return (
    <section
      className={[
        'glass-panel flex flex-col gap-4 rounded-[1.15rem] border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6',
        tone[toneKey],
        className ?? '',
      ].join(' ')}
    >
      <div className="min-w-0">
        <p className={['mono text-[10px] uppercase tracking-[0.2em]', eyebrowToneClass[toneKey]].join(' ')}>
          {copy.eyebrow}
        </p>
        <p className="mt-2 text-base font-semibold leading-tight text-white">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{body}</p>
      </div>

      {showCta ? (
        cta?.to ? (
          <Link
            to={cta.to}
            className="premium-button shrink-0 whitespace-nowrap px-6 py-3 text-sm font-semibold"
          >
            {ctaLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={cta?.onClick}
            disabled={cta?.disabled || cta?.busy}
            className="premium-button shrink-0 whitespace-nowrap px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ctaLabel}
          </button>
        )
      ) : null}
    </section>
  )
}
