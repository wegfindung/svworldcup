import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TeamFlag } from './TeamFlag'
import type { SoccerverseNation } from '../data/soccerverseNations'

interface NationSelectProps {
  label: string
  nations: SoccerverseNation[]
  value?: string
  placeholder: string
  searchPlaceholder?: string
  excludeCode?: string
  onChange: (code?: string) => void
}

export function NationSelect({ label, nations, value, placeholder, searchPlaceholder = 'Search nations', excludeCode, onChange }: NationSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const closeMenu = useCallback(() => {
    setQuery('')
    setOpen(false)
  }, [])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [closeMenu])

  const selectedNation = useMemo(() => nations.find((nation) => nation.code === value), [nations, value])
  const filteredNations = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const sorted = [...nations].sort((left, right) => left.nameEn.localeCompare(right.nameEn))
    if (!needle) {
      return sorted
    }
    return sorted.filter((nation) => nation.nameEn.toLowerCase().includes(needle) || nation.code.includes(needle))
  }, [nations, query])

  return (
    <label className="grid gap-2">
      <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{label}</span>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            if (open) {
              closeMenu()
            } else {
              setOpen(true)
            }
          }}
          className="flex min-h-14 w-full items-center justify-between gap-4 rounded-[1.3rem] border border-white/10 bg-[rgba(8,13,12,0.78)] px-4 py-3 text-left text-white transition duration-300 ease-out hover:border-white/18 hover:bg-[rgba(14,20,18,0.92)] active:scale-[0.99]"
        >
          <span className="flex min-w-0 items-center gap-3">
            {selectedNation ? <TeamFlag teamCode={selectedNation.code} label={selectedNation.nameEn} size="md" /> : null}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-white">{selectedNation?.nameEn ?? placeholder}</span>
              <span className="mono mt-1 block text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                {selectedNation?.code ?? 'select nation'}
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
          <div className="absolute left-0 top-[calc(100%+0.75rem)] z-50 max-h-[24rem] w-full overflow-hidden rounded-[1.15rem] border border-white/10 bg-[rgba(8,13,12,0.98)] shadow-[0_28px_60px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="border-b border-white/8 p-2">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-[0.9rem] border border-white/10 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
              />
            </div>
            <div className="max-h-[18rem] overflow-y-auto p-2">
              <button
                type="button"
                onClick={() => {
                  onChange(undefined)
                  closeMenu()
                }}
                className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-sm text-[var(--color-muted)] transition hover:bg-white/6 hover:text-white"
              >
                Clear selection
              </button>
              {filteredNations.map((nation) => {
                const disabled = excludeCode === nation.code
                return (
                  <button
                    key={nation.code}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onChange(nation.code)
                      closeMenu()
                    }}
                    className={[
                      'flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left transition duration-300 ease-out active:scale-[0.99]',
                      disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-white/6',
                      value === nation.code ? 'bg-[var(--color-accent)]/12' : '',
                    ].join(' ')}
                  >
                    <TeamFlag teamCode={nation.code} label={nation.nameEn} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{nation.nameEn}</span>
                      <span className="mono mt-1 block text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{nation.code}</span>
                    </span>
                  </button>
                )
              })}
              {filteredNations.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-[var(--color-muted)]">No matches</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </label>
  )
}
