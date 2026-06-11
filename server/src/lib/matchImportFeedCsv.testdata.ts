// The real provider feed file for the opening fixture (Mexico vs South Africa, 2-0),
// verbatim — shared by the feed-parser unit test and the import→scoring→results
// integration test. Full matchday squads: 26 rows per team, of which 16 (MEX) + 15 (RSA)
// played. Includes the known edge shapes: empty goals/assists on played rows, explicit `0`
// cells on the two red-card rows, and no-show rows that are empty everywhere except the
// card counts. Test data only — excluded from the build via tsconfig (`*.testdata.ts`).
export const REAL_FEED_CSV = `fixture_id,kickoff,round,team,player,position,minutes,goals,assists,shots,shots_on_target,passes,key_passes,tackles,saves,yellow_cards,red_cards,rating
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
