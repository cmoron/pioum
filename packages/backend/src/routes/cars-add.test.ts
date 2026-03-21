import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler.js'
import '../middleware/auth.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    session: { findUnique: vi.fn() },
    groupMember: { findUnique: vi.fn() },
    car: { findUnique: vi.fn(), create: vi.fn() },
    passenger: { upsert: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))

vi.mock('../notifications/notification.service.js', () => ({
  notifyGroupMembers: vi.fn(),
}))

import { prisma } from '../lib/prisma.js'
import { notifyGroupMembers } from '../notifications/notification.service.js'

const mockSessionFindUnique = prisma.session.findUnique as ReturnType<typeof vi.fn>
const mockGroupMemberFindUnique = prisma.groupMember.findUnique as ReturnType<typeof vi.fn>
const mockCarFindUnique = prisma.car.findUnique as ReturnType<typeof vi.fn>
const mockCarCreate = prisma.car.create as ReturnType<typeof vi.fn>
const mockPassengerUpsert = prisma.passenger.upsert as ReturnType<typeof vi.fn>
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>
const mockNotifyGroupMembers = notifyGroupMembers as ReturnType<typeof vi.fn>

const sessionDate = new Date(2026, 2, 21) // 21 mars 2026 (local time)

const futureSession = {
  id: 'session-1',
  groupId: 'group-1',
  date: sessionDate,
  startTime: new Date(Date.now() + 3600 * 1000),
}

const memberRole = { role: 'member' }

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

function formatSessionDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/**
 * Extracted handler — mirrors POST /cars in cars.ts
 */
async function addCarHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionId, seats: providedSeats } = req.body as { sessionId: string; seats?: number }

    const session = await prisma.session.findUnique({ where: { id: sessionId } })
    if (!session) throw new AppError(404, 'Session not found')

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: req.user!.userId, groupId: session.groupId } },
    })
    if (!membership) throw new AppError(403, 'Not a member of this group')

    const isLocked = new Date() >= session.startTime
    if (isLocked && membership.role !== 'admin') {
      throw new AppError(403, 'Les inscriptions sont fermées pour cette séance')
    }

    const existingCar = await prisma.car.findUnique({
      where: { sessionId_driverId: { sessionId, driverId: req.user!.userId } },
    })
    if (existingCar) throw new AppError(400, 'Already have a car in this session')

    const seats = providedSeats ?? 3

    await prisma.passenger.upsert({
      where: { sessionId_userId: { sessionId, userId: req.user!.userId } },
      create: { sessionId, userId: req.user!.userId },
      update: {},
    })

    const car = await prisma.car.create({
      data: { sessionId, driverId: req.user!.userId, seats },
      include: { passengers: true },
    })

    res.status(201).json({ car })

    // Fire-and-forget notification (same pattern as production code)
    prisma.user
      .findUnique({ where: { id: req.user!.userId }, select: { name: true } })
      .then((driver) => {
        const driverName = driver?.name ?? "Quelqu'un"
        const availableSeats = car.seats - car.passengers.length
        return notifyGroupMembers(session.groupId, req.user!.userId, {
          title: '🚗 Une voiture est disponible !',
          body: `${driverName} propose sa voiture pour la séance du ${formatSessionDate(session.date)}. Il reste ${availableSeats} place${availableSeats > 1 ? 's' : ''} disponible${availableSeats > 1 ? 's' : ''}.`,
          url: `/groups/${session.groupId}`,
          type: 'CAR_AVAILABLE',
        })
      })
      .catch(() => { /* silencieux en production */ })
  } catch (error) {
    next(error)
  }
}

