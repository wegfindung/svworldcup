import type { LeagueType } from './types'

const participantReadyStorageKey = 'svworldcup-participant-ready'

export interface ParticipantReadyState {
  displayName: string
  email: string
  leagueType: LeagueType
  budgetLimit: number
  budgetRemaining?: number
  budgetUsed?: number
  draftedCount?: number
  isLocked?: boolean
  hasPassword: boolean
}

export function readParticipantReady(): ParticipantReadyState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(participantReadyStorageKey)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<ParticipantReadyState>
    if (
      typeof parsed.displayName !== 'string' ||
      typeof parsed.email !== 'string' ||
      (parsed.leagueType !== 'rookie' && parsed.leagueType !== 'veteran') ||
      typeof parsed.budgetLimit !== 'number' ||
      (parsed.budgetRemaining !== undefined && typeof parsed.budgetRemaining !== 'number') ||
      (parsed.budgetUsed !== undefined && typeof parsed.budgetUsed !== 'number') ||
      (parsed.draftedCount !== undefined && typeof parsed.draftedCount !== 'number') ||
      (parsed.isLocked !== undefined && typeof parsed.isLocked !== 'boolean') ||
      typeof parsed.hasPassword !== 'boolean'
    ) {
      return null
    }

    return {
      displayName: parsed.displayName,
      email: parsed.email,
      leagueType: parsed.leagueType,
      budgetLimit: parsed.budgetLimit,
      budgetRemaining: parsed.budgetRemaining,
      budgetUsed: parsed.budgetUsed,
      draftedCount: parsed.draftedCount,
      isLocked: parsed.isLocked,
      hasPassword: parsed.hasPassword,
    }
  } catch {
    return null
  }
}

export function writeParticipantReady(state: ParticipantReadyState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(participantReadyStorageKey, JSON.stringify(state))
}

export function clearParticipantReady() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(participantReadyStorageKey)
}
