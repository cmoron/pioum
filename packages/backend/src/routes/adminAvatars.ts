import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { nanoid } from 'nanoid'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { AppError } from '../middleware/errorHandler.js'
import {
  AVATAR_UPLOADS_DIR,
  ALLOWED_AVATAR_MIME,
  MAX_AVATAR_BYTES,
  avatarFileUrl,
  deleteUploadedAvatar,
} from '../lib/uploads.js'

export const adminAvatarsRouter = Router()

adminAvatarsRouter.use(authenticate, requireAdmin)

const AVATAR_CATEGORIES = ['users', 'cars', 'groups'] as const

const createAvatarSchema = z.object({
  name: z.string().min(1).max(50),
  category: z.enum(AVATAR_CATEGORIES),
})

const updateAvatarSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  category: z.enum(AVATAR_CATEGORIES).optional(),
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AVATAR_MIME.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new AppError(400, "Type d'image non supporté (webp, png ou jpeg)", 'INVALID_FILE_TYPE'))
    }
  },
})

/** Wraps multer so its errors surface as AppErrors handled by the global errorHandler. */
function uploadAvatarImage(req: Request, res: Response, next: NextFunction) {
  upload.single('image')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(400, 'Image trop lourde (max 2 Mo)', 'FILE_TOO_LARGE'))
    }
    if (err) return next(err)
    next()
  })
}

async function persistAvatarImage(buffer: Buffer): Promise<string> {
  const key = nanoid(21)
  await fs.promises.writeFile(path.join(AVATAR_UPLOADS_DIR, key), buffer)
  return key
}

const usageSelect = {
  _count: { select: { users: true, userCars: true, groups: true } },
} as const

// List all avatars with usage counts (admin view)
adminAvatarsRouter.get('/', async (_req, res, next) => {
  try {
    const avatars = await prisma.avatar.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: usageSelect,
    })
    res.json({ avatars })
  } catch (error) {
    next(error)
  }
})

// Create an avatar from an uploaded image
adminAvatarsRouter.post('/', uploadAvatarImage, async (req, res, next) => {
  let storedKey: string | null = null
  try {
    const { name, category } = createAvatarSchema.parse(req.body)
    if (!req.file) {
      throw new AppError(400, 'Image requise', 'IMAGE_REQUIRED')
    }

    storedKey = await persistAvatarImage(req.file.buffer)
    const avatar = await prisma.avatar.create({
      data: {
        name,
        category,
        imageUrl: avatarFileUrl(storedKey),
        mimeType: req.file.mimetype,
      },
    })

    res.status(201).json({ avatar })
  } catch (error) {
    if (storedKey) await deleteUploadedAvatar(avatarFileUrl(storedKey))
    next(error)
  }
})

// Update an avatar's metadata and optionally replace its image
adminAvatarsRouter.patch('/:id', uploadAvatarImage, async (req, res, next) => {
  let storedKey: string | null = null
  try {
    const id = req.params.id as string
    const data = updateAvatarSchema.parse(req.body)

    const existing = await prisma.avatar.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Avatar introuvable', 'AVATAR_NOT_FOUND')
    }

    const patch: { name?: string; category?: string; imageUrl?: string; mimeType?: string } = {
      ...data,
    }
    if (req.file) {
      storedKey = await persistAvatarImage(req.file.buffer)
      patch.imageUrl = avatarFileUrl(storedKey)
      patch.mimeType = req.file.mimetype
    }

    const avatar = await prisma.avatar.update({ where: { id }, data: patch })

    // Replacement succeeded — drop the now-orphaned previous binary.
    if (req.file) await deleteUploadedAvatar(existing.imageUrl)

    res.json({ avatar })
  } catch (error) {
    if (storedKey) await deleteUploadedAvatar(avatarFileUrl(storedKey))
    next(error)
  }
})

// Delete an avatar, refusing if it is still referenced anywhere
adminAvatarsRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string

    const existing = await prisma.avatar.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Avatar introuvable', 'AVATAR_NOT_FOUND')
    }

    const [users, userCars, groups] = await Promise.all([
      prisma.user.count({ where: { avatarId: id } }),
      prisma.userCar.count({ where: { avatarId: id } }),
      prisma.group.count({ where: { avatarId: id } }),
    ])
    const total = users + userCars + groups

    if (total > 0) {
      throw new AppError(
        409,
        `Avatar utilisé par ${total} élément(s) — réassignez-les d'abord`,
        'AVATAR_IN_USE',
      )
    }

    await prisma.avatar.delete({ where: { id } })
    await deleteUploadedAvatar(existing.imageUrl)

    res.json({ message: 'Avatar supprimé' })
  } catch (error) {
    next(error)
  }
})
