import { getMessages } from '../i18n/messages'
import { isTeamEliminated, useTournamentSurvival } from '../lib/tournamentSurvival'
import type { LocaleCode } from '../lib/types'

// Inline "Eliminated" chip for a player whose tournament team is knocked out — so a list row shows it
// without opening the modal. Renders null when the team is still in, before the knockout stage, or for
// a non-tournament code. Self-contained (reads the shared survival set), so it drops into any player row
// without threading survival through. See SOP_scoring_and_leagues.md "Squad survival indicator …".
export function EliminatedBadge({ teamCode, locale, className }: { teamCode: string; locale: LocaleCode; className?: string }) {
  const survival = useTournamentSurvival()
  if (!isTeamEliminated(survival, teamCode)) {
    return null
  }
  const copy = getMessages(locale).survival
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-red-300 ${className ?? ''}`}
    >
      <span aria-hidden="true">●</span>
      {copy.eliminated}
    </span>
  )
}
