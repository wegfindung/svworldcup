import type { EmailCampaignInput, SupportedLocale } from '../domain/types.js'
import { rookieMainGameEmailCampaign } from './rookieMainGameEmailCampaign.js'
import { squadSubmissionReminderEmailCampaign } from './squadSubmissionReminderEmailCampaign.js'
import { swapWindowEmailCampaigns } from './swapWindowEmailCampaigns.js'

interface VeteranOnboardingCopy {
  subject: string
  preheader: string
  title: string
  greeting: string
  intro: string
  notesIntro: string
  points: string[]
  important: string
  bonusTitle: string
  bonusSteps: string[]
  goodLuck: string
  cta: string
  signoff: string
  prizes: string
  prizesLink: string
}

interface RookieOnboardingCopy {
  subject: string
  preheader: string
  title: string
  greeting: string
  intro: string
  twist: string
  notesIntro: string
  points: string[]
  resourcesIntro: string
  helpCta: string
  builderCta: string
  discordCta: string
  discordBody: string
  goodLuck: string
  signoff: string
}

const veteranOnboardingCopy: Record<SupportedLocale, VeteranOnboardingCopy> = {
  en: {
    subject: 'The Grand Tournament - How it works',
    preheader: 'The most important tips and rules for your squad.',
    title: 'Onboarding',
    greeting: 'Hi {{first_name}},',
    intro: 'Great that you are in.',
    notesIntro: 'To get started, here are the most important notes:',
    points: [
      "Your points come from your players' performances in the real matches.",
      'As soon as a match has been entered, the relevant actions are evaluated and credited to your squad.',
      'After that, points and rankings update.',
      'You set your squad once. From the start of the event, the opening match, no more changes are possible.',
      'Your first eleven receive full points. If someone does not play, that is bad luck.',
      'Your substitutes receive 50% of their scored points.',
    ],
    important: 'Important: Only one squad is allowed per person. Multi-accounts lead to disqualification. This keeps the competition fair for everyone.',
    bonusTitle: 'How can you earn bonuses as a Veteran?',
    bonusSteps: [
      'Build your squad.',
      'Buy Influence for the players in your squad in the main game: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a>',
      "100 Influence equals the maximum bonus of 10% on your player's points.",
      'During scoring, our technical interface calculates your points including bonuses.',
    ],
    goodLuck: 'Good luck for the first matchday.',
    cta: 'Check squad',
    signoff: 'Your Community Event Team',
    prizes: 'PS: And here is what you can win:',
    prizesLink: 'Prizes overview',
  },
  es: {
    subject: 'The Grand Tournament - Cómo funciona',
    preheader: 'Los consejos y reglas más importantes para tu plantilla.',
    title: 'Onboarding',
    greeting: 'Hola {{first_name}},',
    intro: 'Genial que estés participando.',
    notesIntro: 'Para empezar, estos son los puntos más importantes:',
    points: [
      'Tus puntos vienen del rendimiento de tus jugadores en los partidos reales.',
      'Cuando se registra un partido, se evalúan las acciones relevantes y se acreditan a tu plantilla.',
      'Después se actualizan puntos y ranking.',
      'Fijas tu plantilla una sola vez. Desde el inicio del evento, el partido inaugural, ya no se pueden hacer cambios.',
      'Tu once inicial recibe todos los puntos. Si alguien no juega, es mala suerte.',
      'Tus suplentes reciben el 50% de los puntos conseguidos.',
    ],
    important: 'Importante: Solo se permite una plantilla por persona. Los multi-accounts llevan a la descalificación. Así la competición sigue siendo justa para todos.',
    bonusTitle: '¿Cómo puedes conseguir bonos como Veteran?',
    bonusSteps: [
      'Crea tu plantilla.',
      'Compra Influence de los jugadores de tu plantilla en el juego principal: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a>',
      '100 Influence equivalen al bono máximo del 10% sobre los puntos de tu jugador.',
      'En la evaluación, nuestra interfaz técnica calcula tus puntos con los bonos.',
    ],
    goodLuck: 'Mucha suerte para la primera jornada.',
    cta: 'Revisar plantilla',
    signoff: 'Tu Community Event Team',
    prizes: 'PD: Y esto es lo que puedes ganar:',
    prizesLink: 'Ver premios',
  },
  it: {
    subject: 'The Grand Tournament - Come funziona',
    preheader: 'I consigli e le regole più importanti per la tua rosa.',
    title: 'Onboarding',
    greeting: 'Ciao {{first_name}},',
    intro: 'bello averti con noi.',
    notesIntro: 'Per iniziare, ecco le indicazioni più importanti:',
    points: [
      'I tuoi punti derivano dalle prestazioni dei tuoi giocatori nelle partite reali.',
      'Appena una partita viene registrata, le azioni rilevanti vengono valutate e accreditate alla tua rosa.',
      'Dopo di che punti e ranking si aggiornano.',
      'Imposti la tua rosa una sola volta. Dall’inizio dell’evento, la partita inaugurale, non saranno più possibili modifiche.',
      'Il tuo undici titolare riceve tutti i punti. Se qualcuno non gioca, è sfortuna.',
      'I tuoi sostituti ricevono il 50% dei punti ottenuti.',
    ],
    important: 'Importante: è consentita una sola rosa per persona. I multi-account portano alla squalifica. Così la competizione resta equa per tutti.',
    bonusTitle: 'Come puoi ottenere bonus da Veteran?',
    bonusSteps: [
      'Costruisci la tua rosa.',
      'Compra Influence dei giocatori della tua rosa nel gioco principale: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a>',
      '100 Influence equivalgono al bonus massimo del 10% sui punti del tuo giocatore.',
      'Durante il calcolo, la nostra interfaccia tecnica determina i tuoi punti includendo i bonus.',
    ],
    goodLuck: 'Buona fortuna per la prima giornata.',
    cta: 'Controlla la rosa',
    signoff: 'Il tuo Community Event Team',
    prizes: 'PS: Ecco cosa puoi vincere:',
    prizesLink: 'Vedi premi',
  },
  de: {
    subject: 'The Grand Tournament - So funktioniert es',
    preheader: 'Die wichtigsten Tipps und Regeln für deinen Kader.',
    title: 'Onboarding',
    greeting: 'Hallo {{first_name}},',
    intro: 'cool, dass Du dabei bist.',
    notesIntro: 'Zum Start hier die wichtigsten Hinweise:',
    points: [
      'Deine Punkte entstehen aus den Leistungen deiner Spieler in den echten Spielen.',
      'Sobald ein Spiel erfasst wurde, werden die relevanten Aktionen ausgewertet und deinem Kader gutgeschrieben.',
      'Danach aktualisieren sich Punkte und Ranking.',
      'Du legst einmal Deinen Kader fest. Ab Anstoß des Events, dem Eröffnungsspiel, sind keine Änderungen mehr möglich.',
      'Deine erste Elf erhält die vollen Punkte. Wenn jemand nicht spielt, hast Du Pech gehabt.',
      'Deine Ersatzspieler erhalten 50% der erzielten Punkte.',
    ],
    important: 'Wichtig: Pro Person ist nur ein Kader erlaubt. Multi-Accounts führen zur Disqualifikation. So bleibt der Wettbewerb fair für alle.',
    bonusTitle: 'Wie kannst Du als Veteran Boni erzielen?',
    bonusSteps: [
      'Stelle Deinen Kader zusammen.',
      'Kaufe im Hauptspiel Einfluss/Influence von den Spielern Deines Kaders: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a>',
      '100 Influence entsprechen dem maximalen Bonus von 10% auf die Punktzahl Deines Spielers.',
      'Bei der Auswertung ermittelt unsere technische Schnittstelle Deine Punktzahl mit Boni.',
    ],
    goodLuck: 'Viel Erfolg für den ersten Spieltag.',
    cta: 'Kader prüfen',
    signoff: 'Dein Community Event Team',
    prizes: 'PS: Und das gibt es zu gewinnen:',
    prizesLink: 'Preisübersicht',
  },
  fr: {
    subject: 'The Grand Tournament - Comment ça marche',
    preheader: 'Les conseils et règles les plus importants pour ton effectif.',
    title: 'Onboarding',
    greeting: 'Bonjour {{first_name}},',
    intro: 'content que tu participes.',
    notesIntro: 'Pour commencer, voici les points les plus importants :',
    points: [
      'Tes points viennent des performances de tes joueurs dans les vrais matchs.',
      'Dès qu’un match est saisi, les actions pertinentes sont évaluées et créditées à ton effectif.',
      'Ensuite, les points et le classement sont mis à jour.',
      'Tu fixes ton effectif une seule fois. À partir du début de l’event, le match d’ouverture, aucun changement n’est possible.',
      'Ton onze de départ reçoit tous les points. Si quelqu’un ne joue pas, tant pis.',
      'Tes remplaçants reçoivent 50% des points marqués.',
    ],
    important: 'Important : une seule équipe est autorisée par personne. Les multi-accounts entraînent la disqualification. Le concours reste ainsi juste pour tous.',
    bonusTitle: 'Comment obtenir des bonus en tant que Veteran ?',
    bonusSteps: [
      'Compose ton effectif.',
      'Achète de l’Influence pour les joueurs de ton effectif dans le jeu principal : <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a>',
      '100 Influence correspondent au bonus maximum de 10% sur les points de ton joueur.',
      'Lors du calcul, notre interface technique détermine tes points avec les bonus.',
    ],
    goodLuck: 'Bonne chance pour la première journée.',
    cta: 'Vérifier l’effectif',
    signoff: 'Ton Community Event Team',
    prizes: 'PS : voici ce qu’il y a à gagner :',
    prizesLink: 'Voir les prix',
  },
  pt: {
    subject: 'The Grand Tournament - Como funciona',
    preheader: 'As dicas e regras mais importantes para o teu plantel.',
    title: 'Onboarding',
    greeting: 'Olá {{first_name}},',
    intro: 'que bom que estás dentro.',
    notesIntro: 'Para começar, aqui estão os pontos mais importantes:',
    points: [
      'Os teus pontos resultam das performances dos teus jogadores nos jogos reais.',
      'Assim que um jogo é registado, as ações relevantes são avaliadas e creditadas ao teu plantel.',
      'Depois disso, pontos e ranking são atualizados.',
      'Define o teu plantel uma única vez. A partir do início do evento, o jogo de abertura, não são possíveis alterações.',
      'O teu onze inicial recebe todos os pontos. Se alguém não jogar, é azar.',
      'Os teus suplentes recebem 50% dos pontos obtidos.',
    ],
    important: 'Importante: é permitido apenas um plantel por pessoa. Multi-accounts resultam em desqualificação. Assim a competição fica justa para todos.',
    bonusTitle: 'Como podes ganhar bónus como Veteran?',
    bonusSteps: [
      'Monta o teu plantel.',
      'Compra Influence dos jogadores do teu plantel no jogo principal: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a>',
      '100 Influence correspondem ao bónus máximo de 10% nos pontos do teu jogador.',
      'Na avaliação, a nossa interface técnica calcula os teus pontos com os bónus.',
    ],
    goodLuck: 'Boa sorte para a primeira jornada.',
    cta: 'Ver plantel',
    signoff: 'A tua Community Event Team',
    prizes: 'PS: É isto que podes ganhar:',
    prizesLink: 'Ver prémios',
  },
  ru: {
    subject: 'The Grand Tournament - Как это работает',
    preheader: 'Самые важные советы и правила для твоего состава.',
    title: 'Onboarding',
    greeting: 'Привет, {{first_name}},',
    intro: 'здорово, что ты участвуешь.',
    notesIntro: 'Для старта самое важное:',
    points: [
      'Очки зависят от выступлений твоих игроков в реальных матчах.',
      'Когда матч внесен, важные действия оцениваются и начисляются твоему составу.',
      'После этого обновляются очки и рейтинг.',
      'Состав выбирается один раз. С начала события, с матча открытия, изменения больше невозможны.',
      'Твои первые 11 игроков получают полные очки. Если кто-то не играет, это не повезло.',
      'Запасные получают 50% набранных очков.',
    ],
    important: 'Важно: на одного человека разрешен только один состав. Multi-accounts ведут к дисквалификации. Так соревнование остается честным для всех.',
    bonusTitle: 'Как Veteran может получить бонусы?',
    bonusSteps: [
      'Собери свой состав.',
      'Купи Influence игроков твоего состава в основной игре: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a>',
      '100 Influence дают максимальный бонус 10% к очкам игрока.',
      'При подсчете наша техническая интеграция считает твои очки с бонусами.',
    ],
    goodLuck: 'Удачи в первый matchday.',
    cta: 'Проверить состав',
    signoff: 'Твоя Community Event Team',
    prizes: 'PS: Вот что можно выиграть:',
    prizesLink: 'Обзор призов',
  },
  zh: {
    subject: 'The Grand Tournament - 玩法说明',
    preheader: '关于你阵容的关键提示和规则。',
    title: 'Onboarding',
    greeting: 'Hi {{first_name}},',
    intro: '很高兴你加入。',
    notesIntro: '开始前，先看最重要的提示：',
    points: [
      '你的积分来自球员在真实比赛中的表现。',
      '一场比赛录入后，相关动作会被评估并计入你的阵容。',
      '之后积分和排名会更新。',
      '阵容只设置一次。从活动开始，也就是揭幕战开球起，就不能再修改。',
      '你的首发十一人获得完整积分。如果有人没有出场，那只能算运气不好。',
      '替补球员获得其得分的 50%。',
    ],
    important: '重要：每人只允许一个阵容。Multi-accounts 会导致取消资格。这样比赛才能对所有人公平。',
    bonusTitle: '作为 Veteran，如何获得加成？',
    bonusSteps: [
      '组建你的阵容。',
      '在主游戏中购买你阵容球员的 Influence：<a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a>',
      '100 Influence 对应球员积分最高 10% 的加成。',
      '计分时，我们的技术接口会计算包含加成后的积分。',
    ],
    goodLuck: '祝你第一个比赛日好运。',
    cta: '检查阵容',
    signoff: '你的 Community Event Team',
    prizes: 'PS：这里可以查看你能赢得什么：',
    prizesLink: '奖品概览',
  },
  ja: {
    subject: 'The Grand Tournament - 仕組み',
    preheader: 'スカッドのための重要なヒントとルール。',
    title: 'オンボーディング',
    greeting: 'こんにちは {{first_name}},',
    intro: '参加してくれてありがとうございます。',
    notesIntro: '開始前に、重要なポイントを確認してください:',
    points: [
      'ポイントは実際の試合での選手のパフォーマンスから発生します。',
      '試合が入力されると、関連するアクションが評価され、あなたのスカッドに加算されます。',
      'その後、ポイントとランキングが更新されます。',
      'スカッドは一度だけ設定します。イベント開始、つまり開幕戦のキックオフ以降は変更できません。',
      'スタメン11人は満額のポイントを獲得します。出場しない選手がいても自動交代はありません。',
      '控え選手は獲得ポイントの50%を受け取ります。',
    ],
    important: '重要: 1人につき許可されるスカッドは1つだけです。複数アカウントは失格につながります。これにより全員に公平な競争を保ちます。',
    bonusTitle: 'Veteran としてボーナスを得るには？',
    bonusSteps: [
      'スカッドを作成します。',
      'メインゲームでスカッド内の選手の Influence を購入します: <a href="{{play_url}}" style="color:#22bd93;">{{play_url}}</a>',
      '100 Influence は、その選手のポイントに対する最大10%ボーナスに相当します。',
      'スコア計算時に、技術連携がボーナス込みのポイントを算出します。',
    ],
    goodLuck: '初戦に向けて幸運を祈ります。',
    cta: 'スカッドを確認',
    signoff: 'Community Event Team',
    prizes: 'PS: 獲得できる賞品はこちら:',
    prizesLink: '賞品概要',
  },
}

