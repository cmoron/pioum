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

  it('envoie DRIVER_LEFT avec le bon message quand le chauffeur quitte la séance', async () => {
    mockUserFindUnique.mockResolvedValue({ name: 'Alice' })

    const req = makeReq({ params: { id: 'session-1' }, user: { userId: 'user-1' } })

    await leaveSessionHandler(req, asRes(mockRes), mockNext)

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
    expect(mockNotifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      'user-1',
      expect.objectContaining({ body: expect.stringContaining('pas fiable le golem') })
    )
  })

  it("n'envoie PAS de notification quand un simple passager (sans voiture) quitte la séance", async () => {
    mockCarFindUnique.mockResolvedValue(null) // pas de voiture

    const req = makeReq({ params: { id: 'session-1' }, user: { userId: 'user-1' } })

    await leaveSessionHandler(req, asRes(mockRes), mockNext)

    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Left session' })

    // Laisser un tick pour s'assurer que la notif n'est pas envoyée en différé
    await new Promise((r) => setTimeout(r, 10))
    expect(mockNotifyGroupMembers).not.toHaveBeenCalled()
  })

  it("utilise 'Le chauffeur' si le nom de l'utilisateur est introuvable", async () => {
    mockUserFindUnique.mockResolvedValue(null) // user inconnu

    const req = makeReq({ params: { id: 'session-1' }, user: { userId: 'user-unknown' } })

    await leaveSessionHandler(req, asRes(mockRes), mockNext)

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
