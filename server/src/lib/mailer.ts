import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

function buildTransport() {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
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
  })
}

export async function sendVerificationMail(recipient: string, verificationUrl: string) {
  const safeUrl = escapeHtml(verificationUrl)
  const result = await sendAppMail({
    to: recipient,
    subject: 'Action Required: Confirm your Soccerverse World Cup Registration!',
    text: [
      'Welcome to the Soccerverse World Cup!',
      '',
      'You are just one click away from taking control of your favorite nations and players in the first truly decentralized football management tournament.',
      '',
      'Verify your registration here:',
      verificationUrl,
      '',
      'Once verified, you can start building your squad.',
      '',
      'See you on the pitch,',
      'the Soccerverse World Cup Team',
    ].join('\n'),
    html: `
      <div style="margin:0;padding:28px;background:#07100e;color:#f2efe7;font-family:Arial,sans-serif;line-height:1.55;">
        <div style="max-width:620px;margin:0 auto;border:1px solid rgba(242,239,231,0.16);border-radius:18px;padding:28px;background:#101815;">
          <h1 style="margin:0 0 18px;font-size:26px;line-height:1.2;color:#f2efe7;">Welcome to the Soccerverse World Cup!</h1>
          <p style="margin:0 0 18px;color:#c6d3ce;">You are just one click away from taking control of your favorite nations and players in the first truly decentralized football management tournament.</p>
          <p style="margin:0 0 16px;color:#c6d3ce;">Verify your registration here:</p>
          <p style="margin:0 0 24px;">
            <a href="${safeUrl}" style="display:inline-block;border-radius:999px;background:#22bd93;color:#07100e;font-weight:700;text-decoration:none;padding:14px 22px;">Verify Registration</a>
          </p>
          <p style="margin:0 0 18px;color:#c6d3ce;">Once verified, you can start building your squad.</p>
          <p style="margin:0;color:#c6d3ce;">See you on the pitch,<br>the Soccerverse World Cup Team</p>
          <p style="margin:24px 0 0;font-size:12px;color:#8fa39b;">If the button does not work, open this link: <a href="${safeUrl}" style="color:#22bd93;">${safeUrl}</a></p>
        </div>
      </div>
    `,
  })

  return result
}

export async function sendPasswordResetMail(recipient: string, resetUrl: string) {
  const result = await sendAppMail({
    to: recipient,
    subject: 'Reset your Soccerverse World Cup password',
    text: `Set a new password for your Soccerverse World Cup account: ${resetUrl}`,
    html: `<p>Set a new password for your Soccerverse World Cup account:</p><p><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>`,
  })

  return result
}
