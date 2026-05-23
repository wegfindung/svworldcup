import { describe, expect, it } from 'vitest'
import {
  LeagueChangeError,
  MemoryRegistrationRepository,
  SoccerverseLinkError,
} from './registrationRepository.js'

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

describe('MemoryRegistrationRepository.linkSoccerverseAccount', () => {
  it('stores the browser locale during registration', async () => {
    const repo = new MemoryRegistrationRepository()
    const { record } = await repo.createPending(
      {
        email: 'locale@example.com',
        displayName: 'Locale Manager',
        primaryTeamCode: 'FRA',
        marketingOptIn: true,
        browserLocale: 'de',
      },
      'locale-token',
    )
    const verified = await repo.verifyByPlainToken('locale-token')

    expect(record.browserLocale).toBe('de')
    expect(verified?.browserLocale).toBe('de')
  })

  it('links a Soccerverse account without changing league_type', async () => {
    const { repo, participantId } = await createActiveRookie()
    const before = await repo.getByParticipantId(participantId)
    expect(before?.leagueType).toBe('rookie')
    expect(before?.soccerverseUsername).toBeUndefined()
    expect(before?.soccerverseLinkedAt).toBeUndefined()

    const linked = await repo.linkSoccerverseAccount(participantId, 'rookie-sv')
    expect(linked.leagueType).toBe('rookie') // unchanged — admin moves them later
    expect(linked.soccerverseUsername).toBe('rookie-sv')
    expect(linked.soccerverseLinkedAt).toBeDefined()
    expect(new Date(linked.soccerverseLinkedAt ?? '').getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('rejects a participant who already has a linked Soccerverse account', async () => {
    const repo = new MemoryRegistrationRepository()
    const veteranId = await createActiveVeteran(repo, 'veteran@example.com', 'vet-token', 'already-linked')
    await expect(repo.linkSoccerverseAccount(veteranId, 'something-else')).rejects.toMatchObject({
      name: 'SoccerverseLinkError',
      reason: 'already_linked',
    })
  })

  it('rejects a rookie who tries to link a username already in use', async () => {
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

    await expect(repo.linkSoccerverseAccount(record.participantId, 'taken-name')).rejects.toMatchObject({
      name: 'SoccerverseLinkError',
      reason: 'username_taken',
    })
  })

  it('treats Soccerverse username casing as distinct', async () => {
    const repo = new MemoryRegistrationRepository()
    await createActiveVeteran(repo, 'veteran@example.com', 'vet-token', 'CaseName')
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

    const linked = await repo.linkSoccerverseAccount(record.participantId, 'casename')
    expect(linked.soccerverseUsername).toBe('casename')
  })

  it('rejects empty or oversized usernames', async () => {
    const { repo, participantId } = await createActiveRookie()
    await expect(repo.linkSoccerverseAccount(participantId, '   ')).rejects.toMatchObject({
      name: 'SoccerverseLinkError',
      reason: 'invalid_username',
    })
    await expect(repo.linkSoccerverseAccount(participantId, 'x'.repeat(61))).rejects.toMatchObject({
      name: 'SoccerverseLinkError',
      reason: 'invalid_username',
    })
  })

  it('throws when participant does not exist', async () => {
    const repo = new MemoryRegistrationRepository()
    await expect(repo.linkSoccerverseAccount('00000000-0000-4000-8000-000000000000', 'whatever')).rejects.toMatchObject({
      name: 'SoccerverseLinkError',
      reason: 'not_found',
    })
  })
})

describe('MemoryRegistrationRepository.setParticipantLeague', () => {
  it('moves a linked Rookie into the Veteran league', async () => {
    const { repo, participantId } = await createActiveRookie()
    await repo.linkSoccerverseAccount(participantId, 'now-vet')

    const moved = await repo.setParticipantLeague(participantId, 'veteran')
    expect(moved.leagueType).toBe('veteran')
    expect(moved.soccerverseUsername).toBe('now-vet')
    expect(moved.soccerverseLinkedAt).toBeDefined()
  })

  it('refuses to move an unlinked Rookie into Veteran', async () => {
    const { repo, participantId } = await createActiveRookie()
    await expect(repo.setParticipantLeague(participantId, 'veteran')).rejects.toMatchObject({
      name: 'LeagueChangeError',
      reason: 'requires_soccerverse_username',
    })
  })

  it('lets admin move a Veteran back to Rookie', async () => {
    const repo = new MemoryRegistrationRepository()
    const veteranId = await createActiveVeteran(repo, 'veteran@example.com', 'vet-token', 'still-linked')
    const moved = await repo.setParticipantLeague(veteranId, 'rookie')
    expect(moved.leagueType).toBe('rookie')
    expect(moved.soccerverseUsername).toBe('still-linked')
  })

  it('is a no-op when target league equals current', async () => {
    const { repo, participantId } = await createActiveRookie()
    const same = await repo.setParticipantLeague(participantId, 'rookie')
    expect(same.leagueType).toBe('rookie')
  })

  it('rejects an unknown participant', async () => {
    const repo = new MemoryRegistrationRepository()
    await expect(repo.setParticipantLeague('00000000-0000-4000-8000-000000000000', 'veteran')).rejects.toMatchObject({
      name: 'LeagueChangeError',
      reason: 'not_found',
    })
  })

  it('rejects an invalid league value', async () => {
    const { repo, participantId } = await createActiveRookie()
    await expect(
      repo.setParticipantLeague(participantId, 'pro' as unknown as 'rookie'),
    ).rejects.toMatchObject({
      name: 'LeagueChangeError',
      reason: 'invalid_league',
    })
  })
})

describe('SoccerverseLinkError', () => {
  it('preserves the failure reason', () => {
    const error = new SoccerverseLinkError('username_taken', 'duplicate')
    expect(error.reason).toBe('username_taken')
    expect(error.message).toBe('duplicate')
  })
})

describe('LeagueChangeError', () => {
  it('preserves the failure reason', () => {
    const error = new LeagueChangeError('requires_soccerverse_username', 'needs link')
    expect(error.reason).toBe('requires_soccerverse_username')
    expect(error.message).toBe('needs link')
  })
})
