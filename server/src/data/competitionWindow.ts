import { env } from '../config/env.js'
import { fixtures } from './worldCupSeed.js'

// Registration closes at the Soccerverse season transition: 2026-07-04 00:00 UTC (unix 1783123200).
// At that transition the game rewrites every player's rating, and rating drives our wage/cap table
// (salaryTable.ts). No squad may be created or edited past this instant — otherwise it would be
// built against a different wage table than everyone else's, breaking the fairness of the draft.
// Overridable via REGISTRATION_CLOSE_AT for testing and live tuning.
const DEFAULT_REGISTRATION_CLOSE_EPOCH = 1_783_123_200_000

export function registrationCloseEpoch() {
  return env.REGISTRATION_CLOSE_AT ? env.REGISTRATION_CLOSE_AT.getTime() : DEFAULT_REGISTRATION_CLOSE_EPOCH
}

export function isRegistrationOpen(now = Date.now()) {
  return now < registrationCloseEpoch()
}

export function hasRegistrationClosed(now = Date.now()) {
  return !isRegistrationOpen(now)
}

export function fixtureKickoffEpoch(fixture: { kickoffDate: string; kickoffTimeUtc: string }) {
  const epoch = new Date(`${fixture.kickoffDate}T${fixture.kickoffTimeUtc}Z`).getTime()
  return Number.isFinite(epoch) ? epoch : null
}

export function competitionStartEpoch() {
  const kickoffEpochs = fixtures
    .map((fixture) => fixtureKickoffEpoch(fixture))
    .filter((epoch): epoch is number => epoch !== null)

  return kickoffEpochs.length ? Math.min(...kickoffEpochs) : null
}

export function hasCompetitionStarted(now = Date.now()) {
  const start = competitionStartEpoch()
  return start !== null && now >= start
}