const rookieOnboardingCopy: Record<SupportedLocale, RookieOnboardingCopy> = {
  en: {
    subject: 'Rookie briefing: your Grand Tournament crash course',
    preheader: 'New here? Perfect. Here is how the event works without making it feel like homework.',
    title: 'Rookie briefing',
    greeting: 'Hi {{first_name}},',
    intro:
      'You joined as a Rookie, so this one is just for you. The Grand Tournament Community Event is simple at the surface: build one 15-player squad, lock it in, then watch real tournament matches turn into points. Goals, assists, minutes, clean sheets, match ratings, and your chosen budget all matter.',
    twist:
      'The fun twist: bigger budgets are easier to build with, so they score with a lower multiplier. Smaller budgets are harder, so they get a boost. You do not need to know every Soccerverse mechanic on day one. Pick players you like, keep an eye on the cap, and let the tournament do the rest.',
    notesIntro: 'A few things to know before you build:',
    points: [
      'You can only have one account. Multi-accounting can disqualify you.',
      'You can draft a maximum of 4 players from the same Grand Tournament team. So no full Brazil squad, no full Morocco squad, no "I only trust one nation" masterplan.',
      'Your squad has 11 starters and 4 reserves. Reserves still score at 50%, so your bench matters.',
      'Later in the tournament, there are limited swap windows where you can move reserves into the starting lineup.',
    ],
    resourcesIntro: 'If anything is unclear, start here:',
    helpCta: 'Open Help page',
    builderCta: 'Open Builder',
    discordCta: 'Join Discord',
    discordBody: 'The Discord is the best place to ask questions, get support, and see what other managers are thinking.',
    goodLuck: 'Good luck, Rookie. Build something clever.',
    signoff: 'The Grand Tournament Team',
  },
  es: {
    subject: 'Briefing Rookie: tu curso rápido para The Grand Tournament',
    preheader: '¿Nuevo por aquí? Perfecto. Así funciona el evento sin convertirlo en tarea.',
    title: 'Briefing Rookie',
    greeting: 'Hola {{first_name}},',
    intro:
      'Te uniste como Rookie, así que este correo es solo para ti. The Grand Tournament Community Event es sencillo por fuera: crea una plantilla de 15 jugadores, bloquéala y mira cómo los partidos reales se convierten en puntos. Cuentan goles, asistencias, minutos, porterías a cero, ratings de partido y el presupuesto que elijas.',
    twist:
      'El giro divertido: los presupuestos grandes son más fáciles de construir, por eso puntúan con un multiplicador menor. Los presupuestos pequeños son más difíciles, así que reciben un boost. No necesitas dominar cada mecánica de Soccerverse desde el primer día. Elige jugadores que te gusten, vigila el cap y deja que el torneo haga el resto.',
    notesIntro: 'Algunas cosas que conviene saber antes de construir:',
    points: [
      'Solo puedes tener una cuenta. El multi-accounting puede descalificarte.',
      'Puedes draftear como máximo 4 jugadores del mismo equipo del Grand Tournament. Así que nada de plantilla entera de Brasil, Marruecos o de una sola nación.',
      'Tu plantilla tiene 11 titulares y 4 reservas. Los reservas también puntúan al 50%, así que el banquillo importa.',
      'Más adelante habrá ventanas de cambios limitadas en las que podrás mover reservas al once titular.',
    ],
    resourcesIntro: 'Si algo no está claro, empieza aquí:',
    helpCta: 'Abrir página de ayuda',
    builderCta: 'Abrir Builder',
    discordCta: 'Entrar al Discord',
    discordBody: 'El Discord es el mejor sitio para hacer preguntas, recibir soporte y ver qué están pensando otros managers.',
    goodLuck: 'Suerte, Rookie. Construye algo inteligente.',
    signoff: 'The Grand Tournament Team',
  },
  it: {
    subject: 'Briefing Rookie: il tuo corso rapido per The Grand Tournament',
    preheader: 'Nuovo qui? Perfetto. Ecco come funziona l’evento senza farlo sembrare compiti.',
    title: 'Briefing Rookie',
    greeting: 'Ciao {{first_name}},',
    intro:
      'Ti sei iscritto come Rookie, quindi questa mail è solo per te. The Grand Tournament Community Event è semplice in superficie: costruisci una rosa da 15 giocatori, bloccala e guarda le partite reali trasformarsi in punti. Contano gol, assist, minuti, clean sheet, rating partita e il budget che scegli.',
    twist:
      'Il dettaglio divertente: i budget più grandi sono più facili da usare, quindi segnano con un moltiplicatore più basso. I budget più piccoli sono più difficili, quindi ricevono un boost. Non devi conoscere ogni meccanica di Soccerverse dal primo giorno. Scegli giocatori che ti piacciono, tieni d’occhio il cap e lascia fare al torneo.',
    notesIntro: 'Qualche cosa da sapere prima di costruire:',
    points: [
      'Puoi avere un solo account. Il multi-accounting può portare alla squalifica.',
      'Puoi draftare al massimo 4 giocatori dallo stesso team del Grand Tournament. Quindi niente rosa tutta Brasile, tutta Marocco o solo di una nazione.',
      'La tua rosa ha 11 titolari e 4 riserve. Le riserve segnano comunque al 50%, quindi la panchina conta.',
      'Più avanti nel torneo ci saranno finestre di cambio limitate in cui potrai spostare riserve nella formazione titolare.',
    ],
    resourcesIntro: 'Se qualcosa non è chiaro, parti da qui:',
    helpCta: 'Apri la pagina Help',
    builderCta: 'Apri il Builder',
    discordCta: 'Entra su Discord',
    discordBody: 'Discord è il posto migliore per fare domande, ricevere supporto e vedere cosa pensano gli altri manager.',
    goodLuck: 'Buona fortuna, Rookie. Costruisci qualcosa di intelligente.',
    signoff: 'The Grand Tournament Team',
  },
  de: {
    subject: 'Rookie-Briefing: Dein Crashkurs für The Grand Tournament',
    preheader: 'Neu dabei? Perfekt. So funktioniert das Event, ohne dass es sich nach Hausaufgaben anfühlt.',
    title: 'Rookie-Briefing',
    greeting: 'Hi {{first_name}},',
    intro:
      'Du bist als Rookie dabei, also ist diese Mail nur für Dich. Das Grand Tournament Community Event ist an der Oberfläche einfach: Baue einen 15-Spieler-Kader, locke ihn ein und sieh zu, wie echte Turnierspiele zu Punkten werden. Tore, Assists, Minuten, Clean Sheets, Match Ratings und Dein gewähltes Budget zählen.',
    twist:
      'Der spaßige Twist: Größere Budgets sind leichter zu bauen, deshalb scoren sie mit einem niedrigeren Multiplikator. Kleinere Budgets sind schwieriger und bekommen deshalb einen Boost. Du musst nicht am ersten Tag jede Soccerverse-Mechanik kennen. Pick Spieler, die Du magst, achte auf den Cap und lass das Turnier den Rest erledigen.',
    notesIntro: 'Ein paar Dinge solltest Du vor dem Bauen wissen:',
    points: [
      'Du darfst nur einen Account haben. Multi-Accounting kann Dich disqualifizieren.',
      'Du kannst maximal 4 Spieler aus demselben Grand Tournament Team draften. Also kein kompletter Brasilien-Kader, kein kompletter Marokko-Kader und kein "Ich vertraue nur einer Nation"-Masterplan.',
      'Dein Kader hat 11 Starter und 4 Ersatzspieler. Ersatzspieler scoren trotzdem mit 50%, Deine Bank ist also wichtig.',
      'Später im Turnier gibt es begrenzte Wechselfenster, in denen Du Ersatzspieler in die Starting Eleven schieben kannst.',
    ],
    resourcesIntro: 'Wenn etwas unklar ist, starte hier:',
    helpCta: 'Help-Seite öffnen',
    builderCta: 'Builder öffnen',
    discordCta: 'Discord beitreten',
    discordBody: 'Der Discord ist der beste Ort für Fragen, Support und um zu sehen, was andere Manager denken.',
    goodLuck: 'Viel Glück, Rookie. Bau etwas Cleveres.',
    signoff: 'The Grand Tournament Team',
  },
  fr: {
    subject: 'Briefing Rookie : ton crash course pour The Grand Tournament',
    preheader: 'Nouveau ici ? Parfait. Voici comment l’événement fonctionne sans transformer ça en devoir.',
    title: 'Briefing Rookie',
    greeting: 'Salut {{first_name}},',
    intro:
      'Tu as rejoint en tant que Rookie, donc cet email est pour toi. The Grand Tournament Community Event est simple en surface : construis un effectif de 15 joueurs, verrouille-le, puis regarde les vrais matchs se transformer en points. Buts, passes, minutes, clean sheets, notes de match et budget choisi comptent tous.',
    twist:
      'Le twist amusant : les gros budgets sont plus faciles à construire, donc ils marquent avec un multiplicateur plus bas. Les petits budgets sont plus difficiles, donc ils reçoivent un boost. Tu n’as pas besoin de connaître toutes les mécaniques Soccerverse dès le premier jour. Choisis des joueurs que tu aimes, surveille le cap et laisse le tournoi faire le reste.',
    notesIntro: 'Quelques points à connaître avant de construire :',
    points: [
      'Tu ne peux avoir qu’un seul compte. Le multi-accounting peut entraîner une disqualification.',
      'Tu peux drafter au maximum 4 joueurs de la même équipe du Grand Tournament. Donc pas d’effectif 100% Brésil, 100% Maroc ou uniquement d’une nation.',
      'Ton effectif compte 11 titulaires et 4 remplaçants. Les remplaçants marquent quand même à 50%, donc ton banc compte.',
      'Plus tard dans le tournoi, des fenêtres de swap limitées te permettront de faire passer des remplaçants dans le onze de départ.',
    ],
    resourcesIntro: 'Si quelque chose n’est pas clair, commence ici :',
    helpCta: 'Ouvrir la page Help',
    builderCta: 'Ouvrir le Builder',
    discordCta: 'Rejoindre Discord',
    discordBody: 'Discord est le meilleur endroit pour poser des questions, obtenir du support et voir ce que pensent les autres managers.',
    goodLuck: 'Bonne chance, Rookie. Construis quelque chose de malin.',
    signoff: 'The Grand Tournament Team',
  },
  pt: {
    subject: 'Briefing Rookie: o teu curso rápido para The Grand Tournament',
    preheader: 'Novo por aqui? Perfeito. Eis como o evento funciona sem parecer trabalho de casa.',
    title: 'Briefing Rookie',
    greeting: 'Olá {{first_name}},',
    intro:
      'Entraste como Rookie, por isso este email é só para ti. The Grand Tournament Community Event é simples à superfície: constróis um plantel de 15 jogadores, bloqueias esse plantel e vês os jogos reais transformarem-se em pontos. Golos, assistências, minutos, clean sheets, ratings de jogo e o orçamento escolhido contam.',
    twist:
      'O twist divertido: orçamentos maiores são mais fáceis de montar, por isso pontuam com um multiplicador menor. Orçamentos menores são mais difíceis e recebem um boost. Não precisas de conhecer todas as mecânicas do Soccerverse no primeiro dia. Escolhe jogadores de que gostas, fica atento ao cap e deixa o torneio tratar do resto.',
    notesIntro: 'Algumas coisas a saber antes de começares:',
    points: [
      'Só podes ter uma conta. Multi-accounting pode levar à desqualificação.',
      'Podes escolher no máximo 4 jogadores da mesma equipa do Grand Tournament. Nada de plantel só com Brasil, só com Marrocos ou só com uma nação.',
      'O teu plantel tem 11 titulares e 4 reservas. Os reservas também pontuam a 50%, por isso o banco importa.',
      'Mais tarde no torneio haverá janelas de troca limitadas em que podes mover reservas para o onze inicial.',
    ],
    resourcesIntro: 'Se algo não estiver claro, começa aqui:',
    helpCta: 'Abrir página Help',
    builderCta: 'Abrir Builder',
    discordCta: 'Entrar no Discord',
    discordBody: 'O Discord é o melhor lugar para fazer perguntas, receber suporte e ver o que outros managers estão a pensar.',
    goodLuck: 'Boa sorte, Rookie. Constrói algo inteligente.',
    signoff: 'The Grand Tournament Team',
  },
  ru: {
    subject: 'Брифинг Rookie: быстрый курс по The Grand Tournament',
    preheader: 'Новичок? Отлично. Вот как работает событие без ощущения домашнего задания.',
    title: 'Брифинг Rookie',
    greeting: 'Привет, {{first_name}},',
    intro:
      'Ты участвуешь как Rookie, поэтому это письмо именно для тебя. The Grand Tournament Community Event устроен просто: собери состав из 15 игроков, зафиксируй его и смотри, как реальные матчи превращаются в очки. Важны голы, ассисты, минуты, clean sheets, матчевые рейтинги и выбранный бюджет.',
    twist:
      'Веселый поворот: с большим бюджетом проще собрать состав, поэтому у него ниже множитель. Малый бюджет сложнее, зато получает boost. В первый день не нужно знать каждую механику Soccerverse. Выбирай игроков, которые тебе нравятся, следи за cap и дай турниру сделать остальное.',
    notesIntro: 'Несколько вещей перед сборкой состава:',
    points: [
      'У тебя может быть только один аккаунт. Multi-accounting может привести к дисквалификации.',
      'Можно выбрать максимум 4 игроков из одной команды Grand Tournament. То есть нельзя собрать состав только из Бразилии, только из Марокко или только из одной нации.',
      'В составе 11 игроков основы и 4 запасных. Запасные тоже дают 50% очков, так что скамейка важна.',
      'Позже в турнире будут ограниченные swap windows, где можно перевести запасных в стартовый состав.',
    ],
    resourcesIntro: 'Если что-то непонятно, начни здесь:',
    helpCta: 'Открыть Help',
    builderCta: 'Открыть Builder',
    discordCta: 'Зайти в Discord',
    discordBody: 'Discord - лучшее место для вопросов, поддержки и понимания того, что думают другие managers.',
    goodLuck: 'Удачи, Rookie. Собери что-нибудь умное.',
    signoff: 'The Grand Tournament Team',
  },
  zh: {
    subject: 'Rookie 简报：The Grand Tournament 速成课',
    preheader: '刚加入？很好。这里用轻松方式说明活动怎么玩。',
    title: 'Rookie 简报',
    greeting: 'Hi {{first_name}},',
    intro:
      '你是以 Rookie 身份加入的，所以这封邮件就是写给你的。The Grand Tournament Community Event 表面上很简单：组建一个 15 人阵容，锁定它，然后看真实比赛如何变成积分。进球、助攻、出场时间、零封、比赛评分以及你选择的预算都会产生影响。',
    twist:
      '有趣的地方在于：预算越大，组队越容易，所以得分倍率更低。预算越小，组队越难，因此会获得 boost。第一天不需要掌握 Soccerverse 的所有机制。选你喜欢的球员，注意 cap，然后让赛事自己展开。',
    notesIntro: '组队前先记住几件事：',
    points: [
      '你只能拥有一个账号。Multi-accounting 可能导致取消资格。',
      '同一个 Grand Tournament 球队最多只能选 4 名球员。所以不能全巴西、全摩洛哥，也不能只相信一个国家。',
      '你的阵容有 11 名首发和 4 名替补。替补仍然按 50% 得分，所以替补席也很重要。',
      '赛事后期会有限定 swap windows，你可以把替补移入首发阵容。',
    ],
    resourcesIntro: '如果有不清楚的地方，从这里开始：',
    helpCta: '打开 Help 页面',
    builderCta: '打开 Builder',
    discordCta: '加入 Discord',
    discordBody: 'Discord 是提问、获取支持以及看看其他 managers 想法的最佳地点。',
    goodLuck: '祝你好运，Rookie。组一个聪明的阵容。',
    signoff: 'The Grand Tournament Team',
  },
  ja: {
    subject: 'Rookie ブリーフィング: The Grand Tournament 速習ガイド',
    preheader: '初参加ですか？完璧です。宿題っぽくならない形でイベントの仕組みを説明します。',
    title: 'Rookie ブリーフィング',
    greeting: 'こんにちは {{first_name}},',
    intro:
      'あなたは Rookie として参加しているので、このメールはあなた向けです。The Grand Tournament Community Event は見た目はシンプルです。15人のスカッドを作り、ロックして、実際の試合がポイントに変わるのを見守ります。ゴール、アシスト、出場時間、クリーンシート、試合評価、選んだ予算がすべて関係します。',
    twist:
      '面白いポイントは、予算が大きいほど作りやすいので倍率が低くなり、予算が小さいほど難しいので boost が付くことです。初日から Soccerverse の仕組みを全部知る必要はありません。好きな選手を選び、cap を見ながら、あとは大会に任せましょう。',
    notesIntro: '作り始める前に知っておきたいこと:',
    points: [
      '持てるアカウントは1つだけです。Multi-accounting は失格につながる可能性があります。',
      '同じ Grand Tournament チームから選べるのは最大4人です。ブラジルだけ、モロッコだけ、1つの国だけのスカッドは作れません。',
      'スカッドは先発11人と控え4人です。控えも50%で得点するので、ベンチも重要です。',
      '大会後半には、控えを先発に移せる限定 swap window があります。',
    ],
    resourcesIntro: '不明点があれば、ここから始めてください:',
    helpCta: 'Help ページを開く',
    builderCta: 'Builder を開く',
    discordCta: 'Discord に参加',
    discordBody: 'Discord は質問、サポート、他の managers の考えを見るのに最適な場所です。',
    goodLuck: '幸運を祈ります、Rookie。賢いスカッドを作りましょう。',
    signoff: 'The Grand Tournament Team',
  },
}

