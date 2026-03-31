import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextFunction } from 'express'
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
import { makeRes, makeReq, asRes } from './test-utils.js'
import { leaveSessionHandler } from './sessions.js'

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
    mockPassengerFindUnique.mockResolvedValue(existingPassenger)
    mockCarFindUnique.mockResolvedValue(existingCar)
    mockSessionFindUnique.mockResolvedValue(sessionInfo)
  })

  it.each([
    {
      label: 'chauffeur',
      hasCar: true,
      userId: 'user-1',
      name: 'Alice',
      title: "🚨 Un chauffeur s'est désisté !",
      bodyContains: ["Alice s'est désisté", 'pas fiable le golem'],
      type: 'DRIVER_LEFT',
    },
    {
      label: 'passager',
      hasCar: false,
      userId: 'user-2',
      name: 'Bob',
      title: "👋 Désistement d'un inscrit",
      bodyContains: ["Bob s'est désisté"],
      type: 'NEW_WITHDRAWAL',
    },
  ])('envoie $type avec le bon message quand $label quitte la séance', async ({ hasCar, userId, name, title, bodyContains, type }) => {
    if (!hasCar) mockCarFindUnique.mockResolvedValue(null)
    mockUserFindUnique.mockResolvedValue({ name })

    const req = makeReq({ params: { id: 'session-1' }, user: { userId } })

    await leaveSessionHandler(req, asRes(mockRes), mockNext)

    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Left session' })
    expect(mockNext).not.toHaveBeenCalled()

    await vi.waitFor(() => expect(mockNotifyGroupMembers).toHaveBeenCalled())

    for (const fragment of bodyContains) {
      expect(mockNotifyGroupMembers).toHaveBeenCalledWith(
        'group-1',
        userId,
        expect.objectContaining({ body: expect.stringContaining(fragment) })
      )
    }
    expect(mockNotifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      userId,
      expect.objectContaining({ title, type, url: '/groups/group-1' })
    )
  })

  it.each([
    { label: 'chauffeur', hasCar: true, expectedBody: "Le chauffeur s'est désisté", expectedType: 'DRIVER_LEFT' },
    { label: 'passager', hasCar: false, expectedBody: "Quelqu'un s'est désisté", expectedType: 'NEW_WITHDRAWAL' },
  ])("utilise le bon fallback si le nom est introuvable ($label)", async ({ hasCar, expectedBody, expectedType }) => {
    mockCarFindUnique.mockResolvedValue(hasCar ? existingCar : null)
    mockUserFindUnique.mockResolvedValue(null)

    const req = makeReq({ params: { id: 'session-1' }, user: { userId: 'user-unknown' } })

    await leaveSessionHandler(req, asRes(mockRes), mockNext)

    await vi.waitFor(() => expect(mockNotifyGroupMembers).toHaveBeenCalled())

    expect(mockNotifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      'user-unknown',
      expect.objectContaining({
        body: expect.stringContaining(expectedBody),
        type: expectedType,
      })
    )
  })

  it("n'envoie pas de notification si la session est introuvable après le départ", async () => {
    mockUserFindUnique.mockResolvedValue({ name: 'Alice' })
    mockSessionFindUnique.mockResolvedValue(null) // session disparue entre temps

    const req = makeReq({ params: { id: 'session-1' }, user: { userId: 'user-1' } })

    await leaveSessionHandler(req, asRes(mockRes), mockNext)

    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Left session' })

    await new Promise((r) => setTimeout(r, 10))
    expect(mockNotifyGroupMembers).not.toHaveBeenCalled()
  })

  it("retourne 404 si l'utilisateur ne participe pas à la séance", async () => {
    mockPassengerFindUnique.mockResolvedValue(null)

    const req = makeReq({ params: { id: 'session-1' }, user: { userId: 'user-1' } })

    await leaveSessionHandler(req, asRes(mockRes), mockNext)

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }))
    expect(mockNotifyGroupMembers).not.toHaveBeenCalled()
  })
})
