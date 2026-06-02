import type { EmailCampaignInput, SupportedLocale } from '../domain/types.js'

interface RookieMainGameCopy {
  subject: string
  preheader: string
  title: string
  greeting: string
  paragraphs: string[]
  cta: string
  disclaimer: string
  signoff: string
}

const rookieMainGameCopy: Record<SupportedLocale, RookieMainGameCopy> = {
  en: {
    subject: 'Rookies, this is where Soccerverse really begins',
    preheader: 'Manage clubs, back players, become an agent, and turn football knowledge into an edge.',
    title: 'This is where Soccerverse really begins',
    greeting: 'Hi {{first_name}},',
    paragraphs: [
      'You joined The Grand Tournament as a Rookie.',
      'Now it might be time to discover the main game behind it.',
      'Soccerverse is not just about picking a tournament squad. In the main game, you can manage clubs, become a player agent, buy Influence in clubs and players, and take part as an investor in a living football world.',
      'Every season brings new opportunities. Soccerverse seasons start in early January and early July and last around 6 months. New players enter the game, ratings move, contracts change, clubs evolve, and the market starts asking the same question again:',
      'Who really knows football?',
      '<strong style="color:#f2efe7;">KNOW YOUR PLAYERS, OWN YOUR SUCCESS.</strong>',
      'If you can spot talent early, understand form, read potential, and see the next big player before everyone else does, Soccerverse gives you a place to act on that knowledge.',
      'Imagine not only discovering the next Mbappe, but becoming his agent, holding Influence, and being part of his story inside Soccerverse.',
      'If you love football, scouting, squad building, and the idea of turning knowledge into strategy, the main game is where the deeper journey starts.',
    ],
    cta: 'Start playing Soccerverse',
    disclaimer:
      'This is not investment advice. Influence markets involve risk, values can move both ways, and you should only participate in a way that feels right for you.',
    signoff: 'Your Community Event Team',
  },
  es: {
    subject: 'Rookies, aquí es donde Soccerverse empieza de verdad',
    preheader: 'Gestiona clubes, apoya jugadores, conviértete en agente y convierte tu conocimiento en ventaja.',
    title: 'Aquí es donde Soccerverse empieza de verdad',
    greeting: 'Hola {{first_name}},',
    paragraphs: [
      'Te uniste a The Grand Tournament como Rookie.',
      'Ahora puede ser el momento de descubrir el juego principal que hay detrás.',
      'Soccerverse no va solo de elegir una plantilla de torneo. En el juego principal puedes gestionar clubes, convertirte en agente de jugadores, comprar Influence en clubes y jugadores, y participar como inversor en un mundo futbolístico vivo.',
      'Cada temporada trae nuevas oportunidades. Las temporadas de Soccerverse empiezan a principios de enero y principios de julio y duran alrededor de 6 meses. Entran nuevos jugadores, cambian los ratings, se mueven los contratos, evolucionan los clubes, y el mercado vuelve a hacer la misma pregunta:',
      '¿Quién entiende realmente el fútbol?',
      '<strong style="color:#f2efe7;">KNOW YOUR PLAYERS, OWN YOUR SUCCESS.</strong>',
      'Si puedes detectar talento pronto, entender la forma, leer el potencial y ver al próximo gran jugador antes que los demás, Soccerverse te da un lugar para actuar con ese conocimiento.',
      'Imagina no solo descubrir al próximo Mbappe, sino convertirte en su agente, tener Influence y formar parte de su historia dentro de Soccerverse.',
      'Si te gusta el fútbol, el scouting, construir plantillas y la idea de convertir conocimiento en estrategia, el juego principal es donde empieza el viaje más profundo.',
    ],
    cta: 'Empezar a jugar Soccerverse',
    disclaimer:
      'Esto no es asesoramiento de inversión. Los mercados de Influence implican riesgo, los valores pueden subir o bajar, y solo deberías participar de una forma que encaje contigo.',
    signoff: 'Tu Community Event Team',
  },
  it: {
    subject: 'Rookies, è qui che Soccerverse inizia davvero',
    preheader: 'Gestisci club, punta sui giocatori, diventa agente e trasforma la conoscenza in vantaggio.',
    title: 'È qui che Soccerverse inizia davvero',
    greeting: 'Ciao {{first_name}},',
    paragraphs: [
      'Ti sei unito a The Grand Tournament come Rookie.',
      'Ora potrebbe essere il momento di scoprire il gioco principale dietro l’evento.',
      'Soccerverse non significa solo scegliere una rosa per il torneo. Nel gioco principale puoi gestire club, diventare agente di giocatori, comprare Influence in club e giocatori, e partecipare come investitore in un mondo calcistico vivo.',
      'Ogni stagione porta nuove opportunità. Le stagioni di Soccerverse iniziano a inizio gennaio e a inizio luglio e durano circa 6 mesi. Entrano nuovi giocatori, i rating cambiano, i contratti si muovono, i club evolvono, e il mercato torna a fare la stessa domanda:',
      'Chi conosce davvero il calcio?',
      '<strong style="color:#f2efe7;">KNOW YOUR PLAYERS, OWN YOUR SUCCESS.</strong>',
      'Se sai individuare presto il talento, capire la forma, leggere il potenziale e vedere il prossimo grande giocatore prima degli altri, Soccerverse ti dà un posto dove agire su quella conoscenza.',
      'Immagina non solo di scoprire il prossimo Mbappe, ma di diventarne agente, detenere Influence e far parte della sua storia dentro Soccerverse.',
      'Se ami il calcio, lo scouting, la costruzione delle rose e l’idea di trasformare conoscenza in strategia, il gioco principale è dove inizia il viaggio più profondo.',
    ],
    cta: 'Inizia a giocare a Soccerverse',
    disclaimer:
      'Questo non è consiglio finanziario. I mercati Influence comportano rischi, i valori possono salire o scendere, e dovresti partecipare solo nel modo che ritieni adatto a te.',
    signoff: 'Il tuo Community Event Team',
  },
  de: {
    subject: 'Rookies, hier beginnt Soccerverse wirklich',
    preheader: 'Manage Clubs, unterstütze Spieler, werde Agent und mach Fußballwissen zu deinem Vorteil.',
    title: 'Hier beginnt Soccerverse wirklich',
    greeting: 'Hallo {{first_name}},',
    paragraphs: [
      'Du bist bei The Grand Tournament als Rookie eingestiegen.',
      'Jetzt ist vielleicht der Moment, das Hauptspiel dahinter zu entdecken.',
      'Soccerverse bedeutet nicht nur, einen Turnier-Kader zu picken. Im Hauptspiel kannst du Clubs managen, Spieleragent werden, Influence in Clubs und Spieler kaufen und als Investor in einer lebendigen Fußballwelt mitwirken.',
      'Jede Saison bringt neue Chancen. Soccerverse-Saisons starten jeweils Anfang Januar und Anfang Juli und dauern rund 6 Monate. Neue Spieler kommen ins Spiel, Ratings bewegen sich, Verträge verändern sich, Clubs entwickeln sich weiter, und der Markt stellt wieder dieselbe Frage:',
      'Wer kennt Fußball wirklich?',
      '<strong style="color:#f2efe7;">KNOW YOUR PLAYERS, OWN YOUR SUCCESS.</strong>',
      'Wenn du Talente früh erkennst, Form verstehst, Potenzial lesen kannst und den nächsten großen Spieler vor allen anderen siehst, gibt dir Soccerverse einen Ort, dieses Wissen einzusetzen.',
      'Stell dir vor, du entdeckst nicht nur den nächsten Mbappe, sondern wirst in Soccerverse sein Agent, hältst Influence und wirst Teil seiner Geschichte.',
      'Wenn du Fußball, Scouting, Squad Building und die Idee liebst, Wissen in Strategie zu verwandeln, beginnt die tiefere Reise im Hauptspiel.',
    ],
    cta: 'Soccerverse spielen',
    disclaimer:
      'Das ist keine Investmentberatung. Influence-Märkte enthalten Risiko, Werte können in beide Richtungen laufen, und du solltest nur so teilnehmen, wie es sich für dich richtig anfühlt.',
    signoff: 'Dein Community Event Team',
  },
  fr: {
    subject: 'Rookies, c’est ici que Soccerverse commence vraiment',
    preheader: 'Gère des clubs, soutiens des joueurs, deviens agent et transforme ton savoir en avantage.',
    title: 'C’est ici que Soccerverse commence vraiment',
    greeting: 'Bonjour {{first_name}},',
    paragraphs: [
      'Tu as rejoint The Grand Tournament en tant que Rookie.',
      'Il est peut-être temps de découvrir le jeu principal derrière l’événement.',
      'Soccerverse ne se limite pas à choisir un effectif de tournoi. Dans le jeu principal, tu peux gérer des clubs, devenir agent de joueurs, acheter de l’Influence dans des clubs et des joueurs, et participer comme investisseur dans un monde de football vivant.',
      'Chaque saison apporte de nouvelles opportunités. Les saisons Soccerverse commencent début janvier et début juillet et durent environ 6 mois. De nouveaux joueurs arrivent, les ratings bougent, les contrats changent, les clubs évoluent, et le marché repose la même question :',
      'Qui connaît vraiment le football ?',
      '<strong style="color:#f2efe7;">KNOW YOUR PLAYERS, OWN YOUR SUCCESS.</strong>',
      'Si tu sais repérer le talent tôt, comprendre la forme, lire le potentiel et voir le prochain grand joueur avant les autres, Soccerverse te donne un endroit où agir avec ce savoir.',
      'Imagine ne pas seulement découvrir le prochain Mbappe, mais devenir son agent, détenir de l’Influence et faire partie de son histoire dans Soccerverse.',
      'Si tu aimes le football, le scouting, la construction d’effectif et l’idée de transformer la connaissance en stratégie, le jeu principal est le début du voyage plus profond.',
    ],
    cta: 'Commencer Soccerverse',
    disclaimer:
      'Ceci n’est pas un conseil en investissement. Les marchés d’Influence comportent des risques, les valeurs peuvent évoluer dans les deux sens, et tu ne devrais participer que d’une manière qui te convient.',
    signoff: 'Ton Community Event Team',
  },
  pt: {
    subject: 'Rookies, é aqui que Soccerverse começa a sério',
    preheader: 'Gere clubes, apoia jogadores, torna-te agente e transforma conhecimento em vantagem.',
    title: 'É aqui que Soccerverse começa a sério',
    greeting: 'Olá {{first_name}},',
    paragraphs: [
      'Entraste no The Grand Tournament como Rookie.',
      'Agora talvez seja o momento de descobrir o jogo principal por trás dele.',
      'Soccerverse não é apenas escolher um plantel de torneio. No jogo principal podes gerir clubes, tornar-te agente de jogadores, comprar Influence em clubes e jogadores, e participar como investidor num mundo de futebol vivo.',
      'Cada época traz novas oportunidades. As épocas de Soccerverse começam no início de janeiro e no início de julho e duram cerca de 6 meses. Novos jogadores entram no jogo, ratings mudam, contratos evoluem, clubes transformam-se, e o mercado volta a fazer a mesma pergunta:',
      'Quem conhece realmente futebol?',
      '<strong style="color:#f2efe7;">KNOW YOUR PLAYERS, OWN YOUR SUCCESS.</strong>',
      'Se consegues detetar talento cedo, entender forma, ler potencial e ver o próximo grande jogador antes dos outros, Soccerverse dá-te um lugar para agir com esse conhecimento.',
      'Imagina não só descobrir o próximo Mbappe, mas tornar-te o seu agente, ter Influence e fazer parte da sua história dentro de Soccerverse.',
      'Se gostas de futebol, scouting, construção de plantéis e da ideia de transformar conhecimento em estratégia, o jogo principal é onde começa a viagem mais profunda.',
    ],
    cta: 'Começar a jogar Soccerverse',
    disclaimer:
      'Isto não é aconselhamento de investimento. Os mercados de Influence envolvem risco, os valores podem subir ou descer, e só deves participar de uma forma que faça sentido para ti.',
    signoff: 'A tua Community Event Team',
  },
  ru: {
    subject: 'Rookies, именно здесь Soccerverse начинается по-настоящему',
    preheader: 'Управляй клубами, поддерживай игроков, становись агентом и превращай знания в преимущество.',
    title: 'Здесь Soccerverse начинается по-настоящему',
    greeting: 'Привет, {{first_name}},',
    paragraphs: [
      'Ты присоединился к The Grand Tournament как Rookie.',
      'Теперь, возможно, пришло время открыть для себя основную игру за этим событием.',
      'Soccerverse — это не только выбор состава на турнир. В основной игре можно управлять клубами, становиться агентом игроков, покупать Influence в клубах и игроках и участвовать как инвестор в живом футбольном мире.',
      'Каждый сезон приносит новые возможности. Сезоны Soccerverse начинаются в начале января и начале июля и длятся около 6 месяцев. В игру приходят новые игроки, меняются рейтинги, контракты, развиваются клубы, и рынок снова задает тот же вопрос:',
      'Кто действительно разбирается в футболе?',
      '<strong style="color:#f2efe7;">KNOW YOUR PLAYERS, OWN YOUR SUCCESS.</strong>',
      'Если ты умеешь рано замечать талант, понимать форму, читать потенциал и видеть следующего большого игрока раньше других, Soccerverse дает место, где можно применить эти знания.',
      'Представь, что ты не просто находишь следующего Mbappe, но становишься его агентом, держишь Influence и становишься частью его истории в Soccerverse.',
      'Если тебе нравится футбол, скаутинг, построение состава и идея превращать знания в стратегию, основная игра — это начало более глубокого пути.',
    ],
    cta: 'Начать играть в Soccerverse',
    disclaimer:
      'Это не инвестиционная рекомендация. Рынки Influence связаны с риском, стоимость может двигаться в обе стороны, и участвовать стоит только так, как тебе комфортно.',
    signoff: 'Твоя Community Event Team',
  },
  zh: {
    subject: 'Rookies，Soccerverse 真正从这里开始',
    preheader: '管理俱乐部，支持球员，成为经纪人，把足球知识变成优势。',
    title: 'Soccerverse 真正从这里开始',
    greeting: 'Hi {{first_name}},',
    paragraphs: [
      '你以 Rookie 身份加入了 The Grand Tournament。',
      '现在，也许该了解它背后的主游戏了。',
      'Soccerverse 不只是选择一个赛事阵容。在主游戏中，你可以管理俱乐部，成为球员经纪人，购买俱乐部和球员的 Influence，并作为投资者参与一个持续运转的足球世界。',
      '每个赛季都会带来新的机会。Soccerverse 赛季分别在每年 1 月初和 7 月初开始，每个赛季大约持续 6 个月。新球员会进入游戏，评级会变化，合同会改变，俱乐部会发展，市场也会再次提出同一个问题：',
      '谁真正懂足球？',
      '<strong style="color:#f2efe7;">KNOW YOUR PLAYERS, OWN YOUR SUCCESS.</strong>',
      '如果你能早早发现天赋，理解状态，看懂潜力，并在其他人之前发现下一个巨星，Soccerverse 就给了你一个把这种知识付诸行动的地方。',
      '想象一下，你不只是发现下一个 Mbappe，而是在 Soccerverse 中成为他的经纪人，持有 Influence，并成为他故事的一部分。',
      '如果你热爱足球、球探、阵容建设，以及把知识变成策略的想法，主游戏就是更深入旅程的开始。',
    ],
    cta: '开始玩 Soccerverse',
    disclaimer:
      '这不是投资建议。Influence 市场存在风险，价值可能上涨也可能下跌，你只应以适合自己的方式参与。',
    signoff: '你的 Community Event Team',
  },
  ja: {
    subject: 'Rookies、Soccerverse はここから本当に始まります',
    preheader: 'クラブを管理し、選手を支え、エージェントになり、サッカー知識を強みに変えましょう。',
    title: 'Soccerverse はここから本当に始まります',
    greeting: 'こんにちは {{first_name}},',
    paragraphs: [
      'あなたは Rookie として The Grand Tournament に参加しました。',
      '次は、その背後にあるメインゲームを知るタイミングかもしれません。',
      'Soccerverse はトーナメント用スカッドを選ぶだけのものではありません。メインゲームでは、クラブを管理し、選手のエージェントになり、クラブや選手の Influence を購入し、生きているサッカー世界に投資家として参加できます。',
      'シーズンごとに新しいチャンスがあります。Soccerverse のシーズンは毎年1月初旬と7月初旬に始まり、約6か月続きます。新しい選手が加わり、レーティングが動き、契約が変わり、クラブが進化し、市場はまた同じ問いを投げかけます:',
      '本当にサッカーを知っているのは誰か？',
      '<strong style="color:#f2efe7;">KNOW YOUR PLAYERS, OWN YOUR SUCCESS.</strong>',
      '才能を早く見つけ、フォームを理解し、ポテンシャルを読み、次の大物を他の人より先に見つけられるなら、Soccerverse はその知識を活かす場所になります。',
      '次の Mbappe を見つけるだけでなく、Soccerverse 内で彼のエージェントになり、Influence を持ち、その物語の一部になることを想像してください。',
      'サッカー、スカウティング、スカッド構築、そして知識を戦略に変えることが好きなら、メインゲームこそがより深い旅の始まりです。',
    ],
    cta: 'Soccerverse を始める',
    disclaimer:
      'これは投資助言ではありません。Influence 市場にはリスクがあり、価値は上下します。自分に合った形でのみ参加してください。',
    signoff: 'Community Event Team',
  },
}

