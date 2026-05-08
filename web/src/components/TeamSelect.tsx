import { useEffect, useMemo, useRef, useState } from 'react'
import { TeamFlag } from './TeamFlag'
import type { TeamSeed } from '../lib/types'

interface TeamSelectProps {
  label: string
  teams: TeamSeed[]
  value?: string
  placeholder: string
  excludeTeamCode?: string
  onChange: (teamCode?: string) => void
}

export function TeamSelect({ label, teams, value, placeholder, excludeTeamCode, onChange }: TeamSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  const selectedTeam = useMemo(() => teams.find((team) => team.code === value), [teams, value])

  return (
    <label className="grid gap-2">
      <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{label}</span>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-14 w-full items-center justify-between gap-4 rounded-[1.3rem] border border-white/10 bg-black/15 px-4 py-3 text-left text-white transition duration-300 ease-out hover:border-white/20 hover:bg-white/5 active:scale-[0.99]"
        >
          <span className="flex min-w-0 items-center gap-3">
            {selectedTeam ? <TeamFlag teamCode={selectedTeam.code} label={selectedTeam.nameEn} size="md" /> : null}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-white">{selectedTeam?.nameEn ?? placeholder}</span>
              <span className="mono mt-1 block text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                {selectedTeam?.code ?? 'select team'}
              </span>
            </span>
          </span>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={['h-4 w-4 text-[var(--color-muted)] transition', open ? 'rotate-180' : 'rotate-0'].join(' ')}
          >
            <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open ? (
          <div className="glass-panel absolute left-0 top-[calc(100%+0.75rem)] z-30 max-h-96 w-full overflow-y-auto rounded-[1.6rem] p-2">
            <button
              type="button"
              onClick={() => {
                onChange(undefined)
                setOpen(false)
              }}
              className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-sm text-[var(--color-muted)] transition hover:bg-white/8 hover:text-white"
            >
              Clear selection
            </button>
            {teams.map((team) => {
              const disabled = excludeTeamCode === team.code
              return (
                <button
                  key={team.code}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(team.code)
                    setOpen(false)
                  }}
                  className={[
                    'flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left transition duration-300 ease-out active:scale-[0.99]',
                    disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-white/8',
                    value === team.code ? 'bg-[var(--color-accent)]/10' : '',
                  ].join(' ')}
                >
                  <TeamFlag teamCode={team.code} label={team.nameEn} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{team.nameEn}</span>
                    <span className="mono mt-1 block text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                      Group {team.groupKey} · {team.code}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </label>
  )
}
