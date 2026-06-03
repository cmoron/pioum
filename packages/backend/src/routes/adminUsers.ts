import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { AppError } from '../middleware/errorHandler.js'

export const adminUsersRouter = Router()

adminUsersRouter.use(authenticate, requireAdmin)

const ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarId: true,
  customAvatarUrl: true,
  avatar: true,
  createdAt: true,
  _count: { select: { memberships: true } },
} as const

const updateUserSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  email: z.string().email().nullable().optional(),
  avatarId: z.string().nullable().optional(),
  role: z.enum(['user', 'admin']).optional(),
})

// List users with optional search on name/email
adminUsersRouter.get('/', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const users = await prisma.user.findMany({
      where,
      select: ADMIN_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    })

    res.json({ users })
  } catch (error) {
    next(error)
  }
})

// Update a user's profile / role
adminUsersRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string
    const data = updateUserSchema.parse(req.body)

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (!existing) {
      throw new AppError(404, 'Utilisateur introuvable', 'USER_NOT_FOUND')
    }

    // Prevent admins from locking themselves out.
    if (id === req.user!.userId && data.role === 'user') {
      throw new AppError(400, 'Vous ne pouvez pas retirer votre propre rôle admin', 'SELF_DEMOTE')
    }

    const email = data.email ? data.email.toLowerCase() : data.email
    if (email) {
      const clash = await prisma.user.findFirst({
        where: { email, id: { not: id } },
        select: { id: true },
      })
      if (clash) {
        throw new AppError(409, 'Email déjà utilisé', 'EMAIL_TAKEN')
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { ...data, ...(email !== undefined && { email }) },
      select: ADMIN_USER_SELECT,
    })

    res.json({ user })
  } catch (error) {
    next(error)
  }
})

// Delete a user (cascades handled by Prisma relations)
adminUsersRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string

    if (id === req.user!.userId) {
      throw new AppError(400, 'Vous ne pouvez pas supprimer votre propre compte ici', 'SELF_DELETE')
    }

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (!existing) {
      throw new AppError(404, 'Utilisateur introuvable', 'USER_NOT_FOUND')
    }

    await prisma.user.delete({ where: { id } })

    res.json({ message: 'Utilisateur supprimé' })
  } catch (error) {
    next(error)
  }
})
