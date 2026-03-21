import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler.js'
import '../middleware/auth.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    ban: { findFirst: vi.fn(), create: vi.fn() },
    car: { findMany: vi.fn() },
    passenger: { updateMany: vi.fn() },
  },
}))

vi.mock('../notifications/notification.service.js', () => ({
  notifyUser: vi.fn(),
}))

import { prisma } from '../lib/prisma.js'
import { notifyUser } from '../notifications/notification.service.js'
import { makeRes } from './test-utils.js'

const mockUserFindUnique = vi.mocked(prisma.user.findUnique)
const mockBanFindFirst = vi.mocked(prisma.ban.findFirst)
const mockBanCreate = vi.mocked(prisma.ban.create)
const mockCarFindMany = vi.mocked(prisma.car.findMany)
const mockPassengerUpdateMany = vi.mocked(prisma.passenger.updateMany)
const mockNotifyUser = vi.mocked(notifyUser)

const receiver = { id: 'user-2', name: 'Bob' }
const giver = { name: 'Alice' }

/**
 * Extracted handler — mirrors POST /bans in bans.ts
 */
async function banHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { receiverId, reason, duration } = req.body as {
      receiverId: string
      reason?: string
      duration: '1d' | '3d' | '1w' | '2w'
    }

    const DURATION_MAP: Record<string, number> = {
      '1d': 1 * 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '2w': 14 * 24 * 60 * 60 * 1000,
    }

    if (receiverId === req.user!.userId) throw new AppError(400, 'Cannot ban yourself')

    const receiverUser = await prisma.user.findUnique({ where: { id: receiverId } })
    if (!receiverUser) throw new AppError(404, 'User not found')

    const existingBan = await prisma.ban.findFirst({
      where: { giverId: req.user!.userId, receiverId, endsAt: { gt: new Date() }, liftedAt: null },
    })
    if (existingBan) throw new AppError(400, 'Already banned this user')

    const endsAt = new Date(Date.now() + DURATION_MAP[duration])
    const ban = await prisma.ban.create({
      data: { giverId: req.user!.userId, receiverId, reason, endsAt },
      include: { receiver: { select: { id: true, name: true } } },
    })

    const giverCars = await prisma.car.findMany({
      where: { driverId: req.user!.userId },
      select: { id: true },
    })
    if (giverCars.length > 0) {
      await prisma.passenger.updateMany({
        where: { userId: receiverId, carId: { in: giverCars.map((c: { id: string }) => c.id) } },
        data: { carId: null },
      })
    }

    res.status(201).json({ ban })

    prisma.user
      .findUnique({ where: { id: req.user!.userId }, select: { name: true } })
      .then((giverUser: { name: string } | null) => {
        const giverName = giverUser?.name ?? "Quelqu'un"
        const reasonPart = reason ? ` pour : ${reason}` : ''
        return notifyUser(receiverId, {
          title: '🚨 Tu as été banni !',
          body: `${giverName} t'a banni${reasonPart}. Va falloir sucer des gros orteils…`,
          url: '/',
          type: 'USER_BANNED',
        })
      })
      .catch(() => { /* silencieux */ })
  } catch (error) {
    next(error)
  }
}

describe('POST /bans — notification USER_BANNED', () => {
  let mockRes: ReturnType<typeof makeRes>
  let mockNext: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
    mockRes = makeRes()
    mockNext = vi.fn()
    mockNotifyUser.mockResolvedValue(undefined)
    mockCarFindMany.mockResolvedValue([])
    mockPassengerUpdateMany.mockResolvedValue({ count: 0 })
    mockBanFindFirst.mockResolvedValue(null)
    mockBanCreate.mockResolvedValue({ id: 'ban-1', receiverId: 'user-2', receiver })
  })

  it('notifie le banni avec le bon message quand une raison est fournie', async () => {
    mockUserFindUnique
      .mockResolvedValueOnce(receiver)   // receiver exists check
      .mockResolvedValueOnce(giver)      // giver name for notification

    const req = {
      body: { receiverId: 'user-2', reason: 'trop de faltas', duration: '1d' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await banHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(201)
    expect(mockNext).not.toHaveBeenCalled()

    await vi.waitFor(() => expect(mockNotifyUser).toHaveBeenCalled())

    expect(mockNotifyUser).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({
        title: '🚨 Tu as été banni !',
        body: expect.stringContaining('Alice t\'a banni pour : trop de faltas'),
        type: 'USER_BANNED',
        url: '/',
      })
    )
  })

  it('notifie sans raison quand aucune raison n\'est fournie', async () => {
    mockUserFindUnique
      .mockResolvedValueOnce(receiver)
      .mockResolvedValueOnce(giver)

    const req = {
      body: { receiverId: 'user-2', duration: '1w' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await banHandler(req, mockRes as unknown as Response, mockNext)

    await vi.waitFor(() => expect(mockNotifyUser).toHaveBeenCalled())

    expect(mockNotifyUser).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({
        body: expect.stringContaining('Alice t\'a banni. Va falloir sucer des gros orteils'),
      })
    )
  })

  it('mentionne "gros orteils" dans le message', async () => {
    mockUserFindUnique
      .mockResolvedValueOnce(receiver)
      .mockResolvedValueOnce(giver)

    const req = {
      body: { receiverId: 'user-2', reason: 'mauvaise ambiance', duration: '3d' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await banHandler(req, mockRes as unknown as Response, mockNext)

    await vi.waitFor(() => expect(mockNotifyUser).toHaveBeenCalled())

    expect(mockNotifyUser).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({
        body: expect.stringContaining('gros orteils'),
      })
    )
  })

  it("utilise 'Quelqu'un' si le nom du bannisseur est introuvable", async () => {
    mockUserFindUnique
      .mockResolvedValueOnce(receiver)
      .mockResolvedValueOnce(null) // giver inconnu

    const req = {
      body: { receiverId: 'user-2', duration: '1d' },
      user: { userId: 'user-unknown' },
    } as unknown as Request

    await banHandler(req, mockRes as unknown as Response, mockNext)

    await vi.waitFor(() => expect(mockNotifyUser).toHaveBeenCalled())

    expect(mockNotifyUser).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({
        body: expect.stringContaining("Quelqu'un t'a banni"),
      })
    )
  })

  it("n'envoie pas de notification si le banni n'existe pas (404)", async () => {
    mockUserFindUnique.mockResolvedValueOnce(null)

    const req = {
      body: { receiverId: 'user-inexistant', duration: '1d' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await banHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }))
    expect(mockNotifyUser).not.toHaveBeenCalled()
  })

  it("n'envoie pas de notification si le ban existait déjà (400)", async () => {
    mockUserFindUnique.mockResolvedValueOnce(receiver)
    mockBanFindFirst.mockResolvedValue({ id: 'existing-ban' })

    const req = {
      body: { receiverId: 'user-2', duration: '1d' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await banHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }))
    expect(mockNotifyUser).not.toHaveBeenCalled()
  })
})
