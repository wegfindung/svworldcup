export interface GroupStageMatch {
  group: string
  home: string
  away: string
  time: string
}

export interface GroupStageMatchDay {
  day: string
  matches: GroupStageMatch[]
}

export const groupStageMatchPlan: GroupStageMatchDay[] = [
  {
    day: 'THURSDAY, JUNE 11',
    matches: [{ group: 'A', home: 'Mexico', away: 'South Africa', time: '8:00pm' }],
  },
  {
    day: 'FRIDAY, JUNE 12',
    matches: [
      { group: 'A', home: 'South Korea', away: 'Czechia', time: '3:00am' },
      { group: 'B', home: 'Canada', away: 'Bosnia and Herzegovina', time: '8:00pm' },
    ],
  },
  {
    day: 'SATURDAY, JUNE 13',
    matches: [
      { group: 'D', home: 'USA', away: 'Paraguay', time: '2:00am' },
      { group: 'B', home: 'Qatar', away: 'Switzerland', time: '8:00pm' },
      { group: 'C', home: 'Brazil', away: 'Morocco', time: '11:00pm' },
    ],
  },
  {
    day: 'SUNDAY, JUNE 14',
    matches: [
      { group: 'C', home: 'Haiti', away: 'Scotland', time: '2:00am' },
      { group: 'D', home: 'Australia', away: 'Turkiye', time: '5:00am' },
      { group: 'E', home: 'Germany', away: 'Curacao', time: '6:00pm' },
      { group: 'F', home: 'Netherlands', away: 'Japan', time: '9:00pm' },
    ],
  },
  {
    day: 'MONDAY, JUNE 15',
    matches: [
      { group: 'E', home: 'Ivory Coast', away: 'Ecuador', time: '12:00am' },
      { group: 'F', home: 'Sweden', away: 'Tunisia', time: '3:00am' },
      { group: 'H', home: 'Spain', away: 'Cape Verde', time: '5:00pm' },
      { group: 'G', home: 'Belgium', away: 'Egypt', time: '8:00pm' },
      { group: 'H', home: 'Saudi Arabia', away: 'Uruguay', time: '11:00pm' },
    ],
  },
  {
    day: 'TUESDAY, JUNE 16',
    matches: [
      { group: 'G', home: 'Iran', away: 'New Zealand', time: '2:00am' },
      { group: 'I', home: 'France', away: 'Senegal', time: '8:00pm' },
      { group: 'I', home: 'Iraq', away: 'Norway', time: '11:00pm' },
    ],
  },
  {
    day: 'WEDNESDAY, JUNE 17',
    matches: [
      { group: 'J', home: 'Argentina', away: 'Algeria', time: '2:00am' },
      { group: 'J', home: 'Austria', away: 'Jordan', time: '5:00am' },
      { group: 'K', home: 'Portugal', away: 'DR Congo', time: '6:00pm' },
      { group: 'L', home: 'England', away: 'Croatia', time: '9:00pm' },
    ],
  },
  {
    day: 'THURSDAY, JUNE 18',
    matches: [
      { group: 'L', home: 'Ghana', away: 'Panama', time: '12:00am' },
      { group: 'K', home: 'Uzbekistan', away: 'Colombia', time: '3:00am' },
      { group: 'A', home: 'Czechia', away: 'South Africa', time: '5:00pm' },
      { group: 'B', home: 'Switzerland', away: 'Bosnia and Herzegovina', time: '8:00pm' },
      { group: 'B', home: 'Canada', away: 'Qatar', time: '11:00pm' },
    ],
  },
  {
    day: 'FRIDAY, JUNE 19',
    matches: [
      { group: 'A', home: 'Mexico', away: 'South Korea', time: '2:00am' },
      { group: 'D', home: 'USA', away: 'Australia', time: '8:00pm' },
      { group: 'C', home: 'Scotland', away: 'Morocco', time: '11:00pm' },
    ],
  },
  {
    day: 'SATURDAY, JUNE 20',
    matches: [
      { group: 'C', home: 'Brazil', away: 'Haiti', time: '1:30am' },
      { group: 'D', home: 'Turkiye', away: 'Paraguay', time: '4:00am' },
      { group: 'F', home: 'Netherlands', away: 'Sweden', time: '6:00pm' },
      { group: 'E', home: 'Germany', away: 'Ivory Coast', time: '9:00pm' },
    ],
  },
  {
    day: 'SUNDAY, JUNE 21',
    matches: [
      { group: 'E', home: 'Ecuador', away: 'Curacao', time: '1:00am' },
      { group: 'F', home: 'Tunisia', away: 'Japan', time: '5:00am' },
      { group: 'H', home: 'Spain', away: 'Saudi Arabia', time: '5:00pm' },
      { group: 'G', home: 'Belgium', away: 'Iran', time: '8:00pm' },
      { group: 'H', home: 'Uruguay', away: 'Cape Verde', time: '11:00pm' },
    ],
  },
  {
    day: 'MONDAY, JUNE 22',
    matches: [
      { group: 'G', home: 'New Zealand', away: 'Egypt', time: '2:00am' },
      { group: 'J', home: 'Argentina', away: 'Austria', time: '6:00pm' },
      { group: 'I', home: 'France', away: 'Iraq', time: '10:00pm' },
    ],
  },
  {
    day: 'TUESDAY, JUNE 23',
    matches: [
      { group: 'I', home: 'Norway', away: 'Senegal', time: '1:00am' },
      { group: 'J', home: 'Jordan', away: 'Algeria', time: '4:00am' },
      { group: 'K', home: 'Portugal', away: 'Uzbekistan', time: '6:00pm' },
      { group: 'L', home: 'England', away: 'Ghana', time: '9:00pm' },
    ],
  },
  {
    day: 'WEDNESDAY, JUNE 24',
    matches: [
      { group: 'L', home: 'Panama', away: 'Croatia', time: '12:00am' },
      { group: 'K', home: 'Colombia', away: 'DR Congo', time: '3:00am' },
      { group: 'B', home: 'Switzerland', away: 'Canada', time: '8:00pm' },
      { group: 'B', home: 'Bosnia and Herzegovina', away: 'Qatar', time: '8:00pm' },
      { group: 'C', home: 'Morocco', away: 'Haiti', time: '11:00pm' },
      { group: 'C', home: 'Scotland', away: 'Brazil', time: '11:00pm' },
    ],
  },
  {
    day: 'THURSDAY, JUNE 25',
    matches: [
      { group: 'A', home: 'South Africa', away: 'South Korea', time: '2:00am' },
      { group: 'A', home: 'Czechia', away: 'Mexico', time: '2:00am' },
      { group: 'E', home: 'Curacao', away: 'Ivory Coast', time: '9:00pm' },
      { group: 'E', home: 'Ecuador', away: 'Germany', time: '9:00pm' },
    ],
  },
  {
    day: 'FRIDAY, JUNE 26',
    matches: [
      { group: 'F', home: 'Japan', away: 'Sweden', time: '12:00am' },
      { group: 'F', home: 'Tunisia', away: 'Netherlands', time: '12:00am' },
      { group: 'D', home: 'Paraguay', away: 'Australia', time: '3:00am' },
      { group: 'D', home: 'Turkiye', away: 'USA', time: '3:00am' },
      { group: 'I', home: 'Norway', away: 'France', time: '8:00pm' },
      { group: 'I', home: 'Senegal', away: 'Iraq', time: '8:00pm' },
    ],
  },
  {
    day: 'SATURDAY, JUNE 27',
    matches: [
      { group: 'H', home: 'Cape Verde', away: 'Saudi Arabia', time: '1:00am' },
      { group: 'H', home: 'Uruguay', away: 'Spain', time: '1:00am' },
      { group: 'G', home: 'Egypt', away: 'Iran', time: '4:00am' },
      { group: 'G', home: 'New Zealand', away: 'Belgium', time: '4:00am' },
      { group: 'L', home: 'Croatia', away: 'Ghana', time: '10:00pm' },
      { group: 'L', home: 'Panama', away: 'England', time: '10:00pm' },
    ],
  },
  {
    day: 'SUNDAY, JUNE 28',
    matches: [
      { group: 'K', home: 'Colombia', away: 'Portugal', time: '12:30am' },
      { group: 'K', home: 'DR Congo', away: 'Uzbekistan', time: '12:30am' },
      { group: 'J', home: 'Algeria', away: 'Austria', time: '3:00am' },
      { group: 'J', home: 'Jordan', away: 'Argentina', time: '3:00am' },
    ],
  },
]
