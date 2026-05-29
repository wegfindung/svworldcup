# Grand Tournament squad mapping gaps

Audit date: 2026-05-27

Purpose: keep track of official 2026 Grand Tournament squad players that are not yet
cleanly represented in `server/src/data/initialTeamSelections.ts`.

Primary source checked:

- FIFA squad announcements hub:
  https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/all-world-cup-squad-announcements
- FIFA article API spot checks:
  `https://cxm-api.fifa.com/fifaplusweb/api/pages/...` and
  `https://cxm-api.fifa.com/fifaplusweb/api/sections/article/...`

Secondary cross-checks used only when a FIFA article was not available or when
we needed an independent spelling check:

- Official roster tracker: https://www.si.com/soccer/2026-world-cup-rosters-full-list-all-official-squads
- NBC confirmed roster tracker, updated 2026-05-27:
  https://www.nbcsports.com/soccer/news/2026-world-cup-squads-confirmed-rosters-for-all-48-teams
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
| AUT | 26 | 26 | None found. |
| BEL | 25 | 26 | Diego Moreira |
| BIH | 26 | 26 | None. `Kerim-Sam Alajbegovic` appears to be the Soccerverse/community-pack name for official `Kerim Alajbegovic`. |
| CIV | 25 | 26 | Emmanuel Agbadou |
| FRA | 26 | 26 | None found. |
| GER | 26 | 26 | None found. |
| HAI | 24 | 26 | Duke Lacroix, Keeto Thermoncy |
| JPN | 26 | 26 | None found. |
| NED | 26 | 26 | None found. Rechecked against FIFA's 2026-05-27 Netherlands article; `Jan van Hecke` is the Soccerverse/community-pack display name for official `Jan Paul van Hecke`. |
| NZL | 25 | 26 | Tommy Smith |
| SUI | 26 | 26 | None found. |
| SWE | 23 | 26 | Kristoffer Nordfeldt, Benjamin Nygren, Gustaf Nilsson |
| TUN | 21 | 26 | Sabri Ben Hassan, Mohamed Amine Ben Hamida, Mortadha Ben Ouanes, Elias Achouri, Rayan Elloumi |

## FIFA source URLs for current seeded teams

These FIFA pages were checked on 2026-05-27 and should be treated as the source
of truth until FIFA publishes the final 26-player lists on 2026-06-02.

| Team | FIFA source |
| --- | --- |
| AUT | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/austria-ralf-rangnick-world-cup-squad |
| BEL | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/belgium-squad-garcia-lukaku-named |
| BIH | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/bosnia-and-herzegovina-sergej-barbarez-names-squad |
| CIV | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/cote-divoire-squad-announcement-emerse-fae |
| FRA | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/france-world-cup-squad-named |
| GER | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/germany-squad-neuer-nagelsmann-named |
| HAI | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/haiti-squad-announcement-sebastien-migne |
| JPN | https://www.fifa.com/en/news/articles/japan-squad-announcement |
| NED | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/netherlands-ronald-koeman-squad-announced |
| NZL | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/new-zealand-squad-named |
| SUI | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/switzerland-squad-announcement-murat-yakin |
| SWE | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/sweden-squad-announcement-world-cup-graham-potter |
| TUN | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/tunisia-squad-named-sabri-lamouchi |

## Confirmed official squads with no local seed

These countries now have a confirmed public 26-player roster in the 2026-05-27
NBC tracker and/or FIFA squad announcement articles, but they are not present in
`initialTeamSelections.ts` at all.

| Team | Status | Notes |
| --- | --- | --- |
| BRA | No local seed | Confirmed roster published. |
| COL | No local seed | Confirmed roster published. |
| COD | No local seed | Confirmed roster published by FIFA/NBC. |
| CPV | No local seed | Confirmed roster published. |
| CUW | No local seed | Confirmed roster published by FIFA/NBC. |
| ENG | No local seed | Confirmed roster published. |
| KOR | No local seed | Confirmed roster published by FIFA/NBC. |
| MAR | No local seed | Confirmed roster published by FIFA/NBC on 2026-05-26. |
| NOR | No local seed | Confirmed roster published by FIFA/NBC. |
| SCO | No local seed | Confirmed roster published. |
| SEN | No local seed | Confirmed roster published. |
| ESP | No local seed | Confirmed roster published. |
| USA | No local seed | Confirmed roster published by NBC. |

This means the next import pass should not only fill missing players for the
existing seeded teams; it should also build complete Soccerverse mappings for
these newly confirmed, currently unseeded countries.

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
- NED Jan Paul van Hecke -> `38695`
- NED Tijjani Reijnders -> `36902`
- NED Brian Brobbey -> `38750`
- SUI Yvon Mvogo -> `1142`
- SUI Djibril Sow -> `957`
- SUI Denis Zakaria -> `2810`
- SUI Zeki Amdouni -> `123469`
- SUI Ruben Vargas -> `48471`

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

Implementation note:

- `bootstrapInitialTeamPools` now retries missing curated IDs without a
  `country_id` filter after the normal country-filtered Soccerverse fetch. This
  covers official eligibility changes that lag in Soccerverse nationality data,
  such as Carney Chukwuemeka appearing in Austria's official squad while still
  carrying a non-AUT Soccerverse `country_id`.

## Follow-up process

1. Resolve every missing player to a confirmed Soccerverse `playerId`.
2. For duplicate names, verify `country_id` through the Soccerverse API.
3. Build a reviewed JSON compatible with `tools/import-world-cup-squads.ts`.
4. Run the importer in `--dry-run` first and check all team counts.
5. Only then update production data or committed seed data.
