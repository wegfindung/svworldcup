import type { EmailCampaignInput, SupportedLocale } from '../domain/types.js'

interface LivestreamResultsCopy {
  subject: string
  preheader: string
  title: string
  greeting: string
  invitation: string
  time: string
  results: string
  outlook: string
  cta: string
  closing: string
  signoff: string
}

const livestreamUrl = 'https://event.svtool.info/live'

const livestreamResultsCopy: Record<SupportedLocale, LivestreamResultsCopy> = {
  en: {
    subject: 'Livestream: Soccerverse Grand Tournament 🔥',
    preheader: 'Final results, winners, and a look ahead at future community events.',
    title: 'Join the Soccerverse Grand Tournament livestream',
    greeting: 'Hi {{first_name}},',
    invitation: 'Join us for our Soccerverse Grand Tournament livestream.',
    time: '<strong style="color:#f2efe7;">8:30 PM Berlin time (6:30 PM UTC)</strong>',
    results: 'We’ll talk about Soccerverse, the final results of our community event, and the winners.',
    outlook: 'We’ll also take a look ahead at future side games and community events.',
    cta: 'Join the livestream',
    closing: 'We look forward to seeing you there!',
    signoff: 'The Grand Tournament Team',
  },
  es: {
    subject: 'En directo: Soccerverse Grand Tournament 🔥',
    preheader: 'Resultados finales, ganadores y un adelanto de futuros eventos de la comunidad.',
    title: 'Únete al directo del Soccerverse Grand Tournament',
    greeting: 'Hola {{first_name}},',
    invitation: 'Acompáñanos en el directo del Soccerverse Grand Tournament.',
    time: '<strong style="color:#f2efe7;">20:30, hora de Berlín (18:30 UTC)</strong>',
    results: 'Hablaremos de Soccerverse, de los resultados finales de nuestro evento comunitario y de los ganadores.',
    outlook: 'También adelantaremos los próximos juegos paralelos y eventos de la comunidad.',
    cta: 'Unirse al directo',
    closing: '¡Esperamos verte allí!',
    signoff: 'El equipo de The Grand Tournament',
  },
  it: {
    subject: 'Livestream: Soccerverse Grand Tournament 🔥',
    preheader: 'Risultati finali, vincitori e uno sguardo ai prossimi eventi della community.',
    title: 'Partecipa al livestream del Soccerverse Grand Tournament',
    greeting: 'Ciao {{first_name}},',
    invitation: 'Unisciti a noi per il livestream del Soccerverse Grand Tournament.',
    time: '<strong style="color:#f2efe7;">20:30 ora di Berlino (18:30 UTC)</strong>',
    results: 'Parleremo di Soccerverse, dei risultati finali del nostro evento della community e dei vincitori.',
    outlook: 'Daremo anche uno sguardo ai prossimi side game e agli eventi futuri della community.',
    cta: 'Partecipa al livestream',
    closing: 'Non vediamo l’ora di vederti!',
    signoff: 'Il team di The Grand Tournament',
  },
  de: {
    subject: 'Livestream: Soccerverse Grand Tournament 🔥',
    preheader: 'Finale Resultate, Gewinner und ein Ausblick auf zukünftige Community-Events.',
    title: 'Sei beim Soccerverse Grand Tournament Livestream dabei',
    greeting: 'Hallo {{first_name}},',
    invitation: 'Sei bei unserem Soccerverse Grand Tournament Livestream dabei.',
    time: '<strong style="color:#f2efe7;">20:30 Uhr Berliner Zeit (18:30 UTC)</strong>',
    results: 'Wir sprechen über Soccerverse, die finalen Resultate unseres Community-Events und die Gewinner.',
    outlook: 'Außerdem geben wir einen Ausblick auf zukünftige Sidegames und Community-Events.',
    cta: 'Zum Livestream',
    closing: 'Wir freuen uns auf dich!',
    signoff: 'Das Grand Tournament Team',
  },
  fr: {
    subject: 'Live : Soccerverse Grand Tournament 🔥',
    preheader: 'Résultats finaux, gagnants et aperçu des prochains événements communautaires.',
    title: 'Rejoins le live du Soccerverse Grand Tournament',
    greeting: 'Bonjour {{first_name}},',
    invitation: 'Rejoins-nous pour le live du Soccerverse Grand Tournament.',
    time: '<strong style="color:#f2efe7;">20 h 30, heure de Berlin (18 h 30 UTC)</strong>',
    results: 'Nous parlerons de Soccerverse, des résultats finaux de notre événement communautaire et des gagnants.',
    outlook: 'Nous présenterons également les futurs jeux annexes et événements communautaires.',
    cta: 'Rejoindre le live',
    closing: 'Nous avons hâte de t’y retrouver !',
    signoff: 'L’équipe de The Grand Tournament',
  },
  pt: {
    subject: 'Transmissão ao vivo: Soccerverse Grand Tournament 🔥',
    preheader: 'Resultados finais, vencedores e uma antevisão dos próximos eventos da comunidade.',
    title: 'Participa na transmissão do Soccerverse Grand Tournament',
    greeting: 'Olá {{first_name}},',
    invitation: 'Junta-te a nós para a transmissão ao vivo do Soccerverse Grand Tournament.',
    time: '<strong style="color:#f2efe7;">20:30, hora de Berlim (18:30 UTC)</strong>',
    results: 'Vamos falar sobre Soccerverse, os resultados finais do nosso evento comunitário e os vencedores.',
    outlook: 'Também vamos apresentar os próximos jogos paralelos e eventos da comunidade.',
    cta: 'Entrar na transmissão',
    closing: 'Esperamos ver-te lá!',
    signoff: 'A equipa do The Grand Tournament',
  },
  ru: {
    subject: 'Прямая трансляция: Soccerverse Grand Tournament 🔥',
    preheader: 'Финальные результаты, победители и анонс будущих событий сообщества.',
    title: 'Присоединяйся к трансляции Soccerverse Grand Tournament',
    greeting: 'Привет, {{first_name}}!',
    invitation: 'Присоединяйся к нашей прямой трансляции Soccerverse Grand Tournament.',
    time: '<strong style="color:#f2efe7;">20:30 по берлинскому времени (18:30 UTC)</strong>',
    results: 'Мы поговорим о Soccerverse, финальных результатах нашего события сообщества и победителях.',
    outlook: 'А также расскажем о будущих дополнительных играх и событиях сообщества.',
    cta: 'Открыть трансляцию',
    closing: 'Будем рады видеть тебя!',
    signoff: 'Команда The Grand Tournament',
  },
  zh: {
    subject: '直播：Soccerverse Grand Tournament 🔥',
    preheader: '最终结果、获奖者，以及未来社区活动预告。',
    title: '参加 Soccerverse Grand Tournament 直播',
    greeting: '{{first_name}}，你好！',
    invitation: '欢迎参加我们的 Soccerverse Grand Tournament 直播。',
    time: '<strong style="color:#f2efe7;">柏林时间 20:30（UTC 18:30）</strong>',
    results: '我们将聊聊 Soccerverse、社区活动的最终结果以及获奖者。',
    outlook: '我们还会介绍未来的支线游戏和社区活动。',
    cta: '参加直播',
    closing: '期待在直播中见到你！',
    signoff: 'The Grand Tournament 团队',
  },
  ja: {
    subject: 'ライブ配信：Soccerverse Grand Tournament 🔥',
    preheader: '最終結果、受賞者、そして今後のコミュニティイベントをご紹介します。',
    title: 'Soccerverse Grand Tournament のライブ配信に参加しよう',
    greeting: '{{first_name}}さん、こんにちは。',
    invitation: 'Soccerverse Grand Tournament のライブ配信にぜひご参加ください。',
    time: '<strong style="color:#f2efe7;">ベルリン時間 20:30（UTC 18:30）</strong>',
    results: 'Soccerverse、コミュニティイベントの最終結果、そして受賞者についてお話しします。',
    outlook: '今後のサイドゲームやコミュニティイベントについてもご紹介します。',
    cta: 'ライブ配信に参加する',
    closing: '配信でお会いできることを楽しみにしています！',
    signoff: 'The Grand Tournament チーム',
  },
}

