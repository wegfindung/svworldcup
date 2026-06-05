import { describe, expect, it } from 'vitest'
import { resolveSquadNudgeStatus } from './squadNudgeStatus'

describe('resolveSquadNudgeStatus', () => {
  it('nudges participants who never built a squad', () => {
    expect(resolveSquadNudgeStatus({ draftedCount: 0, isLocked: false, competitionStarted: false })).toBe('empty')
  })

  it('nudges partial squads while drafting is in progress', () => {
    expect(resolveSquadNudgeStatus({ draftedCount: 7, isLocked: false, competitionStarted: false })).toBe('partial')
    expect(resolveSquadNudgeStatus({ draftedCount: 14, isLocked: false, competitionStarted: false })).toBe('partial')
  })

  it('flags a complete-but-unlocked squad as the one-step-left case', () => {
    expect(resolveSquadNudgeStatus({ draftedCount: 15, isLocked: false, competitionStarted: false })).toBe('complete')
  })

  it('reassures a submitted squad that is still editable before kickoff', () => {
    expect(resolveSquadNudgeStatus({ draftedCount: 15, isLocked: true, competitionStarted: false })).toBe('locked')
  })

  it('goes quiet once a locked squad is frozen at kickoff', () => {
    expect(resolveSquadNudgeStatus({ draftedCount: 15, isLocked: true, competitionStarted: true })).toBe('none')
  })

  it('raises urgency for an unlocked squad after the tournament has started', () => {
    expect(resolveSquadNudgeStatus({ draftedCount: 15, isLocked: false, competitionStarted: true })).toBe('startedUnlocked')
    expect(resolveSquadNudgeStatus({ draftedCount: 3, isLocked: false, competitionStarted: true })).toBe('startedUnlocked')
  })
})
