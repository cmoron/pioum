import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

export const usersRouter = Router()

const updateUserSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  avatarId: z.string().nullable().optional(),
  customAvatarUrl: z.string().url().nullable().optional()
})

// Get current user profile
usersRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { avatar: true }
    })

    if (!user) {
      throw new AppError(404, 'User not found')
    }

    res.json({ user })
  } catch (error) {
    next(error)
  }
})

// Update current user profile
usersRouter.patch('/me', authenticate, async (req, res, next) => {
  try {
    const data = updateUserSchema.parse(req.body)

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      include: { avatar: true }
    })

    res.json({ user })
  } catch (error) {
    next(error)
  }
})

// Get user by ID (for group members)
usersRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true,
        name: true,
        avatarId: true,
        customAvatarUrl: true,
        avatar: true
      }
    })

    if (!user) {
      throw new AppError(404, 'User not found')
    }

    res.json({ user })
  } catch (error) {
    next(error)
  }
})
