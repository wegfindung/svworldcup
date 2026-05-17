import { fixtures } from './worldCupSeed.js'

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
