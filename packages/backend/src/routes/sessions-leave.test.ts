import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler.js'
import '../middleware/auth.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    passenger: { findUnique: vi.fn(), delete: vi.fn() },
    car: { findUnique: vi.fn(), deleteMany: vi.fn() },
    user: { findUnique: vi.fn() },
    session: { findUnique: vi.fn() },
  },
}))

vi.mock('../notifications/notification.service.js', () => ({
  notifyGroupMembers: vi.fn(),
}))

import { prisma } from '../lib/prisma.js'
import { notifyGroupMembers } from '../notifications/notification.service.js'
import { makeRes } from './test-utils.js'
import { formatSessionDate } from '../lib/formatDate.js'

const mockPassengerFindUnique = vi.mocked(prisma.passenger.findUnique)
const mockPassengerDelete = vi.mocked(prisma.passenger.delete)
const mockCarFindUnique = vi.mocked(prisma.car.findUnique)
const mockCarDeleteMany = vi.mocked(prisma.car.deleteMany)
const mockUserFindUnique = vi.mocked(prisma.user.findUnique)
const mockSessionFindUnique = vi.mocked(prisma.session.findUnique)
const mockNotifyGroupMembers = vi.mocked(notifyGroupMembers)

const sessionDate = new Date(2026, 2, 21) // 21 mars 2026 (local time)

const existingPassenger = { id: 'passenger-1' }
const existingCar = { id: 'car-1' }
const sessionInfo = { date: sessionDate, groupId: 'group-1' }

/**
 * Extracted handler — mirrors DELETE /sessions/:id/leave in sessions.ts
 */
async function leaveHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionId = req.params.id

    const passenger = await prisma.passenger.findUnique({
      where: { sessionId_userId: { sessionId, userId: req.user!.userId } },
    })
    if (!passenger) throw new AppError(404, 'Not participating in this session')

    const driverCar = await prisma.car.findUnique({
      where: { sessionId_driverId: { sessionId, driverId: req.user!.userId } },
    })

    await prisma.car.deleteMany({ where: { sessionId, driverId: req.user!.userId } })
    await prisma.passenger.delete({ where: { id: passenger.id } })

    res.json({ message: 'Left session' })

    // Fire-and-forget notification uniquement si l'utilisateur était chauffeur
    if (driverCar) {
      Promise.all([
        prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true } }),
        prisma.session.findUnique({ where: { id: sessionId }, select: { date: true, groupId: true } }),
      ])
        .then(([driver, session]) => {
          if (!session) return
          const driverName = driver?.name ?? 'Le chauffeur'
          return notifyGroupMembers(session.groupId, req.user!.userId, {
            title: "🚨 Un chauffeur s'est désisté !",
            body: `${driverName} s'est désisté de la séance du ${formatSessionDate(session.date)}, pas fiable le golem…`,
            url: `/groups/${session.groupId}`,
            type: 'DRIVER_LEFT',
          })
        })
        .catch(() => { /* silencieux en production */ })
    }
  } catch (error) {
    next(error)
  }
}

describe('DELETE /sessions/:id/leave — notification DRIVER_LEFT', () => {
  let mockRes: ReturnType<typeof makeRes>
  let mockNext: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
    mockRes = makeRes()
    mockNext = vi.fn()
    mockNotifyGroupMembers.mockResolvedValue(undefined)
    mockPassengerDelete.mockResolvedValue({})
    mockCarDeleteMany.mockResolvedValue({ count: 0 })
  })

  it('envoie DRIVER_LEFT avec le bon message quand le chauffeur quitte la séance', async () => {
    mockPassengerFindUnique.mockResolvedValue(existingPassenger)
    mockCarFindUnique.mockResolvedValue(existingCar) // user avait une voiture
    mockUserFindUnique.mockResolvedValue({ name: 'Alice' })
    mockSessionFindUnique.mockResolvedValue(sessionInfo)

    const req = {
      params: { id: 'session-1' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await leaveHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Left session' })
    expect(mockNext).not.toHaveBeenCalled()

    await vi.waitFor(() => expect(mockNotifyGroupMembers).toHaveBeenCalled())

    expect(mockNotifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      'user-1',
      expect.objectContaining({
        title: "🚨 Un chauffeur s'est désisté !",
        body: expect.stringContaining("Alice s'est désisté"),
        type: 'DRIVER_LEFT',
        url: '/groups/group-1',
      })
    )
  })

  it("mentionne 'pas fiable le golem' dans le message", async () => {
    mockPassengerFindUnique.mockResolvedValue(existingPassenger)
    mockCarFindUnique.mockResolvedValue(existingCar)
    mockUserFindUnique.mockResolvedValue({ name: 'Bob' })
    mockSessionFindUnique.mockResolvedValue(sessionInfo)

    const req = {
      params: { id: 'session-1' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await leaveHandler(req, mockRes as unknown as Response, mockNext)

    await vi.waitFor(() => expect(mockNotifyGroupMembers).toHaveBeenCalled())

    expect(mockNotifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      'user-1',
      expect.objectContaining({
        body: expect.stringContaining('pas fiable le golem'),
      })
    )
  })

  it("n'envoie PAS de notification quand un simple passager (sans voiture) quitte la séance", async () => {
    mockPassengerFindUnique.mockResolvedValue(existingPassenger)
    mockCarFindUnique.mockResolvedValue(null) // pas de voiture

    const req = {
      params: { id: 'session-1' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await leaveHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Left session' })

    // Laisser un tick pour s'assurer que la notif n'est pas envoyée en différé
    await new Promise((r) => setTimeout(r, 10))
    expect(mockNotifyGroupMembers).not.toHaveBeenCalled()
  })

  it("utilise 'Le chauffeur' si le nom de l'utilisateur est introuvable", async () => {
    mockPassengerFindUnique.mockResolvedValue(existingPassenger)
    mockCarFindUnique.mockResolvedValue(existingCar)
    mockUserFindUnique.mockResolvedValue(null) // user inconnu
    mockSessionFindUnique.mockResolvedValue(sessionInfo)

    const req = {
      params: { id: 'session-1' },
      user: { userId: 'user-unknown' },
    } as unknown as Request

    await leaveHandler(req, mockRes as unknown as Response, mockNext)

    await vi.waitFor(() => expect(mockNotifyGroupMembers).toHaveBeenCalled())

    expect(mockNotifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      'user-unknown',
      expect.objectContaining({
        body: expect.stringContaining("Le chauffeur s'est désisté"),
      })
    )
  })

  it("n'envoie pas de notification si la session est introuvable après le départ", async () => {
    mockPassengerFindUnique.mockResolvedValue(existingPassenger)
    mockCarFindUnique.mockResolvedValue(existingCar)
    mockUserFindUnique.mockResolvedValue({ name: 'Alice' })
    mockSessionFindUnique.mockResolvedValue(null) // session disparue entre temps

    const req = {
      params: { id: 'session-1' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await leaveHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Left session' })

    await new Promise((r) => setTimeout(r, 10))
    expect(mockNotifyGroupMembers).not.toHaveBeenCalled()
  })

  it("retourne 404 si l'utilisateur ne participe pas à la séance", async () => {
    mockPassengerFindUnique.mockResolvedValue(null)

    const req = {
      params: { id: 'session-1' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await leaveHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }))
    expect(mockNotifyGroupMembers).not.toHaveBeenCalled()
  })
})