function paragraph(text: string) {
  return `<p style="margin:0 0 12px;color:#c6d3ce;">${text}</p>`
}

function buildVeteranOnboardingBody(copy: VeteranOnboardingCopy) {
  const points = copy.points.map(paragraph).join('')
  const bonusSteps = copy.bonusSteps.map((step) => `<li style="margin:0 0 10px;">${step}</li>`).join('')
  const importantColonIndex = copy.important.search(/[:：]/)
  const importantLabel = importantColonIndex >= 0 ? copy.important.slice(0, importantColonIndex).trim() : 'Important'
  const importantBody = importantColonIndex >= 0 ? copy.important.slice(importantColonIndex + 1).trim() : copy.important

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.preheader}</div>
    <p style="margin:0 0 24px;text-align:center;"><img src="{{logo_url}}" alt="The Grand Tournament" width="220" style="display:inline-block;width:220px;max-width:70%;height:auto;"></p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#f2efe7;">${copy.title}</h1>
    <p style="margin:0 0 16px;color:#c6d3ce;">${copy.greeting}</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">${copy.intro}</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">${copy.notesIntro}</p>
    ${points}
    <p style="margin:0 0 18px;color:#c6d3ce;"><strong style="color:#f2efe7;">${importantLabel}:</strong> ${importantBody}</p>
    <h2 style="margin:24px 0 12px;font-size:18px;color:#f2efe7;">${copy.bonusTitle}</h2>
    <ol style="margin:0 0 18px 20px;padding:0;color:#c6d3ce;">
      ${bonusSteps}
    </ol>
    <p style="margin:0 0 22px;color:#c6d3ce;">${copy.goodLuck}</p>
    <p style="margin:0 0 24px;"><a href="{{builder_url}}" style="display:inline-block;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;text-decoration:none;padding:14px 22px;">${copy.cta}</a></p>
    <p style="margin:0 0 16px;color:#c6d3ce;">${copy.signoff}</p>
    <p style="margin:0;color:#c6d3ce;">${copy.prizes} <a href="{{prizes_url}}" style="color:#22bd93;">${copy.prizesLink}</a></p>
  `
}

function buildRookieOnboardingBody(copy: RookieOnboardingCopy) {
  const points = copy.points.map((point) => `<li style="margin:0 0 10px;">${point}</li>`).join('')

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.preheader}</div>
    <p style="margin:0 0 24px;text-align:center;"><img src="{{logo_url}}" alt="The Grand Tournament" width="220" style="display:inline-block;width:220px;max-width:70%;height:auto;"></p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#f2efe7;">${copy.title}</h1>
    <p style="margin:0 0 16px;color:#c6d3ce;">${copy.greeting}</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">${copy.intro}</p>
    <p style="margin:0 0 18px;color:#c6d3ce;">${copy.twist}</p>
    <h2 style="margin:24px 0 12px;font-size:18px;color:#f2efe7;">${copy.notesIntro}</h2>
    <ul style="margin:0 0 22px 20px;padding:0;color:#c6d3ce;">
      ${points}
    </ul>
    <h2 style="margin:24px 0 12px;font-size:18px;color:#f2efe7;">${copy.resourcesIntro}</h2>
    <p style="margin:0 0 12px;"><a href="{{help_url}}" style="color:#22bd93;font-weight:700;text-decoration:none;">${copy.helpCta}</a></p>
    <p style="margin:0 0 12px;"><a href="{{builder_url}}" style="color:#22bd93;font-weight:700;text-decoration:none;">${copy.builderCta}</a></p>
    <p style="margin:0 0 18px;"><a href="https://discord.com/invite/ze5xJgg7AM" style="color:#22bd93;font-weight:700;text-decoration:none;">${copy.discordCta}</a></p>
    <p style="margin:0 0 22px;color:#c6d3ce;">${copy.discordBody}</p>
    <p style="margin:0 0 16px;color:#c6d3ce;">${copy.goodLuck}</p>
    <p style="margin:0;color:#c6d3ce;">${copy.signoff}</p>
  `
}

