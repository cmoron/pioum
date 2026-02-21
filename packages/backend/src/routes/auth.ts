import { Router } from 'express'
import { z } from 'zod'
import { OAuth2Client } from 'google-auth-library'
import { nanoid } from 'nanoid'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { AppError } from '../middleware/errorHandler.js'
import { sendMagicLinkEmail } from '../lib/email.js'

export const authRouter = Router()

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// Schemas
const googleAuthSchema = z.object({
  credential: z.string()
})

const magicLinkRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional()
})

const magicLinkVerifySchema = z.object({
  token: z.string()
})

// Google OAuth
authRouter.post('/google', async (req, res, next) => {
  try {
    const { credential } = googleAuthSchema.parse(req.body)

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      throw new AppError(400, 'Invalid Google token')
    }

    // Normalize email to lowercase to prevent duplicate accounts
    const normalizedEmail = payload.email.toLowerCase()

    let user = await prisma.user.findUnique({
      where: { googleId: payload.sub },
      include: { avatar: true }
    })

    if (!user) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      })

      if (userByEmail) {
        // User exists with this email (e.g., from magic link), but no googleId.
        // We need to link the googleId to their account.
        if (userByEmail.googleId) {
          // This should technically not be reached if the first check for googleId passed,
          // but as a safeguard: the email is linked to another google account.
          throw new AppError(409, 'Email already linked to another account.')
        }
        user = await prisma.user.update({
          where: { id: userByEmail.id },
          data: {
            googleId: payload.sub,
            // Update avatar from Google if not already set
            customAvatarUrl: userByEmail.customAvatarUrl || payload.picture
          },
          include: { avatar: true }
        })
      } else {
        // No user by googleId or email, create a new one.
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: payload.name || normalizedEmail.split('@')[0],
            googleId: payload.sub,
            customAvatarUrl: payload.picture
          },
          include: { avatar: true }
        })
      }
    }

    const token = signToken({ userId: user.id, email: user.email || undefined })

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    res.json({ user, token })
  } catch (error) {
    next(error)
  }
})

// Magic Link - Request
authRouter.post('/magic-link', async (req, res, next) => {
  try {
    const { email, name } = magicLinkRequestSchema.parse(req.body)

    // Normalize email to lowercase to prevent duplicate accounts
    const normalizedEmail = email.toLowerCase()

    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name || normalizedEmail.split('@')[0]
        }
      })
    }

    // Invalidate old magic links
    await prisma.magicLink.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    })

    // Create new magic link
    const token = nanoid(32)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await prisma.magicLink.create({
      data: {
        token,
        userId: user.id,
        email: normalizedEmail,
        expiresAt
      }
    })

    // Send email (returns link in dev mode)
    const devLink = await sendMagicLinkEmail(email, token)

    res.json({
      message: devLink ? 'Magic link generated (check console or use link below)' : 'Magic link sent',
      ...(devLink && { devLink }) // Include link in response for dev
    })
  } catch (error) {
    next(error)
  }
})

// Magic Link - Verify
authRouter.post('/magic-link/verify', async (req, res, next) => {
  try {
    const { token } = magicLinkVerifySchema.parse(req.body)

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: {
        user: {
          include: { avatar: true }
        }
      }
    })

    if (!magicLink) {
      throw new AppError(400, 'Invalid magic link', 'INVALID_MAGIC_LINK')
    }

    if (magicLink.usedAt) {
      throw new AppError(400, 'Magic link already used', 'MAGIC_LINK_USED')
    }

    if (magicLink.expiresAt < new Date()) {
      throw new AppError(400, 'Magic link expired', 'MAGIC_LINK_EXPIRED')
    }

    // Mark as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() }
    })

    const jwtToken = signToken({
      userId: magicLink.user.id,
      email: magicLink.user.email || undefined
    })

    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({ user: magicLink.user, token: jwtToken })
  } catch (error) {
    next(error)
  }
})

// Logout
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token')
  res.json({ message: 'Logged out' })
})

// DEV ONLY: Quick login with test user
// This route is only registered in development mode - it does not exist in production/staging
if (process.env.NODE_ENV === 'development') {
  authRouter.post('/dev-login', async (req, res, next) => {
    try {
      const { name } = z.object({ name: z.string().min(1) }).parse(req.body)
      const email = `${name.toLowerCase().replace(/\s+/g, '.')}@test.local`

      let user = await prisma.user.findUnique({
        where: { email },
        include: { avatar: true }
      })

      if (!user) {
        user = await prisma.user.create({
          data: { email, name },
          include: { avatar: true }
        })
        console.log(`[DEV] Created test user: ${name} (${email})`)
      } else {
        console.log(`[DEV] Logged in as: ${name} (${email})`)
      }

      const token = signToken({ userId: user.id, email: user.email || undefined })

      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })

      res.json({ user, token })
    } catch (error) {
      next(error)
    }
  })
}

// Get current user
authRouter.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const tokenFromCookie = req.cookies?.token

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : tokenFromCookie

    if (!token) {
      res.json({ user: null })
      return
    }

    const { verifyToken } = await import('../lib/jwt.js')
    const payload = verifyToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { avatar: true }
    })

    res.json({ user })
  } catch {
    res.json({ user: null })
  }
})