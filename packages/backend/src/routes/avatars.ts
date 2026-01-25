import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const avatarsRouter = Router()

// Get all avatars
avatarsRouter.get('/', async (_req, res, next) => {
  try {
    const avatars = await prisma.avatar.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    res.json({ avatars })
  } catch (error) {
    next(error)
  }
})

// Get avatars by category
avatarsRouter.get('/category/:category', async (req, res, next) => {
  try {
    const avatars = await prisma.avatar.findMany({
      where: { category: (req.params.category as string) },
      orderBy: { name: 'asc' }
    })

    res.json({ avatars })
  } catch (error) {
    next(error)
  }
})