describe('POST /cars — notification CAR_AVAILABLE', () => {
  let mockRes: ReturnType<typeof makeRes>
  let mockNext: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
    mockRes = makeRes()
    mockNext = vi.fn()
    mockNotifyGroupMembers.mockResolvedValue(undefined)
    mockPassengerUpsert.mockResolvedValue({})
  })

  it('notifie les membres avec le bon message quand Alice propose sa voiture (3 places)', async () => {
    mockSessionFindUnique.mockResolvedValue(futureSession)
    mockGroupMemberFindUnique.mockResolvedValue(memberRole)
    mockCarFindUnique.mockResolvedValue(null)
    mockCarCreate.mockResolvedValue({ seats: 3, passengers: [] })
    mockUserFindUnique.mockResolvedValue({ name: 'Alice' })

    const req = {
      body: { sessionId: 'session-1', seats: 3 },
      user: { userId: 'user-1' },
    } as unknown as Request

    await addCarHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(201)
    expect(mockNext).not.toHaveBeenCalled()

    await vi.waitFor(() => expect(mockNotifyGroupMembers).toHaveBeenCalled())

    expect(mockNotifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      'user-1',
      expect.objectContaining({
        title: '🚗 Une voiture est disponible !',
        body: expect.stringContaining('Alice propose sa voiture'),
        type: 'CAR_AVAILABLE',
        url: '/groups/group-1',
      })
    )
  })

  it('indique le bon nombre de places disponibles (seats - passagers déjà embarqués)', async () => {
    mockSessionFindUnique.mockResolvedValue(futureSession)
    mockGroupMemberFindUnique.mockResolvedValue(memberRole)
    mockCarFindUnique.mockResolvedValue(null)
    // 4 sièges, 1 passager déjà embarqué → 3 places disponibles
    mockCarCreate.mockResolvedValue({ seats: 4, passengers: [{ userId: 'user-2' }] })
    mockUserFindUnique.mockResolvedValue({ name: 'Bob' })

    const req = {
      body: { sessionId: 'session-1', seats: 4 },
      user: { userId: 'user-1' },
    } as unknown as Request

    await addCarHandler(req, mockRes as unknown as Response, mockNext)

    await vi.waitFor(() => expect(mockNotifyGroupMembers).toHaveBeenCalled())

    expect(mockNotifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      'user-1',
      expect.objectContaining({
        body: expect.stringContaining('Il reste 3 places disponibles'),
      })
    )
  })

  it('utilise le singulier quand il reste 1 place', async () => {
    mockSessionFindUnique.mockResolvedValue(futureSession)
    mockGroupMemberFindUnique.mockResolvedValue(memberRole)
    mockCarFindUnique.mockResolvedValue(null)
    mockCarCreate.mockResolvedValue({ seats: 1, passengers: [] })
    mockUserFindUnique.mockResolvedValue({ name: 'Bob' })

    const req = {
      body: { sessionId: 'session-1', seats: 1 },
      user: { userId: 'user-1' },
    } as unknown as Request

    await addCarHandler(req, mockRes as unknown as Response, mockNext)

    await vi.waitFor(() => expect(mockNotifyGroupMembers).toHaveBeenCalled())

    expect(mockNotifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      'user-1',
      expect.objectContaining({
        body: expect.stringContaining('Il reste 1 place disponible'),
      })
    )
  })

  it("utilise 'Quelqu'un' si le nom du chauffeur est introuvable", async () => {
    mockSessionFindUnique.mockResolvedValue(futureSession)
    mockGroupMemberFindUnique.mockResolvedValue(memberRole)
    mockCarFindUnique.mockResolvedValue(null)
    mockCarCreate.mockResolvedValue({ seats: 3, passengers: [] })
    mockUserFindUnique.mockResolvedValue(null)

    const req = {
      body: { sessionId: 'session-1', seats: 3 },
      user: { userId: 'user-unknown' },
    } as unknown as Request

    await addCarHandler(req, mockRes as unknown as Response, mockNext)

    await vi.waitFor(() => expect(mockNotifyGroupMembers).toHaveBeenCalled())

    expect(mockNotifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      'user-unknown',
      expect.objectContaining({
        body: expect.stringContaining("Quelqu'un propose sa voiture"),
      })
    )
  })

  it("retourne 400 si l'utilisateur a déjà une voiture dans cette séance", async () => {
    mockSessionFindUnique.mockResolvedValue(futureSession)
    mockGroupMemberFindUnique.mockResolvedValue(memberRole)
    mockCarFindUnique.mockResolvedValue({ id: 'car-existing' })

    const req = {
      body: { sessionId: 'session-1', seats: 3 },
      user: { userId: 'user-1' },
    } as unknown as Request

    await addCarHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }))
    expect(mockNotifyGroupMembers).not.toHaveBeenCalled()
  })

  it("retourne 404 si la session n'existe pas", async () => {
    mockSessionFindUnique.mockResolvedValue(null)

    const req = {
      body: { sessionId: 'session-inexistante', seats: 3 },
      user: { userId: 'user-1' },
    } as unknown as Request

    await addCarHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }))
    expect(mockNotifyGroupMembers).not.toHaveBeenCalled()
  })

  it("retourne 403 si l'utilisateur n'est pas membre du groupe", async () => {
    mockSessionFindUnique.mockResolvedValue(futureSession)
    mockGroupMemberFindUnique.mockResolvedValue(null)

    const req = {
      body: { sessionId: 'session-1', seats: 3 },
      user: { userId: 'user-outsider' },
    } as unknown as Request

    await addCarHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }))
    expect(mockNotifyGroupMembers).not.toHaveBeenCalled()
  })
})