function paragraph(text: string) {
  return `<p style="margin:0 0 12px;color:#c6d3ce;">${text}</p>`
}

function buildRookieMainGameBody(copy: RookieMainGameCopy) {
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.preheader}</div>
    <p style="margin:0 0 24px;text-align:center;"><img src="{{logo_url}}" alt="The Grand Tournament" width="220" style="display:inline-block;width:220px;max-width:70%;height:auto;"></p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#f2efe7;">${copy.title}</h1>
    <p style="margin:0 0 16px;color:#c6d3ce;">${copy.greeting}</p>
    ${copy.paragraphs.map(paragraph).join('')}
    <p style="margin:18px 0 20px;"><a href="{{play_affiliate_url}}" style="display:inline-block;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;text-decoration:none;padding:14px 22px;">${copy.cta}</a></p>
    <p style="margin:0 0 18px;font-size:12px;line-height:1.55;color:#8fa39b;">${copy.disclaimer}</p>
    <p style="margin:0;color:#c6d3ce;">${copy.signoff}</p>
  `
}

const rookieMainGameSubject: Record<SupportedLocale, string> = Object.fromEntries(
  Object.entries(rookieMainGameCopy).map(([locale, copy]) => [locale, copy.subject]),
) as Record<SupportedLocale, string>

const rookieMainGameBody: Record<SupportedLocale, string> = Object.fromEntries(
  Object.entries(rookieMainGameCopy).map(([locale, copy]) => [locale, buildRookieMainGameBody(copy)]),
) as Record<SupportedLocale, string>

export const rookieMainGameEmailCampaign: EmailCampaignInput = {
  kind: 'autoresponder',
  status: 'active',
  triggerKey: 'registration_created',
  subject: rookieMainGameSubject.en,
  bodyHtml: rookieMainGameBody.en,
  subjectByLocale: rookieMainGameSubject,
  bodyHtmlByLocale: rookieMainGameBody,
  audienceStatus: 'all',
  audienceLeague: 'rookie',
  delayMinutes: 60 * 24,
  batchSize: 50,
  requiresMarketingOptIn: true,
}
