import { Resend } from 'resend'
import nodemailer from 'nodemailer'

// Resend client (preferred for production)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Nodemailer fallback for SMTP
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined
    })
  : null

function getMagicLinkHtml(magicLinkUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">Pioum</h1>
      <p>Clique sur le bouton ci-dessous pour te connecter :</p>
      <a href="${magicLinkUrl}"
         style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
        Se connecter
      </a>
      <p style="color: #666; font-size: 14px;">
        Ce lien expire dans 15 minutes.<br>
        Si tu n'as pas demandé ce lien, ignore cet email.
      </p>
    </div>
  `
}

export async function sendMagicLinkEmail(email: string, token: string): Promise<string | null> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const magicLinkUrl = `${frontendUrl}/auth/verify?token=${token}`
  const fromAddress = process.env.EMAIL_FROM || 'Pioum <noreply@pioum.app>'

  // In development without email configured, log and return the link
  if (process.env.NODE_ENV !== 'production' && !resend && !transporter) {
    console.log('='.repeat(50))
    console.log('MAGIC LINK FOR', email)
    console.log(magicLinkUrl)
    console.log('='.repeat(50))
    return magicLinkUrl
  }

  const html = getMagicLinkHtml(magicLinkUrl)

  // Use Resend if available (preferred)
  if (resend) {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: 'Connexion à Pioum',
      html
    })
    if (error) {
      console.error('Resend error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }
    console.log(`Magic link sent to ${email} via Resend`)
    return null
  }

  // Fallback to SMTP
  if (transporter) {
    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: 'Connexion à Pioum',
      html
    })
    console.log(`Magic link sent to ${email} via SMTP`)
    return null
  }

  // No email provider configured in production
  console.error('No email provider configured (RESEND_API_KEY or SMTP_HOST required)')
  throw new Error('Email service not configured')
}
