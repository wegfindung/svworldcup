import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState } from './EmptyState'
import { InfoTip } from './InfoTip'
import { MatchImportResolveStage } from './MatchImportResolveStage'
import { MatchImportReview } from './MatchImportReview'
import { TeamFlag } from './TeamFlag'
import {
  clearOfficialScore,
  fetchMatchImportBatches,
  fetchOfficialScores,
  parseMatchImport,
  setOfficialScore,
  uploadMatchImport,
} from '../lib/api'
import type {
  FixtureSeed,
  MatchImportInput,
  MatchResolution,
  PendingMatchBatch,
  ResolutionOverride,
  TeamSeed,
} from '../lib/types'

interface MatchImportPanelProps {
  fixtures: FixtureSeed[]
  teams: TeamSeed[]
  adminEmail: string
}

// D17 mirror — distinct admins whose confirmation matches the batch's current data version.
function validConfirmerCount(batch: PendingMatchBatch): number {
  const emails = new Set<string>()
  for (const confirmation of batch.confirmations) {
    if (confirmation.dataVersion === batch.dataVersion) {
      emails.add(confirmation.adminEmail)
    }
  }
  return emails.size
}

function teamSeedFor(teams: Map<string, TeamSeed>, code: string): TeamSeed {
  return (
    teams.get(code) ?? {
      code,
      slug: code.toLowerCase(),
      nameEn: code,
      groupKey: '',
    }
  )
}

const inputClass =
  'h-11 rounded-[1rem] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]'