function paragraph(text: string) {
  return `<p style="margin:0 0 16px;color:#c6d3ce;">${text}</p>`
}

function buildLivestreamResultsBody(copy: LivestreamResultsCopy) {
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.preheader}</div>
    <p style="margin:0 0 24px;text-align:center;"><img src="{{logo_url}}" alt="The Grand Tournament" width="220" style="display:inline-block;width:220px;max-width:70%;height:auto;"></p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#f2efe7;">${copy.title}</h1>
    ${paragraph(copy.greeting)}
    ${paragraph(copy.invitation)}
    ${paragraph(copy.time)}
    ${paragraph(copy.results)}
    ${paragraph(copy.outlook)}
    <p style="margin:24px 0;"><a href="${livestreamUrl}" style="display:inline-block;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;text-decoration:none;padding:14px 22px;">${copy.cta}</a></p>
    ${paragraph(copy.closing)}
    <p style="margin:0;color:#c6d3ce;">${copy.signoff}</p>
  `
}

const subjectByLocale = Object.fromEntries(
  Object.entries(livestreamResultsCopy).map(([locale, copy]) => [locale, copy.subject]),
) as Record<SupportedLocale, string>

const bodyHtmlByLocale = Object.fromEntries(
  Object.entries(livestreamResultsCopy).map(([locale, copy]) => [locale, buildLivestreamResultsBody(copy)]),
) as Record<SupportedLocale, string>

export const livestreamResultsEmailCampaign: EmailCampaignInput = {
  kind: 'newsletter',
  status: 'draft',
  triggerKey: 'manual',
  subject: subjectByLocale.en,
  bodyHtml: bodyHtmlByLocale.en,
  subjectByLocale,
  bodyHtmlByLocale,
  audienceStatus: 'active',
  audienceLeague: 'all',
  batchSize: 50,
  requiresMarketingOptIn: true,
}
