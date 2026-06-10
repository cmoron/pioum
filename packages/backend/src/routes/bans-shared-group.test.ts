import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn() },
    ban: { findFirst: vi.fn(), create: vi.fn() },
    car: { findMany: vi.fn() },
    passenger: { updateMany: vi.fn() },
  },
}))

vi.mock('../notifications/notification.service.js', () => ({
  notifyUser: vi.fn().mockResolvedValue(undefined),
  validateNotificationConfig: vi.fn(),
  saveSubscription: vi.fn(),
  removeSubscription: vi.fn(),
}))

import { app } from '../index.js'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'

const mockUserFindFirst = vi.mocked(prisma.user.findFirst)
const mockUserFindUnique = vi.mocked(prisma.user.findUnique)
const mockBanFindFirst = vi.mocked(prisma.ban.findFirst)
const mockBanCreate = vi.mocked(prisma.ban.create)
const mockCarFindMany = vi.mocked(prisma.car.findMany)

const authHeader = `Bearer ${signToken({ userId: 'user-1' })}`

describe('POST /api/bans — restriction aux co-membres de groupe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBanFindFirst.mockResolvedValue(null)
    mockBanCreate.mockResolvedValue({
      id: 'ban-1',
      receiverId: 'user-2',
      receiver: { id: 'user-2', name: 'Bob' },
    } as never)
    mockCarFindMany.mockResolvedValue([] as never)
    mockUserFindUnique.mockResolvedValue(null)
  })

  it('refuse (404) de bannir un utilisateur ne partageant aucun groupe', async () => {
    mockUserFindFirst.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/bans')
      .set('Authorization', authHeader)
      .send({ receiverId: 'user-2', duration: '1d' })

    expect(res.status).toBe(404)
    expect(mockBanCreate).not.toHaveBeenCalled()
  })

  it('filtre le receveur sur les groupes partagés avec le bannisseur', async () => {
    mockUserFindFirst.mockResolvedValue(null)

    await request(app)
      .post('/api/bans')
      .set('Authorization', authHeader)
      .send({ receiverId: 'user-2', duration: '1d' })

    expect(mockUserFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'user-2',
          memberships: {
            some: {
              group: { members: { some: { userId: 'user-1' } } },
            },
          },
        }),
      }),
    )
  })

  it('autorise (201) le ban quand un groupe est partagé', async () => {
    mockUserFindFirst.mockResolvedValue({ id: 'user-2', name: 'Bob' } as never)

    const res = await request(app)
      .post('/api/bans')
      .set('Authorization', authHeader)
      .send({ receiverId: 'user-2', duration: '1d' })

    expect(res.status).toBe(201)
    expect(mockBanCreate).toHaveBeenCalled()
  })
})
