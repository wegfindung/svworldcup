import { describe, expect, it } from 'vitest'
import { MemoryRegistrationRepository, RookieUpgradeError } from './registrationRepository.js'

async function createActiveRookie(email = 'rookie@example.com', token = 'rookie-token') {
  const repo = new MemoryRegistrationRepository()
  const { record } = await repo.createPending(
    {
      email,
      displayName: 'Rookie One',
      primaryTeamCode: 'FRA',
      marketingOptIn: false,
    },
    token,
  )
  await repo.verifyByPlainToken(token)
  return { repo, participantId: record.participantId }
}

async function createActiveVeteran(repo: MemoryRegistrationRepository, email: string, token: string, username: string) {
  const { record } = await repo.createPending(
    {
      email,
      displayName: 'Veteran',
      primaryTeamCode: 'BRA',
      soccerverseUsername: username,
      marketingOptIn: false,
    },
    token,
  )
  await repo.verifyByPlainToken(token)
  return record.participantId
}

describe('MemoryRegistrationRepository.upgradeRookieToVeteran', () => {
  it('promotes a rookie to veteran and stamps veteranSince', async () => {
    const { repo, participantId } = await createActiveRookie()
    const before = await repo.getByParticipantId(participantId)
    expect(before?.leagueType).toBe('rookie')
    expect(before?.soccerverseUsername).toBeUndefined()
    expect(before?.veteranSince).toBeUndefined()

    const upgraded = await repo.upgradeRookieToVeteran(participantId, 'rookie-sv')
    expect(upgraded.leagueType).toBe('veteran')
    expect(upgraded.soccerverseUsername).toBe('rookie-sv')
    expect(upgraded.veteranSince).toBeDefined()
    expect(new Date(upgraded.veteranSince ?? '').getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('rejects an already-Veteran caller', async () => {
    const repo = new MemoryRegistrationRepository()
    const veteranId = await createActiveVeteran(repo, 'veteran@example.com', 'vet-token', 'already-vet')
    await expect(repo.upgradeRookieToVeteran(veteranId, 'something-else')).rejects.toMatchObject({
      name: 'RookieUpgradeError',
      reason: 'not_rookie',
    })
  })

  it('rejects a username already in use by another participant', async () => {
    const repo = new MemoryRegistrationRepository()
    await createActiveVeteran(repo, 'veteran@example.com', 'vet-token', 'taken-name')
    const { record } = await repo.createPending(
      {
        email: 'rookie@example.com',
        displayName: 'Rookie',
        primaryTeamCode: 'FRA',
        marketingOptIn: false,
      },
      'rookie-token',
    )
    await repo.verifyByPlainToken('rookie-token')

    await expect(repo.upgradeRookieToVeteran(record.participantId, 'taken-name')).rejects.toMatchObject({
      name: 'RookieUpgradeError',
      reason: 'username_taken',
    })
  })

  it('rejects an empty or oversized username', async () => {
    const { repo, participantId } = await createActiveRookie()
    await expect(repo.upgradeRookieToVeteran(participantId, '   ')).rejects.toMatchObject({
      name: 'RookieUpgradeError',
      reason: 'invalid_username',
    })
    await expect(repo.upgradeRookieToVeteran(participantId, 'x'.repeat(61))).rejects.toMatchObject({
      name: 'RookieUpgradeError',
      reason: 'invalid_username',
    })
  })

  it('throws RookieUpgradeError when participant does not exist', async () => {
    const repo = new MemoryRegistrationRepository()
    await expect(repo.upgradeRookieToVeteran('00000000-0000-4000-8000-000000000000', 'whatever')).rejects.toMatchObject({
      name: 'RookieUpgradeError',
      reason: 'not_found',
    })
  })
})

describe('RookieUpgradeError', () => {
  it('preserves the failure reason', () => {
    const error = new RookieUpgradeError('username_taken', 'duplicate')
    expect(error.reason).toBe('username_taken')
    expect(error.message).toBe('duplicate')
  })
})
