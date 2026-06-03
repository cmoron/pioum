import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'

const ADMIN_ID = 'admin-1'

vi.mock('../middleware/auth.js', () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { userId: ADMIN_ID }
    next()
  },
}))

vi.mock('../middleware/requireAdmin.js', () => ({
  requireAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { adminUsersRouter } from './adminUsers.js'
import { errorHandler } from '../middleware/errorHandler.js'
import { prisma } from '../lib/prisma.js'

const mockUser = prisma.user as unknown as Record<string, ReturnType<typeof vi.fn>>

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/admin/users', adminUsersRouter)
  app.use(errorHandler)
  return app
}

describe('admin users routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET / searches name/email case-insensitively', async () => {
    mockUser.findMany.mockResolvedValue([])
    await request(makeApp()).get('/api/admin/users?q=bob').expect(200)

    expect(mockUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'bob', mode: 'insensitive' } },
            { email: { contains: 'bob', mode: 'insensitive' } },
          ],
        },
      }),
    )
  })

  it('PATCH /:id refuses self-demotion with 400 SELF_DEMOTE', async () => {
    mockUser.findUnique.mockResolvedValue({ id: ADMIN_ID })
    const res = await request(makeApp())
      .patch(`/api/admin/users/${ADMIN_ID}`)
      .send({ role: 'user' })
      .expect(400)

    expect(res.body.code).toBe('SELF_DEMOTE')
    expect(mockUser.update).not.toHaveBeenCalled()
  })

  it('PATCH /:id rejects a taken email with 409', async () => {
    mockUser.findUnique.mockResolvedValue({ id: 'other-2' })
    mockUser.findFirst.mockResolvedValue({ id: 'someone-else' })

    const res = await request(makeApp())
      .patch('/api/admin/users/other-2')
      .send({ email: 'Taken@Example.com' })
      .expect(409)

    expect(res.body.code).toBe('EMAIL_TAKEN')
    // email is normalised to lowercase before the uniqueness check
    expect(mockUser.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'taken@example.com', id: { not: 'other-2' } } }),
    )
  })

  it('DELETE /:id refuses self-deletion with 400 SELF_DELETE', async () => {
    const res = await request(makeApp())
      .delete(`/api/admin/users/${ADMIN_ID}`)
      .expect(400)

    expect(res.body.code).toBe('SELF_DELETE')
    expect(mockUser.delete).not.toHaveBeenCalled()
  })

  it('DELETE /:id removes another user', async () => {
    mockUser.findUnique.mockResolvedValue({ id: 'victim-9' })
    mockUser.delete.mockResolvedValue({})

    await request(makeApp()).delete('/api/admin/users/victim-9').expect(200)

    expect(mockUser.delete).toHaveBeenCalledWith({ where: { id: 'victim-9' } })
  })
})
