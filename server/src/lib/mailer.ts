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

export async function sendVerificationMail(recipient: string, verificationUrl: string) {
  const result = await transport.sendMail({
    from: env.SMTP_FROM,
    to: recipient,
    subject: 'Verify your Soccerverse World Cup registration',
    text: `Verify your registration: ${verificationUrl}`,
    html: `<p>Verify your registration:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
  })

  return result
}
