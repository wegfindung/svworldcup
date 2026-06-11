import { describe, expect, it } from 'vitest'
import { MatchImportValidationError } from './matchImportError.js'
import { assertMatchImportSemantics } from './matchImportJson.js'
import { isFeedCsv, parseMatchImportFeedCsv } from './matchImportFeedCsv.js'
import type { CsvMatchOptions } from './matchImportCsv.js'

const options: CsvMatchOptions = {
  homeTeamCode: 'MEX',
  awayTeamCode: 'RSA',
  homeTeamName: 'Mexico',
  awayTeamName: 'South Africa',
  homeGoals: 2,
  awayGoals: 0,
  sourceUrl: 'https://x.test/m',
}

// The real provider feed file for the opening fixture (Mexico vs South Africa), verbatim.
// Full matchday squads: 26 rows per team, of which 16 (MEX) + 15 (RSA) played. Includes the
// known edge shapes: empty goals/assists on played rows, explicit `0` cells on the two
// red-card rows, and no-show rows that are empty everywhere except the card counts.
const REAL_FEED = `fixture_id,kickoff,round,team,player,position,minutes,goals,assists,shots,shots_on_target,passes,key_passes,tackles,saves,yellow_cards,red_cards,rating
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,César Montes,D,92,,,,,65,,,,0,0,7.00
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Israel Reyes,D,92,,,1,,42,2,,,0,0,7.00
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Jesús Gallardo,D,92,,,1,,42,,,,0,0,6.60
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Johan Vásquez,D,92,,,,,81,,1,,0,0,6.90
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Raúl Rangel,G,92,,,,,30,,,2,0,0,7.20
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Roberto Alvarado,M,92,,1,,,35,2,4,,0,0,8.00
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Julián Quiñones,M,79,1,,4,2,33,2,,,0,0,8.50
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Erik Lira,M,76,,1,,,45,1,1,,0,0,7.30
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Raúl Jiménez,F,76,1,,3,2,19,2,1,,0,0,7.90
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Brian Gutiérrez,M,66,,,2,,23,3,,,1,0,6.90
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Álvaro Fidalgo,M,66,,,,,34,1,1,,0,0,7.20
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Gilberto Mora,M,26,,,,,14,,,,0,0,6.50
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Luis Chávez,M,26,,,,,27,,1,,0,0,6.60
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Armando González,F,16,,,,,1,,,,0,0,6.20
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Edson Álvarez,M,16,,,,,15,,1,,0,0,6.90
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Alexis Vega,F,13,,,,,9,,,,0,0,6.30
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Carlos Acevedo,G,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,César Huerta,M,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Guillermo Martínez,F,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Guillermo Ochoa,G,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Jorge Sánchez,D,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Luis Romo,M,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Mateo Chávez,D,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Obed Vargas,M,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Orbelín Pineda,M,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,Mexico,Santiago Giménez,F,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Ime Okon,D,92,,,,,47,,2,,0,0,6.20
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Khuliso Mudau,D,92,,,,,28,,4,,0,0,6.50
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Mbekezeli Mbokazi,D,92,,,1,1,28,1,2,,0,0,6.50
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Nkosinathi Sibisi,D,92,,,,,46,,,,1,0,6.00
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Ronwen Williams,G,92,,,,,38,,,2,0,0,6.60
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Teboho Mokoena,M,92,,,,,39,1,,,1,0,6.30
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Aubrey Modiba,D,77,,,1,1,15,,3,,0,0,5.90
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Iqraam Rayners,F,77,,,,,10,,,,0,0,6.30
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Jayden Adams,M,61,,,,,20,,,,0,0,6.70
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Lyle Foster,F,56,,,1,,5,,,,0,0,5.90
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Siphephelo Sithole,M,49,,0,,,19,,,,0,1,5.20
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Thalente Mbatha,M,36,,,,,6,,1,,0,0,6.50
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Themba Zwane,M,23,,0,,,7,,,,0,1,5.30
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Evidence Makgopa,F,15,,,,,3,,,,0,0,6.60
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Oswin Appollis,F,15,,,,,2,,1,,0,0,6.70
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Bradley Cross,D,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Kamogelo Sebelebele,M,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Khulumani Ndamane,D,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Olwethu Makhanya,D,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Relebohile Mofokeng,F,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Ricardo Goss,G,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Samukelo Kabini,D,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Sipho Chaine,G,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Thapelo Maseko,F,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Tholo Thabang Matuludi,D,,,,,,,,,,0,0,
1489369,2026-06-11T19:00:00+00:00,Group Stage - 1,South Africa,Tshepang Moremi,F,,,,,,,,,,0,0,`

