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

function getMagicLinkHtml(magicLinkUrl: string, frontendUrl: string): string {
  const logoUrl = `${frontendUrl}/logo.png`

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #fffdf5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fffdf5;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(198, 110, 36, 0.1), 0 2px 4px -1px rgba(198, 110, 36, 0.06);">
              <!-- Header -->
              <tr>
                <td style="background-color: #fee6b8; padding: 24px; border-radius: 16px 16px 0 0; border-bottom: 2px solid #f5c57d;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center">
                        <img src="${logoUrl}" alt="Pioum" width="80" height="80" style="display: block; border-radius: 12px;">
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-top: 12px;">
                        <span style="font-size: 28px; font-weight: 700; color: #c66e24;">Pioum</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 32px 24px;">
                  <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: #3d2517; text-align: center;">
                    Hey, on t'attendait !
                  </h1>
                  <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #6d3814; text-align: center;">
                    T'as demandé à monter dans la voiture ? Clique sur le lien pour rejoindre l'équipe et organiser tes trajets vers la salle.
                  </p>

                  <!-- Button -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center" style="padding: 8px 0 24px 0;">
                        <a href="${magicLinkUrl}"
                           style="display: inline-block; background: linear-gradient(135deg, #e8a855 0%, #d48d3a 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(198, 110, 36, 0.3);">
                          Monter dans la voiture
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #a85a1f; text-align: center;">
                    Ce lien magic link expire dans 15 minutes.<br>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 20px 24px; background-color: #fffbf5; border-radius: 0 0 16px 16px; border-top: 1px solid #fee6b8;">
                  <p style="margin: 0; font-size: 12px; color: #a85a1f; text-align: center; line-height: 1.5;">
                    Tu n'as pas demandé ce lien ? Pas de panique, ignore simplement cet email.<br>
                    Quelqu'un a peut-être confondu ton adresse avec la sienne.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Bottom tagline -->
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
              <tr>
                <td align="center">
                  <p style="margin: 0; font-size: 13px; color: #c66e24; font-weight: 500;">
                    Pioum — Qui vient ??
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
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

  const html = getMagicLinkHtml(magicLinkUrl, frontendUrl)

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
