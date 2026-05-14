import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { TeamFlag } from '../components/TeamFlag'
import { fetchParticipantSession, fetchParticipantSquad } from '../lib/api'
import { getShareComposerCopy, renderSharePreset } from '../lib/shareCopy'
import { buildShareCardUrl, buildShareSnapshotUrl, createShareSnapshotPlayer, type ShareSnapshotPayload } from '../lib/sharePayload'
import type { LocaleCode, ParticipantProfile, ParticipantSquad } from '../lib/types'

interface ShareComposerPageProps {
  locale: LocaleCode
}

type LoadState = 'loading' | 'ready' | 'error'

const maxCustomStatementLength = 110
const maxShareLabelLength = 28

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

function sanitizeShareLabel(value: string) {
  return value.trim().slice(0, maxShareLabelLength)
}

export function ShareComposerPage({ locale }: ShareComposerPageProps) {
  const copy = getShareComposerCopy(locale)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [participant, setParticipant] = useState<ParticipantProfile | null>(null)
  const [squad, setSquad] = useState<ParticipantSquad | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statementMode, setStatementMode] = useState<'preset' | 'custom'>('preset')
  const [selectedPresetId, setSelectedPresetId] = useState(copy.presets[0]?.id ?? 'top-picks')
  const [customStatement, setCustomStatement] = useState('')
  const [featuredPlayerIds, setFeaturedPlayerIds] = useState<number[]>([])
  const [playerNameOverrides, setPlayerNameOverrides] = useState<Record<number, string>>({})
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

  const draftedPlayerIds = useMemo(() => draftedPlayers.map((entry) => entry.player.playerId), [draftedPlayers])
  const isCompleteSquad = draftedPlayers.length === 15
  const effectivePresetId = copy.presets.some((preset) => preset.id === selectedPresetId) ? selectedPresetId : (copy.presets[0]?.id ?? 'top-picks')
  const selectedPreset = copy.presets.find((preset) => preset.id === effectivePresetId) ?? copy.presets[0]
  const normalizedFeaturedPlayerIds = normalizeFeaturedPlayerIds(featuredPlayerIds, draftedPlayerIds)
  const selectedPlayerCount = Math.max(2, Math.min(3, normalizedFeaturedPlayerIds.length || 3))
  const presetStatement = selectedPreset ? renderSharePreset(selectedPreset.template, selectedPlayerCount) : ''
  const statement = statementMode === 'custom' ? customStatement.trim().slice(0, maxCustomStatementLength) : presetStatement

  const featuredPlayers = draftedPlayers
    .filter((entry) => normalizedFeaturedPlayerIds.includes(entry.player.playerId))
    .slice()
    .sort(
      (left, right) =>
        normalizedFeaturedPlayerIds.indexOf(left.player.playerId) - normalizedFeaturedPlayerIds.indexOf(right.player.playerId),
    )

  function resolveShareLabel(playerId: number, fallbackLabel: string) {
    const override = sanitizeShareLabel(playerNameOverrides[playerId] ?? '')
    return override || fallbackLabel
  }

  const sharePayload: ShareSnapshotPayload | null =
    participant && isCompleteSquad && statement && featuredPlayers.length >= 2 && featuredPlayers.length <= 3
      ? {
          version: 1,
          locale,
          managerName: participant.displayName,
          statement,
          featuredPlayers: featuredPlayers.map((entry) =>
            createShareSnapshotPlayer(entry.player, entry.slotClass, resolveShareLabel(entry.player.playerId, entry.player.displayName)),
          ),
        }
      : null

  const sharePath = sharePayload ? buildShareSnapshotUrl(sharePayload) : null
  const shareUrl = sharePayload ? buildAbsoluteUrl(sharePath!) : null
  const cardUrl = sharePayload ? buildShareCardUrl(sharePayload) : null

  function toggleFeaturedPlayer(playerId: number) {
    setCopyState('idle')
    setFeaturedPlayerIds((current) => {
      const baseline = normalizeFeaturedPlayerIds(current, draftedPlayerIds)

      if (baseline.includes(playerId)) {
        return baseline.filter((item) => item !== playerId)
      }

      if (baseline.length >= 3) {
        return baseline
      }

      return [...baseline, playerId]
    })
  }

  function updatePlayerNameOverride(playerId: number, value: string) {
    setCopyState('idle')
    setPlayerNameOverrides((current) => ({
      ...current,
      [playerId]: value.slice(0, maxShareLabelLength),
    }))
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

    try {
      await navigator.share({
        title: `${sharePayload.managerName} · Soccerverse World Cup`,
        text: `${sharePayload.statement} ${copy.prizeCta}`,
        url: shareUrl,
      })
    } catch {
      // Share cancellation should not surface as a blocking UI error here.
    }
  }

  if (loadState === 'loading') {
    return (
      <div className="space-y-4 pb-10">
        <section className="glass-panel rounded-[1.15rem] p-5">
          <p className="text-sm text-[var(--color-muted)]">{copy.loading}</p>
        </section>
      </div>
    )
  }

  if (loadState === 'error' || !participant || !squad) {
    return (
      <div className="space-y-4 pb-10">
        <section className="glass-panel rounded-[1.15rem] p-5">
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
      <div className="space-y-4 pb-10">
        <section className="glass-panel rounded-[1.15rem] p-5">
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
    <div className="space-y-4 pb-10">
      <section className="hero-card rounded-[1.25rem] px-5 py-6 sm:px-6 lg:px-7">
        <div className="grid gap-6 xl:grid-cols-[1fr_21rem]">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 className="section-title mt-4 max-w-[12ch]">{copy.title}</h2>
            <p className="mt-4 max-w-[64ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.body}</p>
            <p className="mt-4 text-sm font-medium text-[var(--color-accent)]">{copy.lockedHint}</p>
          </div>

          <div className="surface-row rounded-[1rem] border border-[var(--color-accent)]/20 bg-[linear-gradient(180deg,rgba(24,180,133,0.12),rgba(8,13,12,0.3))] p-4">
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">{participant.displayName}</p>
            <p className="mt-3 text-lg font-semibold text-white">{copy.prizeCta}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{copy.selectionHint}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
        <div className="space-y-4">
          <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
            <p className="eyebrow">{copy.statementLabel}</p>
            <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.statementHelp}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCopyState('idle')
                  setStatementMode('preset')
                }}
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold transition active:scale-[0.98]',
                  statementMode === 'preset' ? 'bg-[var(--color-accent)] text-[var(--color-ink)]' : 'border border-white/10 text-white hover:bg-white/6',
                ].join(' ')}
              >
                {copy.presetsLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCopyState('idle')
                  setStatementMode('custom')
                }}
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold transition active:scale-[0.98]',
                  statementMode === 'custom' ? 'bg-[var(--color-accent)] text-[var(--color-ink)]' : 'border border-white/10 text-white hover:bg-white/6',
                ].join(' ')}
              >
                {copy.customLabel}
              </button>
            </div>

            {statementMode === 'preset' ? (
              <div className="mt-4 grid gap-3">
                {copy.presets.map((preset) => {
                  const presetText = renderSharePreset(preset.template, selectedPlayerCount)
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setCopyState('idle')
                        setSelectedPresetId(preset.id)
                      }}
                      className={[
                        'surface-row rounded-[0.95rem] border px-4 py-4 text-left transition active:scale-[0.99]',
                        selectedPresetId === preset.id
                          ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10'
                          : 'border-white/8 hover:bg-white/6',
                      ].join(' ')}
                    >
                      <span className="text-sm font-semibold text-white">{presetText}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4">
                <textarea
                  rows={4}
                  value={customStatement}
                  maxLength={maxCustomStatementLength}
                  onChange={(event) => {
                    setCopyState('idle')
                    setCustomStatement(event.target.value)
                  }}
                  placeholder={copy.customPlaceholder}
                  className="min-h-32 w-full rounded-[1rem] border border-white/10 bg-[rgba(8,13,12,0.74)] px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                />
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {customStatement.trim().length}/{maxCustomStatementLength} {copy.customCounter}
                </p>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
            <p className="eyebrow">{copy.playersLabel}</p>
            <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.playersHelp}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                      'surface-row rounded-[0.95rem] border p-3 text-left transition active:scale-[0.99]',
                      isSelected
                        ? 'border-[var(--color-accent)]/34 bg-[var(--color-accent)]/10'
                        : 'border-white/8 hover:bg-white/6',
                      selectionLocked ? 'cursor-not-allowed opacity-55' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-start gap-3">
                      <PlayerPortrait
                        src={entry.player.imageUrl}
                        alt={entry.player.displayName}
                        width={76}
                        height={76}
                        className="h-[4.5rem] w-[4.5rem] rounded-[0.9rem] border border-white/10 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{entry.player.displayName}</p>
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                              {entry.slotLabel} · {entry.slotClass}
                            </p>
                          </div>
                          <span className="mono rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[var(--color-accent)]">
                            {entry.player.rating}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <TeamFlag teamCode={entry.player.teamCode || entry.player.nationalityCode} label={entry.player.displayName} size="sm" />
                          <span className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                            {entry.player.teamCode || entry.player.nationalityCode}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{copy.selectedPlayersLabel}</p>
                <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.selectedPlayersHelp}</p>
              </div>
              <span className="mono rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                {featuredPlayers.length}/3
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {featuredPlayers.map((entry, index) => {
                const shareLabel = playerNameOverrides[entry.player.playerId] ?? ''
                return (
                  <div key={entry.slotKey} className="surface-row rounded-[0.95rem] border border-white/8 p-3">
                    <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)]">
                      <div className="flex items-center gap-3">
                        <span className="mono inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-accent)]/24 bg-[var(--color-accent)]/10 text-[11px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
                          {index + 1}
                        </span>
                        <PlayerPortrait
                          src={entry.player.imageUrl}
                          alt={entry.player.displayName}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded-[0.85rem] border border-white/10 object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{entry.player.displayName}</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">{copy.playerNameHelp}</p>
                        <label className="mt-3 grid gap-2">
                          <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.playerNameLabel}</span>
                          <input
                            type="text"
                            value={shareLabel}
                            maxLength={maxShareLabelLength}
                            onChange={(event) => updatePlayerNameOverride(entry.player.playerId, event.target.value)}
                            placeholder={copy.playerNamePlaceholder}
                            className="h-11 rounded-[0.9rem] border border-white/10 bg-[rgba(8,13,12,0.74)] px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
                          />
                        </label>
                        <p className="mt-2 text-[11px] text-[var(--color-muted)]">
                          {sanitizeShareLabel(shareLabel) || entry.player.displayName}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{copy.previewLabel}</p>
                <p className="mt-3 max-w-[56ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.previewHelp}</p>
              </div>
              <Link to="/builder" className="text-sm font-semibold text-[var(--color-accent)]">
                {copy.backButton}
              </Link>
            </div>

            {cardUrl ? (
              <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-white/8 bg-[rgba(6,12,11,0.92)] shadow-[0_24px_60px_-36px_rgba(0,0,0,0.95)]">
                <img src={cardUrl} alt={statement || copy.previewLabel} className="block w-full" />
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState title={copy.errorTitle} body={copy.selectionHint} />
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              {typeof navigator.share === 'function' ? (
                <button
                  type="button"
                  onClick={() => void handleNativeShare()}
                  disabled={!shareUrl}
                  className="premium-button px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copy.shareButton}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                disabled={!shareUrl}
                className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
              >
                {copy.copyButton}
              </button>
              {shareUrl ? (
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
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
