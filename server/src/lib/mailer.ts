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
    subject: 'Confirm your registration for The Grand Tournament',
    title: 'Welcome to The Grand Tournament!',
    intro:
      'You are one click away from taking control of your favorite nations and players in The Grand Tournament community event.',
    actionLabel: 'Verify registration',
    after: 'Once verified, you can start building your squad.',
    signoff: 'See you on the pitch,\nThe Grand Tournament Team',
    linkHelp: 'If the button does not work, open this link:',
  },
  es: {
    subject: 'Confirma tu registro para The Grand Tournament',
    title: '¡Bienvenido a The Grand Tournament!',
    intro: 'Estás a un clic de controlar tus naciones y jugadores favoritos en The Grand Tournament.',
    actionLabel: 'Confirmar registro',
    after: 'Cuando confirmes el email, podrás empezar a crear tu plantilla.',
    signoff: 'Nos vemos en la cancha,\nThe Grand Tournament Team',
    linkHelp: 'Si el botón no funciona, abre este enlace:',
  },
  it: {
    subject: 'Conferma la registrazione a The Grand Tournament',
    title: 'Benvenuto a The Grand Tournament!',
    intro: 'Ti manca un solo clic per guidare le tue nazioni e i tuoi giocatori preferiti in The Grand Tournament.',
    actionLabel: 'Conferma registrazione',
    after: 'Dopo la conferma dell’email potrai iniziare a costruire la tua rosa.',
    signoff: 'Ci vediamo in campo,\nThe Grand Tournament Team',
    linkHelp: 'Se il pulsante non funziona, apri questo link:',
  },
  de: {
    subject: 'Bestätige deine Registrierung für The Grand Tournament',
    title: 'Willkommen bei The Grand Tournament!',
    intro: 'Du bist nur einen Klick davon entfernt, deine Lieblingsnationen und Spieler bei The Grand Tournament zu übernehmen.',
    actionLabel: 'Registrierung bestätigen',
    after: 'Sobald du bestätigt bist, kannst du deinen Kader bauen.',
    signoff: 'Wir sehen uns auf dem Platz,\nThe Grand Tournament Team',
    linkHelp: 'Falls der Button nicht funktioniert, öffne diesen Link:',
  },
  fr: {
    subject: 'Confirme ton inscription à The Grand Tournament',
    title: 'Bienvenue à The Grand Tournament !',
    intro: 'Tu es à un clic de prendre le contrôle de tes nations et joueurs favoris dans The Grand Tournament.',
    actionLabel: 'Confirmer l’inscription',
    after: 'Une fois l’email confirmé, tu pourras commencer à construire ton effectif.',
    signoff: 'Rendez-vous sur le terrain,\nThe Grand Tournament Team',
    linkHelp: 'Si le bouton ne fonctionne pas, ouvre ce lien :',
  },
  pt: {
    subject: 'Confirma o teu registo em The Grand Tournament',
    title: 'Bem-vindo a The Grand Tournament!',
    intro: 'Estás a um clique de controlar as tuas nações e jogadores favoritos em The Grand Tournament.',
    actionLabel: 'Confirmar registo',
    after: 'Depois de confirmares o email, podes começar a construir o teu plantel.',
    signoff: 'Vemo-nos em campo,\nThe Grand Tournament Team',
    linkHelp: 'Se o botão não funcionar, abre este link:',
  },
  ru: {
    subject: 'Подтверди регистрацию The Grand Tournament',
    title: 'Добро пожаловать в The Grand Tournament!',
    intro: 'Один клик отделяет тебя от управления любимыми странами и игроками в community event The Grand Tournament.',
    actionLabel: 'Подтвердить регистрацию',
    after: 'После подтверждения email можно начинать собирать состав.',
    signoff: 'Увидимся на поле,\nThe Grand Tournament Team',
    linkHelp: 'Если кнопка не работает, открой эту ссылку:',
  },
  zh: {
    subject: '确认你的 The Grand Tournament 注册',
    title: '欢迎参加 The Grand Tournament！',
    intro: '只差一次点击，你就可以在 The Grand Tournament 社区活动中管理自己喜欢的国家和球员。',
    actionLabel: '确认注册',
    after: '确认邮箱后，你就可以开始组建阵容。',
    signoff: '球场见，\nThe Grand Tournament Team',
    linkHelp: '如果按钮无法使用，请打开此链接：',
  },
  ja: {
    subject: 'The Grand Tournament 登録を確認してください',
    title: 'The Grand Tournament へようこそ！',
    intro: 'あと1クリックで、The Grand Tournament コミュニティイベントでお気に入りの国と選手を管理できます。',
    actionLabel: '登録を確認',
    after: '確認が完了すると、スカッド作成を開始できます。',
    signoff: 'ピッチで会いましょう,\nThe Grand Tournament Team',
    linkHelp: 'ボタンが動作しない場合は、このリンクを開いてください:',
  },
}

