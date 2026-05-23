import type { EmailCampaignInput, SupportedLocale } from '../domain/types.js'

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

const veteranOnboardingCopy: Record<SupportedLocale, VeteranOnboardingCopy> = {
  en: {
    subject: 'Soccerverse World Cup Event - How it works',
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
    subject: 'Soccerverse World Cup Event - Cómo funciona',
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
  de: {
    subject: 'Soccerverse World Cup Event - So funktioniert es',
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
    subject: 'Soccerverse World Cup Event - Comment ça marche',
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
    subject: 'Soccerverse World Cup Event - Como funciona',
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
    subject: 'Soccerverse World Cup Event - Как это работает',
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
    subject: 'Soccerverse World Cup Event - 玩法说明',
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
    <p style="margin:0 0 24px;text-align:center;"><img src="{{logo_url}}" alt="Soccerverse World Cup" width="128" style="display:inline-block;width:128px;max-width:45%;height:auto;"></p>
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

const veteranOnboardingSubject: Record<SupportedLocale, string> = Object.fromEntries(
  Object.entries(veteranOnboardingCopy).map(([locale, copy]) => [locale, copy.subject]),
) as Record<SupportedLocale, string>

const veteranOnboardingBody: Record<SupportedLocale, string> = Object.fromEntries(
  Object.entries(veteranOnboardingCopy).map(([locale, copy]) => [locale, buildVeteranOnboardingBody(copy)]),
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
]
