// Canonical prize-pool figures, mirrored from architecture/SOP_scoring_and_leagues.md "Prize Pool".
// Surfaced as real text on the landing page and /prizes (the image is decorative; this is the
// indexable source of truth). If these change, update the SOP and this constant together.

export interface PrizePlace {
  place: string
  amount: string
  // Physical extra (shirt / lanyard), shown as a small note. Locale-independent.
  note?: string
}

export interface PrizeLeague {
  key: 'veteran' | 'nations' | 'rookie'
  name: string
  sharePercent: number
  total: string
  places: PrizePlace[]
}

export const prizeTotal = '$5,000'
export const prizeTotalWithUnit = '$5,000 SVV'
export const prizeActivationParticipants = 1000

export const prizeLeagues: PrizeLeague[] = [
  {
    key: 'veteran',
    name: 'Veteran League',
    sharePercent: 50,
    total: '$2,500',
    places: [
      { place: '1st', amount: '$1,000', note: '+ shirt' },
      { place: '2nd', amount: '$500', note: '+ lanyard' },
      { place: '3rd', amount: '$300', note: '+ lanyard' },
      { place: '4th–10th', amount: '$100 each' },
    ],
  },
  {
    key: 'nations',
    name: 'Nations League',
    sharePercent: 30,
    total: '$1,500',
    places: [
      { place: 'Nation champion', amount: '$750' },
      { place: 'Runner-up', amount: '$450' },
      { place: 'Third place', amount: '$300' },
    ],
  },
  {
    key: 'rookie',
    name: 'Rookie League',
    sharePercent: 20,
    total: '$1,000',
    places: [
      { place: '1st', amount: '$350', note: '+ shirt' },
      { place: '2nd', amount: '$200', note: '+ lanyard' },
      { place: '3rd', amount: '$100', note: '+ lanyard' },
      { place: '4th–10th', amount: '$50 each' },
    ],
  },
]
