import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import type { SupportedLocale } from '../domain/types.js'

function buildTransport() {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      pool: true,
      maxConnections: 1,
      maxMessages: Infinity,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    })
  }

  return nodemailer.createTransport({
    jsonTransport: true,
  })
}

const transport = buildTransport()

interface AppMailInput {
  to: string
  subject: string
  text: string
  html: string
  headers?: Record<string, string>
}

interface ActionMailCopy {
  subject: string
  title: string
  intro: string
  actionLabel: string
  after: string
  signoff: string
  linkHelp: string
}

const verificationCopy: Record<SupportedLocale, ActionMailCopy> = {
  en: {
    subject: 'Confirm your Soccerverse World Cup registration',
    title: 'Welcome to the Soccerverse World Cup!',
    intro:
      'You are one click away from taking control of your favorite nations and players in the Soccerverse World Cup community event.',
    actionLabel: 'Verify registration',
    after: 'Once verified, you can start building your squad.',
    signoff: 'See you on the pitch,\nthe Soccerverse World Cup Team',
    linkHelp: 'If the button does not work, open this link:',
  },
  es: {
    subject: 'Confirma tu registro en Soccerverse World Cup',
    title: '¡Bienvenido al Soccerverse World Cup!',
    intro: 'Estás a un clic de controlar tus naciones y jugadores favoritos en el evento comunitario Soccerverse World Cup.',
    actionLabel: 'Confirmar registro',
    after: 'Cuando confirmes el email, podrás empezar a crear tu plantilla.',
    signoff: 'Nos vemos en la cancha,\nel Soccerverse World Cup Team',
    linkHelp: 'Si el botón no funciona, abre este enlace:',
  },
  it: {
    subject: 'Conferma la registrazione al Soccerverse World Cup',
    title: 'Benvenuto al Soccerverse World Cup!',
    intro: 'Ti manca un solo clic per guidare le tue nazioni e i tuoi giocatori preferiti nell’evento community Soccerverse World Cup.',
    actionLabel: 'Conferma registrazione',
    after: 'Dopo la conferma dell’email potrai iniziare a costruire la tua rosa.',
    signoff: 'Ci vediamo in campo,\nil Soccerverse World Cup Team',
    linkHelp: 'Se il pulsante non funziona, apri questo link:',
  },
  de: {
    subject: 'Bestätige deine Soccerverse World Cup Registrierung',
    title: 'Willkommen beim Soccerverse World Cup!',
    intro: 'Du bist nur einen Klick davon entfernt, deine Lieblingsnationen und Spieler im Soccerverse World Cup Community Event zu übernehmen.',
    actionLabel: 'Registrierung bestätigen',
    after: 'Sobald du bestätigt bist, kannst du deinen Kader bauen.',
    signoff: 'Wir sehen uns auf dem Platz,\ndein Soccerverse World Cup Team',
    linkHelp: 'Falls der Button nicht funktioniert, öffne diesen Link:',
  },
  fr: {
    subject: 'Confirme ton inscription Soccerverse World Cup',
    title: 'Bienvenue au Soccerverse World Cup !',
    intro: 'Tu es à un clic de prendre le contrôle de tes nations et joueurs favoris dans l’événement communautaire Soccerverse World Cup.',
    actionLabel: 'Confirmer l’inscription',
    after: 'Une fois l’email confirmé, tu pourras commencer à construire ton effectif.',
    signoff: 'Rendez-vous sur le terrain,\nl’équipe Soccerverse World Cup',
    linkHelp: 'Si le bouton ne fonctionne pas, ouvre ce lien :',
  },
  pt: {
    subject: 'Confirma o teu registo no Soccerverse World Cup',
    title: 'Bem-vindo ao Soccerverse World Cup!',
    intro: 'Estás a um clique de controlar as tuas nações e jogadores favoritos no evento comunitário Soccerverse World Cup.',
    actionLabel: 'Confirmar registo',
    after: 'Depois de confirmares o email, podes começar a construir o teu plantel.',
    signoff: 'Vemo-nos em campo,\na Soccerverse World Cup Team',
    linkHelp: 'Se o botão não funcionar, abre este link:',
  },
  ru: {
    subject: 'Подтверди регистрацию Soccerverse World Cup',
    title: 'Добро пожаловать в Soccerverse World Cup!',
    intro: 'Один клик отделяет тебя от управления любимыми странами и игроками в community event Soccerverse World Cup.',
    actionLabel: 'Подтвердить регистрацию',
    after: 'После подтверждения email можно начинать собирать состав.',
    signoff: 'Увидимся на поле,\nкоманда Soccerverse World Cup',
    linkHelp: 'Если кнопка не работает, открой эту ссылку:',
  },
  zh: {
    subject: '确认你的 Soccerverse World Cup 注册',
    title: '欢迎参加 Soccerverse World Cup！',
    intro: '只差一次点击，你就可以在 Soccerverse World Cup 社区活动中管理自己喜欢的国家和球员。',
    actionLabel: '确认注册',
    after: '确认邮箱后，你就可以开始组建阵容。',
    signoff: '球场见，\nSoccerverse World Cup Team',
    linkHelp: '如果按钮无法使用，请打开此链接：',
  },
}

