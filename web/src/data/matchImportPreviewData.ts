import type { PendingMatchBatch, TeamPoolPlayer, TeamSeed } from '../lib/types'

// Static demo data for the frontend-only preview mode of the match import review screen.
// It never touches the backend — it cannot be confirmed, promoted or scored. Its purpose is
// to let the team see and restyle the review view before any real fixture is imported.
// Crafted to exercise every row state: resolved starter, resolved used-sub, unresolved row,
// and a batch with partial (staleness-voided) confirmations after an edit.

const previewPortrait = '/placeholders/player.svg'

export const previewHomeTeam: TeamSeed = {
  code: 'BRA',
  slug: 'brazil',
  nameEn: 'Brazil',
  groupKey: 'C',
}

export const previewAwayTeam: TeamSeed = {
  code: 'MAR',
  slug: 'morocco',
  nameEn: 'Morocco',
  groupKey: 'C',
}

function poolPlayer(
  teamCode: string,
  playerId: number,
  displayName: string,
  positionMain: 'GK' | 'DEF' | 'MID' | 'FWD',
  rating: number,
): TeamPoolPlayer {
  return {
    teamCode,
    playerId,
    displayName,
    nationalityCode: teamCode,
    rating,
    capCost: 0,
    positions: [positionMain],
    positionMain,
    positionClasses: [positionMain],
    imageUrl: previewPortrait,
  }
}

// Curated team pools — the D9 / D16 remap candidate set for each side.
export const previewPools: Record<string, TeamPoolPlayer[]> = {
  BRA: [
    poolPlayer('BRA', 7001, 'Vinicius Junior', 'FWD', 9),
    poolPlayer('BRA', 7002, 'Casemiro', 'MID', 8),
    poolPlayer('BRA', 7003, 'Endrick', 'FWD', 7),
    poolPlayer('BRA', 7004, 'Rodrygo', 'FWD', 8),
    poolPlayer('BRA', 7005, 'Marquinhos', 'DEF', 8),
    poolPlayer('BRA', 7006, 'Alisson', 'GK', 8),
  ],
  MAR: [
    poolPlayer('MAR', 8001, 'Achraf Hakimi', 'DEF', 8),
    poolPlayer('MAR', 8002, 'Youssef En-Nesyri', 'FWD', 7),
    poolPlayer('MAR', 8003, 'Hakim Ziyech', 'MID', 7),
    poolPlayer('MAR', 8004, 'Sofyan Amrabat', 'MID', 7),
    poolPlayer('MAR', 8005, 'Yassine Bounou', 'GK', 8),
  ],
}

export const previewBatch: PendingMatchBatch = {
  batchId: 'preview-batch',
  fixtureId: 'preview-fixture-bra-mar',
  sourceUrl: 'https://www.sofascore.com/example-brazil-morocco',
  homeGoals: 2,
  awayGoals: 0,
  dataVersion: 2,
  createdBy: 'importer@svworldcup.test',
  lastEditedBy: 'reviewer@svworldcup.test',
  createdAt: '2026-05-14T18:00:00.000Z',
  updatedAt: '2026-05-14T18:24:00.000Z',
  rows: [
    {
      rowId: 'preview-row-1',
      batchId: 'preview-batch',
      sourceName: 'Vinicius Junior',
      teamCode: 'BRA',
      playerId: 7001,
      lineupStatus: 'starter',
      minutes: 90,
      goals: 1,
      assists: 0,
      rating: 8.1,
      cleanSheetEligible: false,
    },
    {
      rowId: 'preview-row-2',
      batchId: 'preview-batch',
      sourceName: 'Casemiro',
      teamCode: 'BRA',
      playerId: 7002,
      lineupStatus: 'starter',
      minutes: 90,
      goals: 0,
      assists: 1,
      rating: 7.3,
      cleanSheetEligible: false,
    },
    {
      rowId: 'preview-row-3',
      batchId: 'preview-batch',
      sourceName: 'Endrick',
      teamCode: 'BRA',
      playerId: 7003,
      lineupStatus: 'substitute',
      minutes: 22,
      goals: 1,
      assists: 0,
      rating: 7.0,
      cleanSheetEligible: false,
    },
    {
      rowId: 'preview-row-4',
      batchId: 'preview-batch',
      sourceName: 'R. Silva',
      teamCode: 'BRA',
      playerId: null,
      lineupStatus: 'starter',
      minutes: 78,
      goals: 0,
      assists: 0,
      rating: 6.8,
      cleanSheetEligible: false,
    },
    {
      rowId: 'preview-row-5',
      batchId: 'preview-batch',
      sourceName: 'Achraf Hakimi',
      teamCode: 'MAR',
      playerId: 8001,
      lineupStatus: 'starter',
      minutes: 90,
      goals: 0,
      assists: 1,
      rating: 7.6,
      cleanSheetEligible: false,
    },
    {
      rowId: 'preview-row-6',
      batchId: 'preview-batch',
      sourceName: 'Youssef En-Nesyri',
      teamCode: 'MAR',
      playerId: 8002,
      lineupStatus: 'substitute',
      minutes: 18,
      goals: 0,
      assists: 0,
      rating: 6.5,
      cleanSheetEligible: false,
    },
  ],
  // Importer confirmed v1, a reviewer then edited a row (bumping to v2), so the v1
  // confirmation is staleness-voided. Only the v2 confirmation counts → 1 of 2.
  confirmations: [
    {
      confirmationId: 'preview-confirmation-1',
      batchId: 'preview-batch',
      adminEmail: 'importer@svworldcup.test',
      dataVersion: 1,
      createdAt: '2026-05-14T18:05:00.000Z',
    },
    {
      confirmationId: 'preview-confirmation-2',
      batchId: 'preview-batch',
      adminEmail: 'importer@svworldcup.test',
      dataVersion: 2,
      createdAt: '2026-05-14T18:30:00.000Z',
    },
  ],
}
