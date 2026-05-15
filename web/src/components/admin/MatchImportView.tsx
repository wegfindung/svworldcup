import { useEffect, useState } from 'react'
import { MatchImportPanel } from '../MatchImportPanel'
import { fetchBootstrap } from '../../lib/api'
import type { FixtureSeed, TeamSeed } from '../../lib/types'

interface MatchImportViewProps {
  adminEmail: string
}

export function MatchImportView({ adminEmail }: MatchImportViewProps) {
  const [fixtures, setFixtures] = useState<FixtureSeed[]>([])
  const [teams, setTeams] = useState<TeamSeed[]>([])
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

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-[1.3rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-[var(--color-paper)]">
          {error}
        </div>
      ) : null}
      <MatchImportPanel fixtures={fixtures} teams={teams} adminEmail={adminEmail} />
    </div>
  )
}
