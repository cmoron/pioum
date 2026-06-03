import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'

vi.mock('../middleware/auth.js', () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { userId: 'admin-1' }
    next()
  },
}))

vi.mock('../middleware/requireAdmin.js', () => ({
  requireAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    avatar: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: { count: vi.fn() },
    userCar: { count: vi.fn() },
    group: { count: vi.fn() },
  },
}))

import { adminAvatarsRouter } from './adminAvatars.js'
import { errorHandler } from '../middleware/errorHandler.js'
import { prisma } from '../lib/prisma.js'

const mockAvatar = prisma.avatar as unknown as Record<string, ReturnType<typeof vi.fn>>
const mockCount = {
  user: prisma.user.count as unknown as ReturnType<typeof vi.fn>,
  userCar: prisma.userCar.count as unknown as ReturnType<typeof vi.fn>,
  group: prisma.group.count as unknown as ReturnType<typeof vi.fn>,
}

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/admin/avatars', adminAvatarsRouter)
  app.use(errorHandler)
  return app
}

describe('admin avatars routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('DELETE /:id refuses to delete an avatar still in use (409)', async () => {
    mockAvatar.findUnique.mockResolvedValue({ id: 'a1', imageUrl: '/avatars/users/x.webp' })
    mockCount.user.mockResolvedValue(2)
    mockCount.userCar.mockResolvedValue(1)
    mockCount.group.mockResolvedValue(0)

    const res = await request(makeApp()).delete('/api/admin/avatars/a1').expect(409)

    expect(res.body.code).toBe('AVATAR_IN_USE')
    expect(mockAvatar.delete).not.toHaveBeenCalled()
  })

  it('DELETE /:id deletes an unused avatar', async () => {
    mockAvatar.findUnique.mockResolvedValue({ id: 'a2', imageUrl: '/avatars/users/y.webp' })
    mockCount.user.mockResolvedValue(0)
    mockCount.userCar.mockResolvedValue(0)
    mockCount.group.mockResolvedValue(0)
    mockAvatar.delete.mockResolvedValue({})

    await request(makeApp()).delete('/api/admin/avatars/a2').expect(200)

    expect(mockAvatar.delete).toHaveBeenCalledWith({ where: { id: 'a2' } })
  })

  it('DELETE /:id returns 404 for an unknown avatar', async () => {
    mockAvatar.findUnique.mockResolvedValue(null)

    const res = await request(makeApp()).delete('/api/admin/avatars/nope').expect(404)
    expect(res.body.code).toBe('AVATAR_NOT_FOUND')
  })
})
