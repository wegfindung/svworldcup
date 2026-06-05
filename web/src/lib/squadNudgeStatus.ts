// Cohort the participant falls into for the "don't forget to submit" nudge. Most registered
// participants never lock a squad, especially rookies — the nudge adapts its message and urgency to
// where each participant actually got stuck. Pure function so the cohort logic is unit-testable
// without rendering. See architecture/SOP_registration_and_auth.md "Squad Builder Flow".
export type SquadNudgeStatus = 'empty' | 'partial' | 'complete' | 'locked' | 'startedUnlocked' | 'none'

export function resolveSquadNudgeStatus(input: {
  draftedCount: number
  isLocked: boolean
  competitionStarted: boolean
}): SquadNudgeStatus {
  const { draftedCount, isLocked, competitionStarted } = input

  if (isLocked) {
    // A locked squad past the first kickoff is frozen (only timed swaps remain) — nothing to nudge.
    return competitionStarted ? 'none' : 'locked'
  }

  // Not locked. If the tournament already started, the squad isn't scoring yet — the one urgent case.
  if (competitionStarted) {
    return 'startedUnlocked'
  }

  if (draftedCount >= 15) {
    return 'complete'
  }

  return draftedCount > 0 ? 'partial' : 'empty'
}
