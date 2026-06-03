import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import { AVATAR_UPLOADS_DIR, avatarFileUrl } from '../lib/uploads.js'

export const avatarsRouter = Router()

// Serve an uploaded avatar binary. Public (consumed by <img>) and extension-less
// by design so nginx's static-asset regex never intercepts it before the backend.
avatarsRouter.get('/files/:key', async (req, res, next) => {
  try {
    const key = req.params.key as string
    if (!/^[A-Za-z0-9_-]+$/.test(key)) {
      throw new AppError(400, 'Invalid file key', 'INVALID_KEY')
    }

    const avatar = await prisma.avatar.findFirst({
      where: { imageUrl: avatarFileUrl(key) },
      select: { mimeType: true },
    })
    const filePath = path.join(AVATAR_UPLOADS_DIR, key)

    if (!avatar || !fs.existsSync(filePath)) {
      throw new AppError(404, 'Avatar introuvable', 'AVATAR_NOT_FOUND')
    }

    res.setHeader('Content-Type', avatar.mimeType || 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    fs.createReadStream(filePath).pipe(res)
  } catch (error) {
    next(error)
  }
})

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
