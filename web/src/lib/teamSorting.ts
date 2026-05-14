import type { TeamSeed } from './types'

export function compareTeamsByNameDesc(left: TeamSeed, right: TeamSeed) {
  const nameDifference = right.nameEn.localeCompare(left.nameEn, 'en', { sensitivity: 'base' })
  if (nameDifference !== 0) {
    return nameDifference
  }

  return right.code.localeCompare(left.code, 'en', { sensitivity: 'base' })
}
