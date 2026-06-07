import type { EmailCampaignInput, SupportedLocale } from '../domain/types.js'

interface SquadSubmissionReminderCopy {
  subject: string
  preheader: string
  title: string
  greeting: string
  reminder: string
  status: string
  cta: string
  requestIntro: string
  referralQuestion: string
  builderBeforeLink: string
  builderLinkLabel: string
  builderAfterLink: string
  prizePool: string
  goodLuck: string
  signoff: string
}

const squadSubmissionReminderCopy: Record<SupportedLocale, SquadSubmissionReminderCopy> = {
  en: {
    subject: '⚽️ Submit your squad and secure your points',
    preheader: 'One in four participants has not submitted their squad yet. Check now that everything has been sent.',
    title: 'Submit your squad and secure your points',
    greeting: 'Hi tournament participant,',
    reminder:
      'A quick reminder: If you fully build your squad but do not submit it, you will score no points.',
    status:
      'Please make sure your squad has really been submitted. Around 25% of participants have not submitted their squad yet.',
    cta: 'Submit squad now',
    requestIntro: 'One more request: This tournament lives through recommendations.',
    referralQuestion: 'Do you know one person who absolutely should join? Then let them know.',
    builderBeforeLink: 'In the ',
    builderLinkLabel: 'Builder',
    builderAfterLink:
      ' you will find a social sharing feature that makes it quick and easy to share the tournament.',
    prizePool: 'Together we can unlock the full prize pool.',
    goodLuck: 'Good luck',
    signoff: 'Your Soccerverse Community Event Team',
  },
  es: {
    subject: '⚽️ Envía tu plantilla y asegura tus puntos',
    preheader: 'Uno de cada cuatro participantes aún no ha enviado su plantilla. Comprueba ahora que todo esté enviado.',
    title: 'Envía tu plantilla y asegura tus puntos',
    greeting: 'Hola participante del torneo,',
    reminder:
      'Un breve recordatorio: Si completas tu plantilla pero no la envías, no sumarás puntos.',
    status:
      'Asegúrate de que tu plantilla se haya enviado de verdad. Actualmente, alrededor del 25% de los participantes aún no ha enviado su plantilla.',
    cta: 'Enviar plantilla ahora',
    requestIntro: 'Una petición más: este torneo vive de las recomendaciones.',
    referralQuestion: '¿Conoces a una persona que debería participar sí o sí? Entonces avísale.',
    builderBeforeLink: 'En el ',
    builderLinkLabel: 'Builder',
    builderAfterLink:
      ' encontrarás una función de social sharing que facilita compartir el torneo de forma rápida y sencilla.',
    prizePool: 'Juntos podemos desbloquear el premio total.',
    goodLuck: 'Mucha suerte',
    signoff: 'Tu Soccerverse Community Event Team',
  },
  it: {
    subject: '⚽️ Invia la tua rosa e assicurati i punti',
    preheader: 'Un partecipante su quattro non ha ancora inviato la propria rosa. Controlla ora che sia tutto inviato.',
    title: 'Invia la tua rosa e assicurati i punti',
    greeting: 'Ciao partecipante del torneo,',
    reminder:
      'Un breve promemoria: se completi la tua rosa ma non la invii, non otterrai punti.',
    status:
      'Assicurati che la tua rosa sia stata davvero inviata. Al momento circa il 25% dei partecipanti non ha ancora inviato la propria rosa.',
    cta: 'Invia la rosa ora',
    requestIntro: 'Un’altra richiesta: questo torneo vive di passaparola.',
    referralQuestion: 'Conosci una persona che dovrebbe assolutamente partecipare? Allora faglielo sapere.',
    builderBeforeLink: 'Nel ',
    builderLinkLabel: 'Builder',
    builderAfterLink:
      ' trovi una funzione di social sharing che rende veloce e semplice condividere il torneo.',
    prizePool: 'Insieme possiamo sbloccare il montepremi completo.',
    goodLuck: 'Buona fortuna',
    signoff: 'Il tuo Soccerverse Community Event Team',
  },
  de: {
    subject: '⚽️ Kader absenden und Punkte sichern',
    preheader: 'Jeder vierte Teilnehmer hat seinen Kader noch nicht eingereicht. Prüfe jetzt, ob alles übermittelt ist.',
    title: 'Kader absenden und Punkte sichern',
    greeting: 'Hallo liebe Turnier-Teilnehmer,',
    reminder:
      'eine kurze Erinnerung: Wenn Du Deinen Kader vollständig zusammenstellst, ihn aber nicht einreichst, erzielst Du keine Punkte.',
    status:
      'Bitte stelle sicher, dass Dein Kader wirklich übermittelt wurde. Aktuell haben rund 25 % der Teilnehmenden ihren Kader noch nicht abgesendet.',
    cta: 'Kader jetzt einreichen',
    requestIntro: 'Noch eine Bitte: Dieses Turnier lebt von Weiterempfehlungen.',
    referralQuestion: 'Kennst Du eine Person, die unbedingt mitmachen sollte? Dann lass es sie wissen.',
    builderBeforeLink: 'Im ',
    builderLinkLabel: 'Builder',
    builderAfterLink:
      ' findest Du eine Social-Sharing-Funktion, mit der Du das Turnier schnell und einfach teilen kannst.',
    prizePool: 'Gemeinsam schaffen wir es, den vollständigen Preispool freizuschalten!',
    goodLuck: 'Viel Erfolg',
    signoff: 'Dein Soccerverse Community Event Team',
  },
  fr: {
    subject: '⚽️ Soumets ton effectif et assure tes points',
    preheader: 'Un participant sur quatre n’a pas encore soumis son effectif. Vérifie maintenant que tout est bien envoyé.',
    title: 'Soumets ton effectif et assure tes points',
    greeting: 'Bonjour participant du tournoi,',
    reminder:
      'Petit rappel : si tu composes entièrement ton effectif mais que tu ne le soumets pas, tu ne marqueras aucun point.',
    status:
      'Assure-toi que ton effectif a bien été soumis. Actuellement, environ 25% des participants n’ont pas encore soumis leur effectif.',
    cta: 'Soumettre mon effectif',
    requestIntro: 'Encore une demande : ce tournoi vit grâce aux recommandations.',
    referralQuestion: 'Tu connais une personne qui devrait absolument participer ? Alors fais-lui savoir.',
    builderBeforeLink: 'Dans le ',
    builderLinkLabel: 'Builder',
    builderAfterLink:
      ' tu trouveras une fonction de partage social qui permet de partager le tournoi rapidement et facilement.',
    prizePool: 'Ensemble, nous pouvons débloquer la cagnotte complète.',
    goodLuck: 'Bonne chance',
    signoff: 'Ton Soccerverse Community Event Team',
  },
  pt: {
    subject: '⚽️ Submete o teu plantel e garante os teus pontos',
    preheader: 'Um em cada quatro participantes ainda não submeteu o plantel. Confirma agora que está tudo enviado.',
    title: 'Submete o teu plantel e garante os teus pontos',
    greeting: 'Olá participante do torneio,',
    reminder:
      'Um breve lembrete: se completares o teu plantel mas não o submeteres, não vais somar pontos.',
    status:
      'Confirma que o teu plantel foi realmente submetido. Atualmente, cerca de 25% dos participantes ainda não submeteu o plantel.',
    cta: 'Submeter plantel agora',
    requestIntro: 'Mais um pedido: este torneio vive de recomendações.',
    referralQuestion: 'Conheces uma pessoa que devia mesmo participar? Então avisa-a.',
    builderBeforeLink: 'No ',
    builderLinkLabel: 'Builder',
    builderAfterLink:
      ' encontras uma função de social sharing que torna rápido e simples partilhar o torneio.',
    prizePool: 'Juntos conseguimos desbloquear a bolsa de prémios completa.',
    goodLuck: 'Boa sorte',
    signoff: 'A tua Soccerverse Community Event Team',
  },
  ru: {
    subject: '⚽️ Отправь состав и закрепи свои очки',
    preheader: 'Каждый четвертый участник еще не отправил состав. Проверь, что все действительно отправлено.',
    title: 'Отправь состав и закрепи свои очки',
    greeting: 'Привет, участник турнира,',
    reminder:
      'Короткое напоминание: если ты полностью собрал состав, но не отправил его, очки начисляться не будут.',
    status:
      'Пожалуйста, убедись, что твой состав действительно отправлен. Сейчас около 25% участников еще не отправили состав.',
    cta: 'Отправить состав сейчас',
    requestIntro: 'Еще одна просьба: этот турнир живет благодаря рекомендациям.',
    referralQuestion: 'Знаешь человека, которому точно стоит участвовать? Расскажи ему.',
    builderBeforeLink: 'В ',
    builderLinkLabel: 'Builder',
    builderAfterLink:
      ' есть функция social sharing, с которой можно быстро и просто поделиться турниром.',
    prizePool: 'Вместе мы сможем разблокировать полный призовой фонд.',
    goodLuck: 'Удачи',
    signoff: 'Твоя Soccerverse Community Event Team',
  },
  zh: {
    subject: '⚽️ 提交阵容，确保获得积分',
    preheader: '四分之一的参赛者尚未提交阵容。现在确认是否已成功提交。',
    title: '提交阵容，确保获得积分',
    greeting: '你好，锦标赛参赛者，',
    reminder:
      '快速提醒：如果你已经完整组建阵容，但没有提交，你将无法获得积分。',
    status:
      '请确认你的阵容确实已经提交。目前约有 25% 的参赛者还没有提交阵容。',
    cta: '立即提交阵容',
    requestIntro: '还有一个请求：这个锦标赛依靠大家的推荐成长。',
    referralQuestion: '你认识一位绝对应该参加的人吗？那就告诉对方吧。',
    builderBeforeLink: '在 ',
    builderLinkLabel: 'Builder',
    builderAfterLink: ' 中有社交分享功能，可以让你快速、轻松地分享这个锦标赛。',
    prizePool: '一起努力，我们就能解锁完整奖池。',
    goodLuck: '祝你好运',
    signoff: '你的 Soccerverse Community Event Team',
  },
  ja: {
    subject: '⚽️ スカッドを送信してポイントを確保',
    preheader: '参加者の4人に1人がまだスカッドを送信していません。正しく送信済みか確認してください。',
    title: 'スカッドを送信してポイントを確保',
    greeting: 'トーナメント参加者の皆さん、',
    reminder:
      '短いリマインダーです。スカッドを完成させても送信していない場合、ポイントは入りません。',
    status:
      'スカッドが本当に送信済みになっているか確認してください。現在、参加者の約25%がまだスカッドを送信していません。',
    cta: '今すぐスカッドを送信',
    requestIntro: 'もう一つお願いがあります。このトーナメントは紹介によって広がっています。',
    referralQuestion: '絶対に参加すべき人を1人知っていますか？ぜひ知らせてください。',
    builderBeforeLink: '',
    builderLinkLabel: 'Builder',
    builderAfterLink:
      'には、このトーナメントをすばやく簡単に共有できるソーシャル共有機能があります。',
    prizePool: '一緒に完全な賞金プールを解放しましょう。',
    goodLuck: '幸運を祈ります',
    signoff: 'Soccerverse Community Event Team',
  },
}