const veteranOnboardingSubject: Record<SupportedLocale, string> = Object.fromEntries(
  Object.entries(veteranOnboardingCopy).map(([locale, copy]) => [locale, copy.subject]),
) as Record<SupportedLocale, string>

const veteranOnboardingBody: Record<SupportedLocale, string> = Object.fromEntries(
  Object.entries(veteranOnboardingCopy).map(([locale, copy]) => [locale, buildVeteranOnboardingBody(copy)]),
) as Record<SupportedLocale, string>

const rookieOnboardingSubject: Record<SupportedLocale, string> = Object.fromEntries(
  Object.entries(rookieOnboardingCopy).map(([locale, copy]) => [locale, copy.subject]),
) as Record<SupportedLocale, string>

const rookieOnboardingBody: Record<SupportedLocale, string> = Object.fromEntries(
  Object.entries(rookieOnboardingCopy).map(([locale, copy]) => [locale, buildRookieOnboardingBody(copy)]),
) as Record<SupportedLocale, string>

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
  {
    kind: 'autoresponder',
    status: 'active',
    triggerKey: 'registration_verified',
    subject: rookieOnboardingCopy.en.subject,
    bodyHtml: rookieOnboardingBody.en,
    subjectByLocale: rookieOnboardingSubject,
    bodyHtmlByLocale: rookieOnboardingBody,
    audienceStatus: 'active',
    audienceLeague: 'rookie',
    delayMinutes: 0,
    batchSize: 50,
    requiresMarketingOptIn: false,
  },
  rookieMainGameEmailCampaign,
  squadSubmissionReminderEmailCampaign,
  ...swapWindowEmailCampaigns,
]