const passwordResetCopy: Record<SupportedLocale, ActionMailCopy> = {
  en: {
    subject: 'Reset your Soccerverse World Cup password',
    title: 'Set a new password',
    intro: 'Use this link to restore access to your Soccerverse World Cup account.',
    actionLabel: 'Set new password',
    after: 'If you did not request this, you can ignore this email.',
    signoff: 'the Soccerverse World Cup Team',
    linkHelp: 'If the button does not work, open this link:',
  },
  es: {
    subject: 'Restablece tu contraseña de Soccerverse World Cup',
    title: 'Configura una nueva contraseña',
    intro: 'Usa este enlace para recuperar el acceso a tu cuenta Soccerverse World Cup.',
    actionLabel: 'Crear nueva contraseña',
    after: 'Si no lo solicitaste, puedes ignorar este email.',
    signoff: 'el Soccerverse World Cup Team',
    linkHelp: 'Si el botón no funciona, abre este enlace:',
  },
  it: {
    subject: 'Reimposta la password del Soccerverse World Cup',
    title: 'Imposta una nuova password',
    intro: 'Usa questo link per recuperare l’accesso al tuo account Soccerverse World Cup.',
    actionLabel: 'Imposta nuova password',
    after: 'Se non hai richiesto tu questa email, puoi ignorarla.',
    signoff: 'il Soccerverse World Cup Team',
    linkHelp: 'Se il pulsante non funziona, apri questo link:',
  },
  de: {
    subject: 'Setze dein Soccerverse World Cup Passwort zurück',
    title: 'Neues Passwort setzen',
    intro: 'Nutze diesen Link, um den Zugang zu deinem Soccerverse World Cup Account wiederherzustellen.',
    actionLabel: 'Neues Passwort setzen',
    after: 'Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.',
    signoff: 'dein Soccerverse World Cup Team',
    linkHelp: 'Falls der Button nicht funktioniert, öffne diesen Link:',
  },
  fr: {
    subject: 'Réinitialise ton mot de passe Soccerverse World Cup',
    title: 'Définir un nouveau mot de passe',
    intro: 'Utilise ce lien pour récupérer l’accès à ton compte Soccerverse World Cup.',
    actionLabel: 'Définir le mot de passe',
    after: 'Si tu n’es pas à l’origine de cette demande, tu peux ignorer cet email.',
    signoff: 'l’équipe Soccerverse World Cup',
    linkHelp: 'Si le bouton ne fonctionne pas, ouvre ce lien :',
  },
  pt: {
    subject: 'Repõe a tua password do Soccerverse World Cup',
    title: 'Definir uma nova password',
    intro: 'Usa este link para recuperar o acesso à tua conta Soccerverse World Cup.',
    actionLabel: 'Definir nova password',
    after: 'Se não pediste isto, podes ignorar este email.',
    signoff: 'a Soccerverse World Cup Team',
    linkHelp: 'Se o botão não funcionar, abre este link:',
  },
  ru: {
    subject: 'Сброс пароля Soccerverse World Cup',
    title: 'Задай новый пароль',
    intro: 'Используй эту ссылку, чтобы восстановить доступ к аккаунту Soccerverse World Cup.',
    actionLabel: 'Задать новый пароль',
    after: 'Если ты не запрашивал это письмо, его можно проигнорировать.',
    signoff: 'команда Soccerverse World Cup',
    linkHelp: 'Если кнопка не работает, открой эту ссылку:',
  },
  zh: {
    subject: '重置你的 Soccerverse World Cup 密码',
    title: '设置新密码',
    intro: '使用此链接恢复你的 Soccerverse World Cup 账号访问。',
    actionLabel: '设置新密码',
    after: '如果这不是你发起的请求，可以忽略此邮件。',
    signoff: 'Soccerverse World Cup Team',
    linkHelp: '如果按钮无法使用，请打开此链接：',
  },
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function sendAppMail(input: AppMailInput) {
  return await transport.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    headers: input.headers,
  })
}

