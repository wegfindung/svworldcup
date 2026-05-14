import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { TeamFlag } from '../components/TeamFlag'
import { fetchParticipantSession, fetchParticipantSquad } from '../lib/api'
import { getShareComposerCopy } from '../lib/shareCopy'
import { buildShareCardUrl, buildShareSnapshotUrl, createShareSnapshotPlayer, type ShareSnapshotPayload } from '../lib/sharePayload'
import type { LocaleCode, ParticipantProfile, ParticipantSquad } from '../lib/types'

interface ShareComposerPageProps {
  locale: LocaleCode
}

type LoadState = 'loading' | 'ready' | 'error'

const maxCustomStatementLength = 110

function buildAbsoluteUrl(path: string) {
  if (typeof window === 'undefined') {
    return path
  }

  return new URL(path, window.location.origin).toString()
}

function normalizeFeaturedPlayerIds(currentIds: number[], draftedPlayerIds: number[]) {
  const validIds = currentIds.filter((playerId) => draftedPlayerIds.includes(playerId))
  if (validIds.length >= 2) {
    return validIds.slice(0, 3)
  }

  return draftedPlayerIds.slice(0, 3)
}

export function ShareComposerPage({ locale }: ShareComposerPageProps) {
  const copy = getShareComposerCopy(locale)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [participant, setParticipant] = useState<ParticipantProfile | null>(null)
  const [squad, setSquad] = useState<ParticipantSquad | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statementMode, setStatementMode] = useState<'preset' | 'custom'>('preset')
  const [selectedPresetId, setSelectedPresetId] = useState(copy.presets[0]?.id ?? 'big-stage')
  const [customStatement, setCustomStatement] = useState('')
  const [featuredPlayerIds, setFeaturedPlayerIds] = useState<number[]>([])
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false

    async function loadComposer() {
      setLoadState('loading')
      setError(null)

      try {
        const [sessionResponse, squadResponse] = await Promise.all([fetchParticipantSession(), fetchParticipantSquad()])
        if (cancelled) {
          return
        }

        setParticipant(sessionResponse.participant)
        setSquad(squadResponse.squad)
        setLoadState('ready')
      } catch (loadError) {
        if (cancelled) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Share composer could not be loaded.')
        setLoadState('error')
      }
    }

    void loadComposer()

    return () => {
      cancelled = true
    }
  }, [])

  const draftedPlayers = useMemo(() => {
    return (squad?.slots ?? [])
      .filter((slot) => slot.player)
      .map((slot) => ({
        slotKey: slot.key,
        slotLabel: slot.label,
        slotClass: slot.slotClass,
        player: slot.player!,
      }))
      .sort((left, right) => right.player.rating - left.player.rating || left.player.displayName.localeCompare(right.player.displayName))
  }, [squad])

  const isCompleteSquad = (squad?.slots.filter((slot) => slot.player).length ?? 0) === 15
  const effectivePresetId = copy.presets.some((preset) => preset.id === selectedPresetId) ? selectedPresetId : (copy.presets[0]?.id ?? 'big-stage')
  const selectedPreset = copy.presets.find((preset) => preset.id === effectivePresetId) ?? copy.presets[0]
  const statement =
    statementMode === 'custom' ? customStatement.trim().slice(0, maxCustomStatementLength) : (selectedPreset?.text ?? '').trim()
  const normalizedFeaturedPlayerIds = normalizeFeaturedPlayerIds(
    featuredPlayerIds,
    draftedPlayers.map((entry) => entry.player.playerId),
  )
  const featuredPlayers = draftedPlayers
    .filter((entry) => normalizedFeaturedPlayerIds.includes(entry.player.playerId))
    .slice()
    .sort(
      (left, right) =>
        normalizedFeaturedPlayerIds.indexOf(left.player.playerId) - normalizedFeaturedPlayerIds.indexOf(right.player.playerId),
    )

  const sharePayload: ShareSnapshotPayload | null =
    participant && isCompleteSquad && statement && featuredPlayers.length >= 2 && featuredPlayers.length <= 3
      ? {
          version: 1,
          locale,
          managerName: participant.displayName,
          statement,
          featuredPlayers: featuredPlayers.map((entry) => createShareSnapshotPlayer(entry.player, entry.slotClass)),
        }
      : null

  const sharePath = sharePayload ? buildShareSnapshotUrl(sharePayload) : null
  const shareUrl = sharePayload ? buildAbsoluteUrl(sharePath!) : null
  const cardUrl = sharePayload ? buildShareCardUrl(sharePayload) : null

  function toggleFeaturedPlayer(playerId: number) {
    setCopyState('idle')
    setFeaturedPlayerIds((current) => {
      const baseline = normalizeFeaturedPlayerIds(
        current,
        draftedPlayers.map((entry) => entry.player.playerId),
      )

      if (baseline.includes(playerId)) {
        return baseline.filter((item) => item !== playerId)
      }

      if (baseline.length >= 3) {
        return baseline
      }

      return [...baseline, playerId]
    })
  }

  async function handleCopyLink() {
    if (!shareUrl) {
      return
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  async function handleNativeShare() {
    if (!shareUrl || !sharePayload || typeof navigator.share !== 'function') {
      return
    }

    await navigator.share({
      title: `${sharePayload.managerName} · Soccerverse World Cup`,
      text: `${sharePayload.statement} ${copy.prizeCta}`,
      url: shareUrl,
    })
  }

  if (loadState === 'loading') {
    return (
      <div className="space-y-6 pb-12">
        <section className="glass-panel rounded-[2rem] p-6">
          <p className="text-sm text-[var(--color-muted)]">{copy.loading}</p>
        </section>
      </div>
    )
  }

  if (loadState === 'error' || !participant || !squad) {
    return (
      <div className="space-y-6 pb-12">
        <section className="glass-panel rounded-[2rem] p-6">
          <EmptyState title={copy.errorTitle} body={error ?? 'Unknown error.'} />
          <div className="mt-5">
            <Link to="/builder" className="text-sm font-semibold text-[var(--color-accent)]">
              {copy.backButton}
            </Link>
          </div>
        </section>
      </div>
    )
  }

  if (!isCompleteSquad) {
    return (
      <div className="space-y-6 pb-12">
        <section className="glass-panel rounded-[2rem] p-6">
          <EmptyState title={copy.incompleteTitle} body={copy.incompleteBody} />
          <div className="mt-5">
            <Link to="/builder" className="text-sm font-semibold text-[var(--color-accent)]">
              {copy.backButton}
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="hero-card rounded-[2rem] px-6 py-8 sm:px-8">
        <p className="eyebrow">{copy.eyebrow}</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.92fr]">
          <div>
            <h2 className="section-title max-w-[12ch]">{copy.title}</h2>
            <p className="mt-5 max-w-[64ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.body}</p>
            <p className="mt-4 text-sm font-medium text-[var(--color-accent)]">{copy.lockedHint}</p>
          </div>
          <div className="rounded-[1.6rem] border border-[var(--color-accent)]/18 bg-[var(--color-accent)]/10 p-5">
            <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-accent)]">{participant.displayName}</p>
            <p className="mt-3 text-lg font-semibold text-white">{copy.prizeCta}</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{copy.selectionHint}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-6">
          <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
            <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{copy.statementLabel}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{copy.statementHelp}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStatementMode('preset')}
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  statementMode === 'preset' ? 'bg-[var(--color-accent)] text-[var(--color-ink)]' : 'border border-white/10 text-white hover:bg-white/6',
                ].join(' ')}
              >
                {copy.presetsLabel}
              </button>
              <button
                type="button"
                onClick={() => setStatementMode('custom')}
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  statementMode === 'custom' ? 'bg-[var(--color-accent)] text-[var(--color-ink)]' : 'border border-white/10 text-white hover:bg-white/6',
                ].join(' ')}
              >
                {copy.customLabel}
              </button>
            </div>

            {statementMode === 'preset' ? (
              <div className="mt-5 grid gap-3">
                {copy.presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={[
                      'rounded-[1.3rem] border px-4 py-4 text-left transition',
                      selectedPresetId === preset.id
                        ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10'
                        : 'border-white/8 bg-black/12 hover:bg-white/6',
                    ].join(' ')}
                  >
                    <span className="text-sm font-semibold text-white">{preset.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <textarea
                  rows={4}
                  value={customStatement}
                  maxLength={maxCustomStatementLength}
                  onChange={(event) => {
                    setCopyState('idle')
                    setCustomStatement(event.target.value)
                  }}
                  placeholder={copy.customPlaceholder}
                  className="min-h-32 w-full rounded-[1.3rem] border border-white/10 bg-[rgba(8,13,12,0.74)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                />
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {customStatement.trim().length}/{maxCustomStatementLength} {copy.customCounter}
                </p>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
            <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{copy.playersLabel}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{copy.playersHelp}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {draftedPlayers.map((entry) => {
                const isSelected = normalizedFeaturedPlayerIds.includes(entry.player.playerId)
                const selectionLocked = !isSelected && normalizedFeaturedPlayerIds.length >= 3
                return (
                  <button
                    key={entry.slotKey}
                    type="button"
                    onClick={() => toggleFeaturedPlayer(entry.player.playerId)}
                    disabled={selectionLocked}
                    className={[
                      'rounded-[1.4rem] border p-4 text-left transition',
                      isSelected
                        ? 'border-[var(--color-accent)]/34 bg-[var(--color-accent)]/10'
                        : 'border-white/8 bg-black/12 hover:bg-white/6',
                      selectionLocked ? 'cursor-not-allowed opacity-55' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-start gap-3">
                      <PlayerPortrait
                        src={entry.player.imageUrl}
                        alt={entry.player.displayName}
                        width={68}
                        height={68}
                        className="h-16 w-16 rounded-[1rem] border border-white/10 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{entry.player.displayName}</p>
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                              {entry.slotLabel} · {entry.slotClass}
                            </p>
                          </div>
                          <div className="rounded-full border border-white/10 px-3 py-1">
                            <span className="mono text-xs text-[var(--color-accent)]">{entry.player.rating}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <TeamFlag teamCode={entry.player.teamCode || entry.player.nationalityCode} label={entry.player.displayName} size="sm" />
                          <span className="text-xs text-[var(--color-muted)]">{entry.player.teamCode || entry.player.nationalityCode}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{copy.previewLabel}</p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{statement || copy.selectionHint}</p>
              </div>
              <Link to="/builder" className="text-sm font-semibold text-[var(--color-accent)]">
                {copy.backButton}
              </Link>
            </div>

            {cardUrl ? (
              <div className="mt-5 overflow-hidden rounded-[1.6rem] border border-white/8 bg-black/15">
                <img src={cardUrl} alt={statement} className="block w-full" />
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState title={copy.errorTitle} body={copy.selectionHint} />
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {typeof navigator.share === 'function' ? (
                <button
                  type="button"
                  onClick={() => void handleNativeShare()}
                  disabled={!shareUrl}
                  className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copy.shareButton}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                disabled={!shareUrl}
                className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copy.copyButton}
              </button>
              {shareUrl ? (
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6"
                >
                  {copy.previewButton}
                </a>
              ) : null}
            </div>

            {copyState === 'copied' ? <p className="mt-3 text-sm text-[var(--color-accent)]">{copy.copiedLabel}</p> : null}
            {copyState === 'error' ? <p className="mt-3 text-sm text-[var(--color-sand)]">{copy.errorTitle}</p> : null}
          </div>
        </div>
      </section>
    </div>
  )
}
