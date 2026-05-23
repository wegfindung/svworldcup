import type { EmailCampaignInput, SupportedLocale } from '../domain/types.js'

const veteranOnboardingSubject: Record<SupportedLocale, string> = {
  en: 'Soccerverse World Cup Event - How it works',
  es: 'Soccerverse World Cup Event - Como funciona',
  de: 'Soccerverse World Cup Event - So funktioniert es',
  fr: 'Soccerverse World Cup Event - Comment ca marche',
  pt: 'Soccerverse World Cup Event - Como funciona',
  ru: 'Soccerverse World Cup Event - Kak eto rabotaet',
  zh: 'Soccerverse World Cup Event - How it works',
}

const veteranOnboardingBody: Record<SupportedLocale, string> = {
  en: `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">The most important tips and rules for your squad.</div>
    <p style="margin:0 0 24px;text-align:center;"><img src="{{logo_url}}" alt="Soccerverse World Cup" width="128" style="display:inline-block;width:128px;max-width:45%;height:auto;"></p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#f2efe7;">Onboarding</h1>
    <p style="margin:0 0 16px;color:#c6d3ce;">Hi {{first_name}},</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Cool that you are in.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">To get started, here are the most important notes:</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Your points come from your players' performances in the real matches.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">As soon as a match has been entered, the relevant actions are evaluated and credited to your squad.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">After that, points and rankings update.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">You set your squad once. From the start of the event, the opening match, no more changes are possible.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Your first eleven receive full points. If someone does not play, that is bad luck.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Your substitutes receive 50% of their scored points.</p>
    <p style="margin:0 0 18px;color:#c6d3ce;"><strong style="color:#f2efe7;">Important:</strong> Only one squad is allowed per person. Multi-accounts lead to disqualification. This keeps the competition fair for everyone.</p>
    <h2 style="margin:24px 0 12px;font-size:18px;color:#f2efe7;">How can you earn bonuses as a Veteran?</h2>
    <ol style="margin:0 0 18px 20px;padding:0;color:#c6d3ce;">
      <li style="margin:0 0 10px;">Build your squad.</li>
      <li style="margin:0 0 10px;">Buy Influence for the players in your squad in the main game: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a></li>
      <li style="margin:0 0 10px;">100 Influence equals the maximum bonus of 10% on your player's points.</li>
      <li style="margin:0;">During scoring, our technical interface calculates your points including bonuses.</li>
    </ol>
    <p style="margin:0 0 22px;color:#c6d3ce;">Good luck for the first matchday.</p>
    <p style="margin:0 0 24px;"><a href="{{builder_url}}" style="display:inline-block;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;text-decoration:none;padding:14px 22px;">Check squad</a></p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Your Community Event Team</p>
    <p style="margin:0;color:#c6d3ce;">PS: And here is what you can win: <a href="{{prizes_url}}" style="color:#22bd93;">Prizes overview</a></p>
  `,
  es: `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Los consejos y reglas mas importantes para tu plantilla.</div>
    <p style="margin:0 0 24px;text-align:center;"><img src="{{logo_url}}" alt="Soccerverse World Cup" width="128" style="display:inline-block;width:128px;max-width:45%;height:auto;"></p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#f2efe7;">Onboarding</h1>
    <p style="margin:0 0 16px;color:#c6d3ce;">Hola {{first_name}},</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Nos alegra que participes.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Para empezar, estos son los puntos mas importantes:</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Tus puntos se generan por el rendimiento de tus jugadores en los partidos reales.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Cuando se registra un partido, se evaluan las acciones relevantes y se acreditan a tu plantilla.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Despues se actualizan los puntos y el ranking.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Fijas tu plantilla una sola vez. Desde el inicio del evento, el partido inaugural, ya no se pueden hacer cambios.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Tu once inicial recibe todos los puntos. Si alguien no juega, es mala suerte.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Tus suplentes reciben el 50% de los puntos conseguidos.</p>
    <p style="margin:0 0 18px;color:#c6d3ce;"><strong style="color:#f2efe7;">Importante:</strong> Solo se permite una plantilla por persona. Los multi-accounts llevan a la descalificacion. Asi mantenemos la competicion justa para todos.</p>
    <h2 style="margin:24px 0 12px;font-size:18px;color:#f2efe7;">Como puedes conseguir bonos como Veteran?</h2>
    <ol style="margin:0 0 18px 20px;padding:0;color:#c6d3ce;">
      <li style="margin:0 0 10px;">Crea tu plantilla.</li>
      <li style="margin:0 0 10px;">Compra Influence de los jugadores de tu plantilla en el juego principal: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a></li>
      <li style="margin:0 0 10px;">100 Influence equivalen al bono maximo del 10% sobre los puntos de tu jugador.</li>
      <li style="margin:0;">En la evaluacion, nuestra interfaz tecnica calcula tus puntos con los bonos.</li>
    </ol>
    <p style="margin:0 0 22px;color:#c6d3ce;">Mucha suerte para la primera jornada.</p>
    <p style="margin:0 0 24px;"><a href="{{builder_url}}" style="display:inline-block;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;text-decoration:none;padding:14px 22px;">Revisar plantilla</a></p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Tu Community Event Team</p>
    <p style="margin:0;color:#c6d3ce;">PS: Y esto es lo que puedes ganar: <a href="{{prizes_url}}" style="color:#22bd93;">Ver premios</a></p>
  `,
  de: `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Die wichtigsten Tipps und Regeln für deinen Kader.</div>
    <p style="margin:0 0 24px;text-align:center;"><img src="{{logo_url}}" alt="Soccerverse World Cup" width="128" style="display:inline-block;width:128px;max-width:45%;height:auto;"></p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#f2efe7;">Onboarding</h1>
    <p style="margin:0 0 16px;color:#c6d3ce;">Hallo {{first_name}},</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">cool, dass Du dabei bist.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Zum Start hier die wichtigsten Hinweise:</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Deine Punkte entstehen aus den Leistungen deiner Spieler in den echten Spielen.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Sobald ein Spiel erfasst wurde, werden die relevanten Aktionen ausgewertet und deinem Kader gutgeschrieben.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Danach aktualisieren sich Punkte und Ranking.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Du legst einmal Deinen Kader fest. Ab Anstoß des Events, dem Eröffnungsspiel, sind keine Änderungen mehr möglich.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Deine erste Elf erhält die vollen Punkte. Wenn jemand nicht spielt, hast Du Pech gehabt.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Deine Ersatzspieler erhalten 50% der erzielten Punkte.</p>
    <p style="margin:0 0 18px;color:#c6d3ce;"><strong style="color:#f2efe7;">Wichtig:</strong> Pro Person ist nur ein Kader erlaubt. Multi-Accounts führen zur Disqualifikation. So bleibt der Wettbewerb fair für alle.</p>
    <h2 style="margin:24px 0 12px;font-size:18px;color:#f2efe7;">Wie kannst Du als Veteran Boni erzielen?</h2>
    <ol style="margin:0 0 18px 20px;padding:0;color:#c6d3ce;">
      <li style="margin:0 0 10px;">Stelle Deinen Kader zusammen.</li>
      <li style="margin:0 0 10px;">Kaufe im Hauptspiel Einfluss/Influence von den Spielern Deines Kaders: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a></li>
      <li style="margin:0 0 10px;">100 Influence entsprechen dem maximalen Bonus von 10% auf die Punktzahl Deines Spielers.</li>
      <li style="margin:0;">Bei der Auswertung ermittelt unsere technische Schnittstelle Deine Punktzahl mit Boni.</li>
    </ol>
    <p style="margin:0 0 22px;color:#c6d3ce;">Viel Erfolg für den ersten Spieltag.</p>
    <p style="margin:0 0 24px;"><a href="{{builder_url}}" style="display:inline-block;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;text-decoration:none;padding:14px 22px;">Kader prüfen</a></p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Dein Community Event Team</p>
    <p style="margin:0;color:#c6d3ce;">PS: Und das gibt es zu gewinnen: <a href="{{prizes_url}}" style="color:#22bd93;">Preisübersicht</a></p>
  `,
  fr: `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Les conseils et regles les plus importants pour ton effectif.</div>
    <p style="margin:0 0 24px;text-align:center;"><img src="{{logo_url}}" alt="Soccerverse World Cup" width="128" style="display:inline-block;width:128px;max-width:45%;height:auto;"></p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#f2efe7;">Onboarding</h1>
    <p style="margin:0 0 16px;color:#c6d3ce;">Bonjour {{first_name}},</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">content que tu participes.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Pour commencer, voici les points les plus importants:</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Tes points viennent des performances de tes joueurs dans les vrais matchs.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Des qu'un match est saisi, les actions pertinentes sont evaluees et creditees a ton effectif.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Ensuite, les points et le classement sont mis a jour.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Tu fixes ton effectif une seule fois. A partir du debut de l'event, le match d'ouverture, aucun changement n'est possible.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Ton onze de depart recoit tous les points. Si quelqu'un ne joue pas, c'est tant pis.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Tes remplacants recoivent 50% des points marques.</p>
    <p style="margin:0 0 18px;color:#c6d3ce;"><strong style="color:#f2efe7;">Important:</strong> Une seule equipe est autorisee par personne. Les multi-accounts entrainent la disqualification. Le concours reste ainsi juste pour tous.</p>
    <h2 style="margin:24px 0 12px;font-size:18px;color:#f2efe7;">Comment obtenir des bonus en tant que Veteran?</h2>
    <ol style="margin:0 0 18px 20px;padding:0;color:#c6d3ce;">
      <li style="margin:0 0 10px;">Compose ton effectif.</li>
      <li style="margin:0 0 10px;">Achete de l'Influence pour les joueurs de ton effectif dans le jeu principal: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a></li>
      <li style="margin:0 0 10px;">100 Influence correspondent au bonus maximum de 10% sur les points de ton joueur.</li>
      <li style="margin:0;">Lors du calcul, notre interface technique determine tes points avec les bonus.</li>
    </ol>
    <p style="margin:0 0 22px;color:#c6d3ce;">Bonne chance pour la premiere journee.</p>
    <p style="margin:0 0 24px;"><a href="{{builder_url}}" style="display:inline-block;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;text-decoration:none;padding:14px 22px;">Verifier l'effectif</a></p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Ton Community Event Team</p>
    <p style="margin:0;color:#c6d3ce;">PS: Voici ce qu'il y a a gagner: <a href="{{prizes_url}}" style="color:#22bd93;">Voir les prix</a></p>
  `,
  pt: `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">As dicas e regras mais importantes para o teu plantel.</div>
    <p style="margin:0 0 24px;text-align:center;"><img src="{{logo_url}}" alt="Soccerverse World Cup" width="128" style="display:inline-block;width:128px;max-width:45%;height:auto;"></p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#f2efe7;">Onboarding</h1>
    <p style="margin:0 0 16px;color:#c6d3ce;">Ola {{first_name}},</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">que bom que estas dentro.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Para comecar, aqui estao os pontos mais importantes:</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Os teus pontos resultam das performances dos teus jogadores nos jogos reais.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Assim que um jogo e registado, as acoes relevantes sao avaliadas e creditadas ao teu plantel.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Depois disso, pontos e ranking sao atualizados.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Definis o teu plantel uma unica vez. A partir do inicio do evento, o jogo de abertura, nao sao possiveis alteracoes.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">O teu onze inicial recebe todos os pontos. Se alguem nao jogar, e azar.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Os teus suplentes recebem 50% dos pontos obtidos.</p>
    <p style="margin:0 0 18px;color:#c6d3ce;"><strong style="color:#f2efe7;">Importante:</strong> E permitido apenas um plantel por pessoa. Multi-accounts resultam em desqualificacao. Assim a competicao fica justa para todos.</p>
    <h2 style="margin:24px 0 12px;font-size:18px;color:#f2efe7;">Como podes ganhar bonus como Veteran?</h2>
    <ol style="margin:0 0 18px 20px;padding:0;color:#c6d3ce;">
      <li style="margin:0 0 10px;">Monta o teu plantel.</li>
      <li style="margin:0 0 10px;">Compra Influence dos jogadores do teu plantel no jogo principal: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a></li>
      <li style="margin:0 0 10px;">100 Influence correspondem ao bonus maximo de 10% nos pontos do teu jogador.</li>
      <li style="margin:0;">Na avaliacao, a nossa interface tecnica calcula os teus pontos com os bonus.</li>
    </ol>
    <p style="margin:0 0 22px;color:#c6d3ce;">Boa sorte para a primeira jornada.</p>
    <p style="margin:0 0 24px;"><a href="{{builder_url}}" style="display:inline-block;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;text-decoration:none;padding:14px 22px;">Ver plantel</a></p>
    <p style="margin:0 0 16px;color:#c6d3ce;">A tua Community Event Team</p>
    <p style="margin:0;color:#c6d3ce;">PS: E isto que podes ganhar: <a href="{{prizes_url}}" style="color:#22bd93;">Ver premios</a></p>
  `,
  ru: `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Samye vazhnye sovety i pravila dlya tvoego sostava.</div>
    <p style="margin:0 0 24px;text-align:center;"><img src="{{logo_url}}" alt="Soccerverse World Cup" width="128" style="display:inline-block;width:128px;max-width:45%;height:auto;"></p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#f2efe7;">Onboarding</h1>
    <p style="margin:0 0 16px;color:#c6d3ce;">Privet, {{first_name}},</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">otlichno, chto ty uchastvuesh.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Dlya starta vot samoe vazhnoe:</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Tvoi ochki zavisyat ot vystupleniy tvoih igrokov v realnyh matchah.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Kogda match vnesen, vazhnye deystviya otsenivayutsya i zachislyayutsya tvoemu sostavu.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Posle etogo obnovlyayutsya ochki i reyting.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Sostav vybiraetsya odin raz. S nachala eventa, otkryvayuschego matcha, izmeneniya bolshe nevozmozhny.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Tvoi startovye 11 poluchayut polnye ochki. Esli kto-to ne igraet, eto ne povezet.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Zapasnye poluchayut 50% nabrannyh ochkov.</p>
    <p style="margin:0 0 18px;color:#c6d3ce;"><strong style="color:#f2efe7;">Vazhno:</strong> Na cheloveka razreshen tolko odin sostav. Multi-accounts vedut k diskvalifikatsii. Tak sorevnovanie ostaetsya chestnym dlya vseh.</p>
    <h2 style="margin:24px 0 12px;font-size:18px;color:#f2efe7;">Kak Veteran mozhet poluchit bonusy?</h2>
    <ol style="margin:0 0 18px 20px;padding:0;color:#c6d3ce;">
      <li style="margin:0 0 10px;">Sobery svoj sostav.</li>
      <li style="margin:0 0 10px;">Kupi Influence igrokov tvoego sostava v osnovnoy igre: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a></li>
      <li style="margin:0 0 10px;">100 Influence dayut maksimalnyy bonus 10% k ochkam igroka.</li>
      <li style="margin:0;">Pri podschete nasha tekhnicheskaya integratsiya schitaet tvoi ochki s bonusami.</li>
    </ol>
    <p style="margin:0 0 22px;color:#c6d3ce;">Udachi v pervyy matchday.</p>
    <p style="margin:0 0 24px;"><a href="{{builder_url}}" style="display:inline-block;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;text-decoration:none;padding:14px 22px;">Proverit sostav</a></p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Tvoya Community Event Team</p>
    <p style="margin:0;color:#c6d3ce;">PS: A vot chto mozhno vyigrat: <a href="{{prizes_url}}" style="color:#22bd93;">Obzor prizov</a></p>
  `,
  zh: `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">The most important tips and rules for your squad.</div>
    <p style="margin:0 0 24px;text-align:center;"><img src="{{logo_url}}" alt="Soccerverse World Cup" width="128" style="display:inline-block;width:128px;max-width:45%;height:auto;"></p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#f2efe7;">Onboarding</h1>
    <p style="margin:0 0 16px;color:#c6d3ce;">Hi {{first_name}},</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Cool that you are in.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">To get started, here are the most important notes:</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Your points come from your players' performances in the real matches.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">As soon as a match has been entered, the relevant actions are evaluated and credited to your squad.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">After that, points and rankings update.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">You set your squad once. From the start of the event, the opening match, no more changes are possible.</p>
    <p style="margin:0 0 12px;color:#c6d3ce;">Your first eleven receive full points. If someone does not play, that is bad luck.</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Your substitutes receive 50% of their scored points.</p>
    <p style="margin:0 0 18px;color:#c6d3ce;"><strong style="color:#f2efe7;">Important:</strong> Only one squad is allowed per person. Multi-accounts lead to disqualification. This keeps the competition fair for everyone.</p>
    <h2 style="margin:24px 0 12px;font-size:18px;color:#f2efe7;">How can you earn bonuses as a Veteran?</h2>
    <ol style="margin:0 0 18px 20px;padding:0;color:#c6d3ce;">
      <li style="margin:0 0 10px;">Build your squad.</li>
      <li style="margin:0 0 10px;">Buy Influence for the players in your squad in the main game: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a></li>
      <li style="margin:0 0 10px;">100 Influence equals the maximum bonus of 10% on your player's points.</li>
      <li style="margin:0;">During scoring, our technical interface calculates your points including bonuses.</li>
    </ol>
    <p style="margin:0 0 22px;color:#c6d3ce;">Good luck for the first matchday.</p>
    <p style="margin:0 0 24px;"><a href="{{builder_url}}" style="display:inline-block;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;text-decoration:none;padding:14px 22px;">Check squad</a></p>
    <p style="margin:0 0 16px;color:#c6d3ce;">Your Community Event Team</p>
    <p style="margin:0;color:#c6d3ce;">PS: And here is what you can win: <a href="{{prizes_url}}" style="color:#22bd93;">Prizes overview</a></p>
  `,
}

export const defaultEmailCampaigns: EmailCampaignInput[] = [
  {
    kind: 'autoresponder',
    status: 'active',
    triggerKey: 'registration_verified',
    subject: veteranOnboardingSubject.en,
    bodyHtml: veteranOnboardingBody.en,
    subjectByLocale: veteranOnboardingSubject,
    bodyHtmlByLocale: veteranOnboardingBody,
    audienceStatus: 'active',
    audienceLeague: 'veteran',
    delayMinutes: 0,
    batchSize: 50,
    requiresMarketingOptIn: false,
  },
]