function buildActionMail(copy: ActionMailCopy, actionUrl: string) {
  const safeUrl = escapeHtml(actionUrl)
  const safeTitle = escapeHtml(copy.title)
  const safeIntro = escapeHtml(copy.intro)
  const safeActionLabel = escapeHtml(copy.actionLabel)
  const safeAfter = escapeHtml(copy.after)
  const safeSignoff = escapeHtml(copy.signoff).replaceAll('\n', '<br>')
  const safeLinkHelp = escapeHtml(copy.linkHelp)

  return {
    text: [copy.title, '', copy.intro, '', `${copy.actionLabel}:`, actionUrl, '', copy.after, '', copy.signoff].join('\n'),
    html: `
      <div style="margin:0;padding:28px;background:#07100e;color:#f2efe7;font-family:Arial,sans-serif;line-height:1.55;">
        <div style="max-width:620px;margin:0 auto;border:1px solid rgba(242,239,231,0.16);border-radius:18px;padding:28px;background:#101815;">
          <h1 style="margin:0 0 18px;font-size:26px;line-height:1.2;color:#f2efe7;">${safeTitle}</h1>
          <p style="margin:0 0 18px;color:#c6d3ce;">${safeIntro}</p>
          <p style="margin:0 0 24px;">
            <a href="${safeUrl}" style="display:inline-block;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;text-decoration:none;padding:14px 22px;">${safeActionLabel}</a>
          </p>
          <p style="margin:0 0 18px;color:#c6d3ce;">${safeAfter}</p>
          <p style="margin:0;color:#c6d3ce;">${safeSignoff}</p>
          <p style="margin:24px 0 0;font-size:12px;color:#8fa39b;">${safeLinkHelp} <a href="${safeUrl}" style="color:#22bd93;">${safeUrl}</a></p>
        </div>
      </div>
    `,
  }
}

export async function sendVerificationMail(recipient: string, verificationUrl: string, locale: SupportedLocale = 'en') {
  const copy = verificationCopy[locale] ?? verificationCopy.en
  const actionMail = buildActionMail(copy, verificationUrl)
  const result = await sendAppMail({
    to: recipient,
    subject: copy.subject,
    text: actionMail.text,
    html: actionMail.html,
  })

  return result
}

export async function sendPasswordResetMail(recipient: string, resetUrl: string, locale: SupportedLocale = 'en') {
  const copy = passwordResetCopy[locale] ?? passwordResetCopy.en
  const actionMail = buildActionMail(copy, resetUrl)
  const result = await sendAppMail({
    to: recipient,
    subject: copy.subject,
    text: actionMail.text,
    html: actionMail.html,
  })

  return result
}