describe('isFeedCsv', () => {
  it('detects the provider feed header', () => {
    expect(isFeedCsv(REAL_FEED)).toBe(true)
  })

  it('does not match the manual paste contract', () => {
    expect(isFeedCsv('name\tteam\tlineupStatus\tminutes\tgoals\tassists\trating\nX\tMexico\tstarter\t90\t0\t0\t7.0')).toBe(
      false,
    )
  })

  it('does not match non-tabular text', () => {
    expect(isFeedCsv('{"match": {}}')).toBe(false)
    expect(isFeedCsv('')).toBe(false)
  })
})

describe('parseMatchImportFeedCsv', () => {
  it('parses the real provider file: played rows only, match block from the form options', () => {
    const json = parseMatchImportFeedCsv(REAL_FEED, options)
    expect(json.match).toEqual({
      homeTeam: 'Mexico',
      awayTeam: 'South Africa',
      homeGoals: 2,
      awayGoals: 0,
      sourceUrl: 'https://x.test/m',
    })
    // 16 Mexico + 15 South Africa rows have minutes; the 21 no-show squad rows are dropped.
    expect(json.players).toHaveLength(31)
    expect(json.players.filter((player) => player.team === 'Mexico')).toHaveLength(16)
    expect(json.players.some((player) => player.name === 'Guillermo Ochoa')).toBe(false)
    // The whole parse satisfies the shared semantic checks (teams, duplicates, starter cap).
    expect(() => assertMatchImportSemantics(json)).not.toThrow()
  })

  it('reads empty goals/assists cells as zero and keeps real stat values', () => {
    const json = parseMatchImportFeedCsv(REAL_FEED, options)
    const montes = json.players.find((player) => player.name === 'César Montes')
    expect(montes).toMatchObject({ team: 'Mexico', minutes: 92, goals: 0, assists: 0, rating: 7 })
    const quinones = json.players.find((player) => player.name === 'Julián Quiñones')
    expect(quinones).toMatchObject({ minutes: 79, goals: 1, assists: 0, rating: 8.5 })
    // Red-card row with an explicit `0` assists cell.
    const sithole = json.players.find((player) => player.name === 'Siphephelo Sithole')
    expect(sithole).toMatchObject({ team: 'South Africa', minutes: 49, assists: 0, rating: 5.2 })
  })

  it('marks the eleven most-played rows per team as starters', () => {
    const json = parseMatchImportFeedCsv(REAL_FEED, options)
    for (const team of ['Mexico', 'South Africa']) {
      const starters = json.players.filter(
        (player) => player.team === team && player.lineupStatus === 'starter',
      )
      expect(starters).toHaveLength(11)
    }
    const byName = new Map(json.players.map((player) => [player.name, player.lineupStatus]))
    expect(byName.get('Julián Quiñones')).toBe('starter') // 79 minutes — 7th most for Mexico
    expect(byName.get('Gilberto Mora')).toBe('substitute') // 26 minutes — 12th most
    expect(byName.get('Siphephelo Sithole')).toBe('starter') // 49 minutes — 11th most for RSA
    expect(byName.get('Themba Zwane')).toBe('substitute') // 23 minutes — 13th most
  })

  it('rejects a row whose team is not one of the fixture teams', () => {
    const text = [
      'team,player,minutes,goals,assists,rating',
      'France,Someone,90,0,0,7.0',
    ].join('\n')
    expect(() => parseMatchImportFeedCsv(text, options)).toThrow(MatchImportValidationError)
  })

  it('rejects a header missing a required column', () => {
    const text = ['team,player,minutes,goals,assists', 'Mexico,X,90,0,0'].join('\n')
    expect(() => parseMatchImportFeedCsv(text, options)).toThrow(/missing required column/)
  })

  it('rejects a row with the wrong column count', () => {
    const text = ['team,player,minutes,goals,assists,rating', 'Mexico,X,90'].join('\n')
    expect(() => parseMatchImportFeedCsv(text, options)).toThrow(MatchImportValidationError)
  })

  it('rejects a file where no row has minutes', () => {
    const text = ['team,player,minutes,goals,assists,rating', 'Mexico,X,,,,'].join('\n')
    expect(() => parseMatchImportFeedCsv(text, options)).toThrow(/nothing to import/)
  })
})