function paragraph(text: string) {
  return `<p style="margin:0 0 16px;color:#c6d3ce;">${text}</p>`
}

function buildSquadSubmissionReminderBody(copy: SquadSubmissionReminderCopy) {
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.preheader}</div>
    <p style="margin:0 0 24px;text-align:center;"><img src="{{logo_url}}" alt="The Grand Tournament" width="220" style="display:inline-block;width:220px;max-width:70%;height:auto;"></p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#f2efe7;">${copy.title}</h1>
    ${paragraph(copy.greeting)}
    ${paragraph(copy.reminder)}
    ${paragraph(copy.status)}
    <p style="margin:0 0 24px;"><a href="{{builder_url}}" style="display:inline-block;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;text-decoration:none;padding:14px 22px;">${copy.cta}</a></p>
    ${paragraph(copy.requestIntro)}
    ${paragraph(copy.referralQuestion)}
    <p style="margin:0 0 22px;color:#c6d3ce;">${copy.builderBeforeLink}<a href="{{builder_url}}" style="color:#22bd93;font-weight:700;text-decoration:none;">${copy.builderLinkLabel}</a>${copy.builderAfterLink}</p>
    <p style="margin:0 0 24px;color:#c6d3ce;">${copy.prizePool}</p>
    <p style="margin:0 0 4px;color:#c6d3ce;">${copy.goodLuck}</p>
    <p style="margin:0;color:#c6d3ce;">${copy.signoff}</p>
  `
}

const squadSubmissionReminderSubject: Record<SupportedLocale, string> = Object.fromEntries(
  Object.entries(squadSubmissionReminderCopy).map(([locale, copy]) => [locale, copy.subject]),
) as Record<SupportedLocale, string>

const squadSubmissionReminderBody: Record<SupportedLocale, string> = Object.fromEntries(
  Object.entries(squadSubmissionReminderCopy).map(([locale, copy]) => [
    locale,
    buildSquadSubmissionReminderBody(copy),
  ]),
) as Record<SupportedLocale, string>

export const squadSubmissionReminderEmailCampaign: EmailCampaignInput = {
  kind: 'newsletter',
  status: 'scheduled',
  triggerKey: 'manual',
  subject: squadSubmissionReminderSubject.en,
  bodyHtml: squadSubmissionReminderBody.en,
  subjectByLocale: squadSubmissionReminderSubject,
  bodyHtmlByLocale: squadSubmissionReminderBody,
  audienceStatus: 'active',
  audienceLeague: 'all',
  scheduledAt: '2026-06-08T05:00:00.000Z',
  batchSize: 50,
  requiresMarketingOptIn: true,
}
