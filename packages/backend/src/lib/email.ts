import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined
})

export async function sendMagicLinkEmail(email: string, token: string): Promise<string | null> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const magicLinkUrl = `${frontendUrl}/auth/verify?token=${token}`

  // In development, just log the link and return it
  if (process.env.NODE_ENV !== 'production' || !process.env.SMTP_HOST) {
    console.log('='.repeat(50))
    console.log('MAGIC LINK FOR', email)
    console.log(magicLinkUrl)
    console.log('='.repeat(50))
    return magicLinkUrl // Return link for dev response
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Pioum <noreply@pioum.app>',
    to: email,
    subject: 'Connexion à Pioum',
    html: `
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
  })

  return null
}