export function MatchImportPanel({ fixtures, teams, adminEmail }: MatchImportPanelProps) {
  const [batches, setBatches] = useState<PendingMatchBatch[]>([])
  const [batchesLoaded, setBatchesLoaded] = useState(false)
  const [listBusy, setListBusy] = useState(false)
  const [reviewBatch, setReviewBatch] = useState<PendingMatchBatch | null>(null)
  const [uploadFixtureId, setUploadFixtureId] = useState<string | null>(null)
  const [format, setFormat] = useState<'json' | 'csv'>('json')
  const [pasteText, setPasteText] = useState('')
  const [csvHomeGoals, setCsvHomeGoals] = useState('')
  const [csvAwayGoals, setCsvAwayGoals] = useState('')
  const [csvSourceUrl, setCsvSourceUrl] = useState('')
  const [jsonSourceUrl, setJsonSourceUrl] = useState('')
  const [csvFileName, setCsvFileName] = useState('')
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [resolution, setResolution] = useState<MatchResolution | null>(null)
  const [pendingInput, setPendingInput] = useState<MatchImportInput | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const csvFileInputRef = useRef<HTMLInputElement>(null)
  // Official scoreline overrides (display-only correction for own goals / skipped scorers).
  const [scoreOverrides, setScoreOverrides] = useState<Record<string, { home: number; away: number }>>({})
  const [scoreEditorFixtureId, setScoreEditorFixtureId] = useState<string | null>(null)
  const [scoreHome, setScoreHome] = useState('')
  const [scoreAway, setScoreAway] = useState('')
  const [scoreBusy, setScoreBusy] = useState(false)

  const teamByCode = useMemo(() => {
    const map = new Map<string, TeamSeed>()
    for (const team of teams) {
      map.set(team.code, team)
    }
    return map
  }, [teams])

  const batchByFixture = useMemo(() => {
    const map = new Map<string, PendingMatchBatch>()
    for (const batch of batches) {
      map.set(batch.fixtureId, batch)
    }
    return map
  }, [batches])

  // Load any in-progress batches on mount so the fixture list reflects existing pending
  // batches and the upload form's batch-exists/replace guard is live from the start.
  useEffect(() => {
    let active = true
    void fetchMatchImportBatches()
      .then((response) => {
        if (active) {
          setBatches(response.items)
          setBatchesLoaded(true)
        }
      })
      .catch(() => {
        // A mount-time load failure is non-blocking — the "Refresh pending imports"
        // button stays available and surfaces errors.
      })
    void fetchOfficialScores()
      .then((response) => {
        if (active) {
          setScoreOverrides(response.overrides)
        }
      })
      .catch(() => {
        // Non-blocking: the per-fixture editor still works; it just won't preload current values.
      })
    return () => {
      active = false
    }
  }, [])

  function openScoreEditor(fixtureId: string) {
    const current = scoreOverrides[fixtureId]
    setScoreEditorFixtureId(fixtureId)
    setScoreHome(current ? String(current.home) : '')
    setScoreAway(current ? String(current.away) : '')
    setError(null)
    setMessage(null)
  }

  async function handleSaveScore(fixtureId: string) {
    const home = Number(scoreHome)
    const away = Number(scoreAway)
    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
      setError('Enter the official score as whole numbers.')
      return
    }
    setScoreBusy(true)
    setError(null)
    setMessage(null)
    try {
      await setOfficialScore(fixtureId, home, away)
      setScoreOverrides((current) => ({ ...current, [fixtureId]: { home, away } }))
      setScoreEditorFixtureId(null)
      setMessage(`Official score set to ${home}–${away}. The public results page now shows it.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the official score.')
    } finally {
      setScoreBusy(false)
    }
  }

  async function handleClearScore(fixtureId: string) {
    setScoreBusy(true)
    setError(null)
    setMessage(null)
    try {
      await clearOfficialScore(fixtureId)
      setScoreOverrides((current) => {
        const next = { ...current }
        delete next[fixtureId]
        return next
      })
      setScoreEditorFixtureId(null)
      setMessage('Official score cleared. The results page reverts to the summed scorers.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not clear the official score.')
    } finally {
      setScoreBusy(false)
    }
  }

  function resolveSides(batch: PendingMatchBatch): { home: TeamSeed; away: TeamSeed } {
    const fixture = fixtures.find((item) => item.fixtureId === batch.fixtureId)
    if (fixture) {
      return {
        home: teamSeedFor(teamByCode, fixture.homeTeamCode),
        away: teamSeedFor(teamByCode, fixture.awayTeamCode),
      }
    }
    // Fallback for batches whose fixture is not in the seeded list (e.g. knockout rows).
    const codes = [...new Set(batch.rows.map((row) => row.teamCode))]
    return {
      home: teamSeedFor(teamByCode, codes[0] ?? '???'),
      away: teamSeedFor(teamByCode, codes[1] ?? codes[0] ?? '???'),
    }
  }

  function applyBatch(batch: PendingMatchBatch) {
    setBatches((current) => {
      const next = current.filter((item) => item.batchId !== batch.batchId)
      next.push(batch)
      return next
    })
  }

  async function handleRefresh() {
    setListBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetchMatchImportBatches()
      setBatches(response.items)
      setBatchesLoaded(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load pending imports.')
    } finally {
      setListBusy(false)
    }
  }

  function handleStartUpload(fixtureId: string) {
    setUploadFixtureId(fixtureId)
    setFormat('json')
    setPasteText('')
    setCsvHomeGoals('')
    setCsvAwayGoals('')
    setCsvSourceUrl('')
    setJsonSourceUrl('')
    setCsvFileName('')
    setReplaceExisting(false)
    setResolution(null)
    setPendingInput(null)
    setError(null)
    setMessage(null)
  }

  // Read a dropped or picked CSV/TSV file into the paste box — a file is an alternative to
  // pasting, not a separate path: the file content just becomes the paste text.
  async function handleCsvFile(file: File) {
    try {
      const text = await file.text()
      setPasteText(text)
      setCsvFileName(file.name)
      setError(null)
    } catch {
      setError('Could not read that file.')
    }
  }

  function buildInput(): MatchImportInput | null {
    if (format === 'json') {
      let parsed: unknown
      try {
        parsed = JSON.parse(pasteText)
      } catch {
        setError('The pasted text is not valid JSON.')
        return null
      }
      // Optional source URL form field — falls back to the JSON's own match.sourceUrl
      // server-side; the server rejects if neither is present.
      return { format: 'json', json: parsed, sourceUrl: jsonSourceUrl.trim() || undefined }
    }
    const homeGoals = Number(csvHomeGoals)
    const awayGoals = Number(csvAwayGoals)
    if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) {
      setError('Enter the final score as whole numbers.')
      return null
    }
    if (!csvSourceUrl.trim()) {
      setError('Enter the source URL.')
      return null
    }
    return { format: 'csv', text: pasteText, homeGoals, awayGoals, sourceUrl: csvSourceUrl.trim() }
  }

  async function handleParse() {
    if (!uploadFixtureId) {
      return
    }
    const input = buildInput()
    if (!input) {
      return
    }
    setUploadBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await parseMatchImport({ fixtureId: uploadFixtureId, input })
      setResolution(response.resolution)
      setPendingInput(input)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not parse the submission.')
    } finally {
      setUploadBusy(false)
    }
  }

  async function handleSubmitResolved(overrides: ResolutionOverride[]) {
    if (!uploadFixtureId || !pendingInput) {
      return
    }
    setUploadBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await uploadMatchImport({
        fixtureId: uploadFixtureId,
        input: pendingInput,
        overrides,
        replace: replaceExisting,
      })
      applyBatch(response.batch)
      setUploadFixtureId(null)
      setPasteText('')
      setResolution(null)
      setPendingInput(null)
      const skipped = response.skippedNames.length
      setMessage(
        `Imported ${response.batch.rows.length} rows${
          skipped > 0 ? ` · ${skipped} name${skipped === 1 ? '' : 's'} auto-skipped` : ''
        }. Opened for review.`,
      )
      setReviewBatch(response.batch)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Submit failed.')
      // A failed submit can mean a batch already exists for this fixture (a re-submission
      // race, or a prior partial upload). Re-fetch so the admin lands on Review instead of
      // being stranded re-submitting on the resolve stage.
      try {
        const response = await fetchMatchImportBatches()
        setBatches(response.items)
        setBatchesLoaded(true)
        const existing = response.items.find((item) => item.fixtureId === uploadFixtureId)
        if (existing) {
          setUploadFixtureId(null)
          setPasteText('')
          setResolution(null)
          setPendingInput(null)
          setError(null)
          setMessage('A pending batch already exists for this fixture — opened for review.')
          setReviewBatch(existing)
        }
      } catch {
        // Keep the original submit error visible if the batch-list refresh also fails.
      }
    } finally {
      setUploadBusy(false)
    }
  }

  // --- Review view ---

  if (reviewBatch) {
    const sides = resolveSides(reviewBatch)
    return (
      <section className="space-y-4">
        <MatchImportReview
          batch={reviewBatch}
          homeTeam={sides.home}
          awayTeam={sides.away}
          adminEmail={adminEmail}
          onBatchUpdated={(batch) => {
            applyBatch(batch)
            setReviewBatch(batch)
          }}
          onBatchRemoved={(reason, promotedRowCount) => {
            setBatches((current) => current.filter((item) => item.batchId !== reviewBatch.batchId))
            setReviewBatch(null)
            setMessage(
              reason === 'promoted'
                ? `Fixture promoted — ${promotedRowCount ?? 0} rows written to match entries.`
                : 'Pending batch discarded.',
            )
          }}
          onClose={() => setReviewBatch(null)}
        />
      </section>
    )
  }

  // --- Pre-persist resolve stage (Fix 7) ---

  if (resolution && uploadFixtureId) {
    const fixture = fixtures.find((item) => item.fixtureId === uploadFixtureId)
    const home = teamSeedFor(teamByCode, fixture?.homeTeamCode ?? '???')
    const away = teamSeedFor(teamByCode, fixture?.awayTeamCode ?? '???')
    return (
      <section className="space-y-4">
        <MatchImportResolveStage
          resolution={resolution}
          homeTeam={home}
          awayTeam={away}
          busy={uploadBusy}
          onSubmit={handleSubmitResolved}
          onBack={() => setResolution(null)}
        />
        {error ? (
          <div className="rounded-[1.1rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
            {error}
          </div>
        ) : null}
      </section>
    )
  }

  // --- Upload form view ---

  if (uploadFixtureId) {
    const fixture = fixtures.find((item) => item.fixtureId === uploadFixtureId)
    const existing = batchByFixture.get(uploadFixtureId)
    const home = fixture ? teamSeedFor(teamByCode, fixture.homeTeamCode) : null
    const away = fixture ? teamSeedFor(teamByCode, fixture.awayTeamCode) : null
    const csvFieldsFilled =
      format === 'json' ||
      (csvHomeGoals.trim() !== '' && csvAwayGoals.trim() !== '' && csvSourceUrl.trim() !== '')
    const parseDisabled =
      uploadBusy || !pasteText.trim() || !csvFieldsFilled || (Boolean(existing) && !replaceExisting)

    return (
      <section className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">match data import</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {home && away ? `${home.nameEn} vs ${away.nameEn}` : 'Upload match stats'}
            </h3>
            <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-[var(--color-muted)]">
              Submit the fixture's data as JSON or as a CSV/TSV player-rows table. It is parsed and resolved
              against the team pools — nothing is saved until you resolve every flagged row and submit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUploadFixtureId(null)}
            className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>

        {existing ? (
          <div className="mt-4 rounded-[1.1rem] border border-amber-300/25 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
            A pending batch already exists for this fixture (v{existing.dataVersion}). Re-submitting
            wholesale-replaces it and resets all confirmations. Tick the box below to confirm the replacement.
            <label className="mt-3 flex items-center gap-3 text-sm text-white">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(event) => setReplaceExisting(event.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              Replace the existing pending batch
            </label>
          </div>
        ) : null}

        {/* Fix B: the CSV path accepts BOTH the manual paste contract and the official
            provider feed file — the server auto-detects the format from the header row
            (server/src/lib/matchImportFeedCsv.ts). A possible later addition is a feed-URL
            mode where the server fetches the CSV itself. */}
        <div className="mt-4 flex items-center gap-2">
          {(['json', 'csv'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormat(value)}
              className={[
                'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition active:scale-[0.98]',
                format === value
                  ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                  : 'border border-white/10 text-white hover:bg-white/6',
              ].join(' ')}
            >
              {value === 'json' ? 'JSON' : 'CSV / TSV'}
            </button>
          ))}
          <InfoTip
            label="About the input formats"
            content="JSON carries its own match block (teams and score); the source URL can come from the JSON or the field below. CSV/TSV is a pure player-rows table with a header row — you enter the score and source URL in the fields above the paste box. The official provider feed file (one CSV per fixture) is accepted as-is: squad players without minutes are dropped automatically and starters are derived from minutes played."
          />
        </div>

        {format === 'json' ? (
          <label className="mt-4 grid gap-2">
            <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
              source URL (optional — falls back to the JSON&apos;s own)
            </span>
            <input
              value={jsonSourceUrl}
              onChange={(event) => setJsonSourceUrl(event.target.value)}
              placeholder="https://wcup.soccerverse.io/..."
              className={inputClass}
            />
          </label>
        ) : null}

        {format === 'csv' ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="grid gap-2">
              <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">home goals</span>
              <input
                type="number"
                min={0}
                value={csvHomeGoals}
                onChange={(event) => setCsvHomeGoals(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="grid gap-2">
              <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">away goals</span>
              <input
                type="number"
                min={0}
                value={csvAwayGoals}
                onChange={(event) => setCsvAwayGoals(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="grid gap-2 sm:col-span-3">
              <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">source URL</span>
              <input
                value={csvSourceUrl}
                onChange={(event) => setCsvSourceUrl(event.target.value)}
                placeholder="https://wcup.soccerverse.io/..."
                className={inputClass}
              />
            </label>
          </div>
        ) : null}

        {format === 'csv' ? (
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const file = event.dataTransfer.files[0]
              if (file) void handleCsvFile(file)
            }}
            onClick={() => csvFileInputRef.current?.click()}
            className="mt-4 cursor-pointer rounded-[1rem] border border-dashed border-white/15 bg-black/10 px-4 py-6 text-center text-sm text-[var(--color-muted)] transition hover:border-[var(--color-accent)]/50 hover:bg-white/4"
          >
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleCsvFile(file)
                event.target.value = ''
              }}
            />
            {csvFileName
              ? `Loaded "${csvFileName}" — drop another file, or edit it in the box below.`
              : 'Drag a CSV/TSV file here, or click to browse. The provider feed file works as-is. You can also paste directly below.'}
          </div>
        ) : null}

        <label className="mt-4 grid gap-2">
          <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
            {format === 'json' ? 'match JSON' : 'player rows (CSV/TSV, with a header row)'}
          </span>
          <textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            rows={12}
            placeholder={
              format === 'json'
                ? '{\n  "match": { ... },\n  "players": [ ... ]\n}'
                : 'name\tteam\tlineupStatus\tminutes\tgoals\tassists\trating\n...'
            }
            className="mono w-full rounded-[1rem] border border-white/10 bg-black/15 px-3 py-3 text-xs text-white outline-none transition focus:border-[var(--color-accent)]"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={parseDisabled}
            onClick={() => void handleParse()}
            className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
          >
            {uploadBusy ? 'Parsing…' : 'Parse and resolve'}
          </button>
          {error ? <p className="text-sm text-amber-200">{error}</p> : null}
        </div>
      </section>
    )
  }

  // --- Fixture list view ---

  return (
    <section className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">match data import</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Import match stats per fixture.</h3>
          <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-[var(--color-muted)]">
            Pick a fixture, submit the JSON or CSV/TSV, resolve every flagged row, then confirm. Each fixture needs
            two distinct admin confirmations before its stats are promoted to the scoring tables.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={listBusy}
            className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
          >
            {listBusy ? 'Loading…' : 'Refresh pending imports'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-[1.1rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
          {error}
        </div>
      ) : null}
      {message ? <p className="mt-4 text-sm text-[var(--color-accent)]">{message}</p> : null}

      <div className="mt-5 grid gap-2">
        {fixtures.length === 0 ? (
          <EmptyState
            title="No fixtures loaded"
            body="Sign in to load the fixture schedule. The import panel lists every fixture the backend exposes."
          />
        ) : (
          fixtures.map((fixture) => {
            const home = teamSeedFor(teamByCode, fixture.homeTeamCode)
            const away = teamSeedFor(teamByCode, fixture.awayTeamCode)
            const batch = batchByFixture.get(fixture.fixtureId)
            const override = scoreOverrides[fixture.fixtureId]
            const editing = scoreEditorFixtureId === fixture.fixtureId
            return (
              <div
                key={fixture.fixtureId}
                className="flex flex-col gap-3 rounded-[1.4rem] border border-white/8 bg-black/15 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <TeamFlag teamCode={home.code} label={home.nameEn} size="sm" />
                    <span className="text-sm font-medium text-white">{home.nameEn}</span>
                    <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">vs</span>
                    <span className="text-sm font-medium text-white">{away.nameEn}</span>
                    <TeamFlag teamCode={away.code} label={away.nameEn} size="sm" />
                    <span className="mono ml-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {fixture.kickoffDate}
                    </span>
                    {override ? (
                      <span className="mono rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-200">
                        score {override.home}–{override.away}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => (editing ? setScoreEditorFixtureId(null) : openScoreEditor(fixture.fixtureId))}
                      className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                    >
                      Official score
                    </button>
                    {batch ? (
                      <>
                        <span className="mono rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-accent)]">
                          v{batch.dataVersion} · {validConfirmerCount(batch)}/2
                        </span>
                        <InfoTip
                          label="About the batch status"
                          content="v = data version (bumps on every edit). N/2 = distinct admin confirmations on the current version. Two are needed before the fixture is promoted to the scoring tables."
                        />
                        <button
                          type="button"
                          onClick={() => handleStartUpload(fixture.fixtureId)}
                          className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                        >
                          Re-upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewBatch(batch)}
                          className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
                        >
                          Review
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartUpload(fixture.fixtureId)}
                        className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                      >
                        Upload
                      </button>
                    )}
                  </div>
                </div>

                {editing ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-[1.1rem] border border-white/8 bg-black/20 px-3 py-3">
                    <span className="max-w-[42ch] text-xs leading-relaxed text-[var(--color-muted)]">
                      Public results-page score. Set this when an own goal or skipped scorer makes the
                      auto-summed score read low. Leave it to auto-capture the imported score on promote.
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={scoreHome}
                        onChange={(event) => setScoreHome(event.target.value)}
                        aria-label={`${home.nameEn} goals`}
                        className="h-10 w-16 rounded-[0.8rem] border border-white/10 bg-black/15 px-2 text-center text-sm text-white outline-none focus:border-[var(--color-accent)]"
                      />
                      <span className="text-sm text-[var(--color-muted)]">–</span>
                      <input
                        type="number"
                        min={0}
                        value={scoreAway}
                        onChange={(event) => setScoreAway(event.target.value)}
                        aria-label={`${away.nameEn} goals`}
                        className="h-10 w-16 rounded-[0.8rem] border border-white/10 bg-black/15 px-2 text-center text-sm text-white outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={scoreBusy}
                      onClick={() => void handleSaveScore(fixture.fixtureId)}
                      className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                    >
                      {scoreBusy ? 'Saving…' : 'Save'}
                    </button>
                    {override ? (
                      <button
                        type="button"
                        disabled={scoreBusy}
                        onClick={() => void handleClearScore(fixture.fixtureId)}
                        className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                      >
                        Clear
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setScoreEditorFixtureId(null)}
                      className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>

      {!batchesLoaded && fixtures.length > 0 ? (
        <p className="mt-3 text-xs text-[var(--color-muted)]">
          Press “Refresh pending imports” to load any in-progress batches.
        </p>
      ) : null}
    </section>
  )
}
