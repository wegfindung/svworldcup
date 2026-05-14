import { useEffect, useState, type FormEvent } from 'react'
import { MatchImportPanel } from '../MatchImportPanel'
import { fetchAdminMatchEntries, fetchBootstrap, saveAdminMatchEntry } from '../../lib/api'
import type { FixtureSeed, MatchEntryInput, MatchEntryRecord, TeamSeed } from '../../lib/types'

interface MatchImportViewProps {
  adminEmail: string
}

const initialMatchEntry: MatchEntryInput = {
  fixtureId: '',
  playerId: 0,
  inOfficialSquad: true,
  minutes: 0,
  goals: 0,
  assists: 0,
  cleanSheetEligible: false,
  performancePoints: undefined,
  sourceNote: '',
}

export function MatchImportView({ adminEmail }: MatchImportViewProps) {
  const [fixtures, setFixtures] = useState<FixtureSeed[]>([])
  const [teams, setTeams] = useState<TeamSeed[]>([])
  const [matchEntry, setMatchEntry] = useState<MatchEntryInput>(initialMatchEntry)
  const [matchEntries, setMatchEntries] = useState<MatchEntryRecord[]>([])
  const [matchBusy, setMatchBusy] = useState(false)
  const [matchMessage, setMatchMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const bootstrap = await fetchBootstrap()
        if (active) {
          setFixtures(bootstrap.fixtures)
          setTeams(bootstrap.teams)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load fixtures.')
        }
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function handleSaveMatchEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMatchBusy(true)
    setError(null)
    setMatchMessage(null)

    try {
      const payload: MatchEntryInput = {
        ...matchEntry,
        sourceNote: matchEntry.sourceNote?.trim() || undefined,
        performancePoints: matchEntry.performancePoints === undefined ? undefined : matchEntry.performancePoints,
      }
      const response = await saveAdminMatchEntry(payload)
      const nextEntries = await fetchAdminMatchEntries(payload.fixtureId)
      setMatchEntries(nextEntries.items)
      setMatchEntry((current) => ({
        ...initialMatchEntry,
        fixtureId: current.fixtureId,
        inOfficialSquad: true,
      }))
      setMatchMessage(`Saved entry for player ${response.item.playerId}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Match entry save failed.')
    } finally {
      setMatchBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <MatchImportPanel fixtures={fixtures} teams={teams} adminEmail={adminEmail} />

      <form onSubmit={handleSaveMatchEntry} className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">match stat entry</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Enter player performance.</h3>
            <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-[var(--color-muted)]">
              One entry per fixture and player. Saving the same pair updates the stat line used by public tables.
            </p>
          </div>
          <button
            type="button"
            disabled={!matchEntry.fixtureId || matchBusy}
            onClick={async () => {
              setMatchBusy(true)
              setError(null)
              try {
                const response = await fetchAdminMatchEntries(matchEntry.fixtureId)
                setMatchEntries(response.items)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not load match entries.')
              } finally {
                setMatchBusy(false)
              }
            }}
            className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
          >
            Load fixture
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-2 sm:col-span-2">
            <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Fixture ID</span>
            <input
              required
              value={matchEntry.fixtureId}
              onChange={(event) => setMatchEntry((current) => ({ ...current, fixtureId: event.target.value }))}
              placeholder="group-a-mex-rsa"
              className="h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
            />
          </label>
          <label className="grid gap-2 sm:col-span-2">
            <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Player ID</span>
            <input
              required
              type="number"
              min={1}
              value={matchEntry.playerId || ''}
              onChange={(event) => setMatchEntry((current) => ({ ...current, playerId: Number(event.target.value) }))}
              placeholder="12345"
              className="h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
            />
          </label>
          {(['minutes', 'goals', 'assists'] as const).map((key) => (
            <label key={key} className="grid gap-2">
              <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{key}</span>
              <input
                type="number"
                min={0}
                max={key === 'minutes' ? 130 : 20}
                value={matchEntry[key]}
                onChange={(event) => setMatchEntry((current) => ({ ...current, [key]: Number(event.target.value) }))}
                className="h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
              />
            </label>
          ))}
          <label className="grid gap-2">
            <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Performance</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={matchEntry.performancePoints ?? ''}
              onChange={(event) =>
                setMatchEntry((current) => ({
                  ...current,
                  performancePoints: event.target.value === '' ? undefined : Number(event.target.value),
                }))
              }
              placeholder="0.8"
              className="h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-[1rem] border border-white/8 bg-black/12 px-4 py-3 text-sm text-white">
            <input
              type="checkbox"
              checked={matchEntry.inOfficialSquad}
              onChange={(event) => setMatchEntry((current) => ({ ...current, inOfficialSquad: event.target.checked }))}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            In official squad
          </label>
          <label className="flex items-center gap-3 rounded-[1rem] border border-white/8 bg-black/12 px-4 py-3 text-sm text-white">
            <input
              type="checkbox"
              checked={matchEntry.cleanSheetEligible}
              onChange={(event) => setMatchEntry((current) => ({ ...current, cleanSheetEligible: event.target.checked }))}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Clean sheet eligible
          </label>
        </div>

        <label className="mt-4 grid gap-2">
          <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Source note</span>
          <input
            value={matchEntry.sourceNote ?? ''}
            onChange={(event) => setMatchEntry((current) => ({ ...current, sourceNote: event.target.value }))}
            placeholder="manual admin entry"
            className="h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]"
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={matchBusy}
            className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
          >
            {matchBusy ? 'Saving...' : 'Save stat line'}
          </button>
          {matchMessage ? <p className="text-sm text-[var(--color-accent)]">{matchMessage}</p> : null}
        </div>

        {matchEntries.length ? (
          <div className="mt-5 overflow-hidden rounded-[1rem] border border-white/8">
            {matchEntries.slice(0, 6).map((entry) => (
              <div key={entry.entryId} className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/8 bg-black/12 px-4 py-3 last:border-b-0">
                <div>
                  <p className="mono text-xs text-white">Player {entry.playerId}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {entry.minutes} min · {entry.goals} G · {entry.assists} A
                  </p>
                </div>
                <span className="mono text-xs text-[var(--color-accent)]">{entry.inOfficialSquad ? 'IN' : 'OUT'}</span>
              </div>
            ))}
          </div>
        ) : null}
      </form>
    </div>
  )
}
