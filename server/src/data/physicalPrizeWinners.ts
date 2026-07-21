const physicalPrizeWinnerIds = new Set([
  'a2d003e0-7651-4783-adc2-2c2ad59716b7', // Miguel — Veteran 1
  '887f5c9c-dd38-4c50-a70b-3b0bb2f8542e', // UnAndaluz — Veteran 2
  '2b8736c4-2be0-4e31-ad21-7be569917809', // tokeneta — Veteran 3
  '187bc1d4-b2ae-4d4c-be58-0b91e7605ee5', // Perricola — Rookie 1
  'd5fbb3d0-fa9a-47a9-a030-f3452edec99a', // KieronLysons — Rookie 2
  'bb422968-c9ae-45ed-bae5-aa75acafecce', // Cirake23 — Rookie 3
])

export function isPhysicalPrizeWinner(participantId: string) {
  return physicalPrizeWinnerIds.has(participantId)
}
