# World Cup squad mapping gaps

Audit date: 2026-05-25

Purpose: keep track of official 2026 World Cup squad players that are not yet
cleanly represented in `server/src/data/initialTeamSelections.ts`.

Sources checked:

- Official roster tracker: https://www.si.com/soccer/2026-world-cup-rosters-full-list-all-official-squads
- Local seed: `server/src/data/initialTeamSelections.ts`
- Soccerverse community datapack: `https://elrincondeldt.com/sv/rincon_v2.json`
- Soccerverse player API spot checks: `https://services.soccerverse.com/api/players/detailed`

Important: do not add a player to the seed only from name similarity. Some names
match multiple Soccerverse IDs or match a player with the wrong nationality.
Resolve the Soccerverse `playerId` first, then update the seed/import JSON.

## Current seeded teams

These are the teams currently present in `initialTeamSelections.ts`.

| Team | Local count | Official count | Missing or unresolved players |
| --- | ---: | ---: | --- |
| BEL | 25 | 26 | Diego Moreira |
| BIH | 26 | 26 | None. `Kerim-Sam Alajbegovic` appears to be the Soccerverse/community-pack name for official `Kerim Alajbegovic`. |
| CIV | 25 | 26 | Emmanuel Agbadou |
| FRA | 24 | 26 | Ousmane Dembele, Rayan Cherki |
| GER | 24 | 26 | Manuel Neuer, Jamal Musiala, Nadiem Amiri, Aleksandar Pavlovic, Felix Nmecha, Jamie Leweling, Maximilian Beier |
| HAI | 22 | 26 | Duke Lacroix, Keeto Thermoncy, Leverton Pierre, Jean-Ricner Bellegarde |
| JPN | 26 | 26 | None found. |
| NZL | 24 | 26 | Tommy Smith, Kosta Barbarouses |
| SWE | 23 | 26 | Kristoffer Nordfeldt, Benjamin Nygren, Gustaf Nilsson |
| TUN | 21 | 26 | Sabri Ben Hessen, Mohamed Amine Ben Hamida, Mortadha Ben Ouanes, Elias Achouri, Rayan Elloumi |

## Notes from Soccerverse lookup

Likely direct matches found:

- GER Manuel Neuer -> `497`
- GER Jamal Musiala -> `181812`
- GER Nadiem Amiri -> `714`
- GER Felix Nmecha -> `637`
- GER Jamie Leweling -> `128533`
- GER Maximilian Beier -> `158644`
- HAI Leverton Pierre -> `20538`
- HAI Jean-Ricner Bellegarde -> `20665`
- NZL Kosta Barbarouses -> `6865`

Ambiguous or unsafe matches:

- BEL Diego Moreira: community datapack has multiple `Diego Moreira` entries, and
  spot checks returned non-Belgian nationalities for the obvious IDs.
- GER Aleksandar Pavlovic: community datapack has at least two matching IDs;
  spot check with `country_id=DEU` returned `328033`.
- FRA Ousmane Dembele: no exact community-pack hit from the simple name search.
- FRA Rayan Cherki: community-pack hit was `Mathis Cherki`, not safe enough.
- CIV Emmanuel Agbadou: no exact safe hit found.
- HAI Duke Lacroix, Keeto Thermoncy: no exact safe hit found.
- NZL Tommy Smith: too many `Smith` hits; needs nationality/API resolution.
- SWE Kristoffer Nordfeldt, Benjamin Nygren, Gustaf Nilsson: no safe exact hit
  from simple search.
- TUN missing players: simple search only produced partial surname hits or no
  clear match; needs manual/API resolution.

## Follow-up process

1. Resolve every missing player to a confirmed Soccerverse `playerId`.
2. For duplicate names, verify `country_id` through the Soccerverse API.
3. Build a reviewed JSON compatible with `tools/import-world-cup-squads.ts`.
4. Run the importer in `--dry-run` first and check all team counts.
5. Only then update production data or committed seed data.
