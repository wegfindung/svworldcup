import type { TeamSeed } from './types'

export function compareTeamsByNameAsc(left: TeamSeed, right: TeamSeed) {
  const nameDifference = left.nameEn.localeCompare(right.nameEn, 'en', { sensitivity: 'base' })
  if (nameDifference !== 0) {
    return nameDifference
  }

  return left.code.localeCompare(right.code, 'en', { sensitivity: 'base' })
}