const passwordResetCopy: Record<SupportedLocale, ActionMailCopy> = {
  en: {
    subject: 'Reset your Grand Tournament password',
    title: 'Set a new password',
    intro: 'Use this link to restore access to your Grand Tournament account.',
    actionLabel: 'Set new password',
    after: 'If you did not request this, you can ignore this email.',
    signoff: 'The Grand Tournament Team',
    linkHelp: 'If the button does not work, open this link:',
  },
  es: {
    subject: 'Restablece tu contraseña para The Grand Tournament',
    title: 'Configura una nueva contraseña',
    intro: 'Usa este enlace para recuperar el acceso a tu cuenta The Grand Tournament.',
    actionLabel: 'Crear nueva contraseña',
    after: 'Si no lo solicitaste, puedes ignorar este email.',
    signoff: 'The Grand Tournament Team',
    linkHelp: 'Si el botón no funciona, abre este enlace:',
  },
  it: {
    subject: 'Reimposta la password di The Grand Tournament',
    title: 'Imposta una nuova password',
    intro: 'Usa questo link per recuperare l’accesso al tuo account The Grand Tournament.',
    actionLabel: 'Imposta nuova password',
    after: 'Se non hai richiesto tu questa email, puoi ignorarla.',
    signoff: 'The Grand Tournament Team',
    linkHelp: 'Se il pulsante non funziona, apri questo link:',
  },
  de: {
    subject: 'Setze dein Passwort für The Grand Tournament zurück',
    title: 'Neues Passwort setzen',
    intro: 'Nutze diesen Link, um den Zugang zu deinem Konto für The Grand Tournament wiederherzustellen.',
    actionLabel: 'Neues Passwort setzen',
    after: 'Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.',
    signoff: 'The Grand Tournament Team',
    linkHelp: 'Falls der Button nicht funktioniert, öffne diesen Link:',
  },
  fr: {
    subject: 'Réinitialise ton mot de passe The Grand Tournament',
    title: 'Définir un nouveau mot de passe',
    intro: 'Utilise ce lien pour récupérer l’accès à ton compte The Grand Tournament.',
    actionLabel: 'Définir le mot de passe',
    after: 'Si tu n’es pas à l’origine de cette demande, tu peux ignorer cet email.',
    signoff: 'The Grand Tournament Team',
    linkHelp: 'Si le bouton ne fonctionne pas, ouvre ce lien :',
  },
  pt: {
    subject: 'Repõe a tua password de The Grand Tournament',
    title: 'Definir uma nova password',
    intro: 'Usa este link para recuperar o acesso à tua conta The Grand Tournament.',
    actionLabel: 'Definir nova password',
    after: 'Se não pediste isto, podes ignorar este email.',
    signoff: 'The Grand Tournament Team',
    linkHelp: 'Se o botão não funcionar, abre este link:',
  },
  ru: {
    subject: 'Сброс пароля The Grand Tournament',
    title: 'Задай новый пароль',
    intro: 'Используй эту ссылку, чтобы восстановить доступ к аккаунту The Grand Tournament.',
    actionLabel: 'Задать новый пароль',
    after: 'Если ты не запрашивал это письмо, его можно проигнорировать.',
    signoff: 'The Grand Tournament Team',
    linkHelp: 'Если кнопка не работает, открой эту ссылку:',
  },
  zh: {
    subject: '重置你的 The Grand Tournament 密码',
    title: '设置新密码',
    intro: '使用此链接恢复你的 The Grand Tournament 账号访问。',
    actionLabel: '设置新密码',
    after: '如果这不是你发起的请求，可以忽略此邮件。',
    signoff: 'The Grand Tournament Team',
    linkHelp: '如果按钮无法使用，请打开此链接：',
  },
  ja: {
    subject: 'The Grand Tournament パスワードをリセット',
    title: '新しいパスワードを設定',
    intro: 'このリンクを使って The Grand Tournament アカウントへのアクセスを復旧してください。',
    actionLabel: '新しいパスワードを設定',
    after: 'この操作に心当たりがない場合は、このメールを無視してください。',
    signoff: 'The Grand Tournament Team',
    linkHelp: 'ボタンが動作しない場合は、このリンクを開いてください:',
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
