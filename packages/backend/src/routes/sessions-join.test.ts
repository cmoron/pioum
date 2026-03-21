import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler.js'
import '../middleware/auth.js' // Import for Express.Request.user type augmentation

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
    },
    groupMember: {
      findUnique: vi.fn(),
    },
    passenger: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('../notifications/notification.service.js', () => ({
  notifyGroupMembers: vi.fn(),
}))

import { prisma } from '../lib/prisma.js'
import { notifyGroupMembers } from '../notifications/notification.service.js'

const mockSessionFindUnique = prisma.session.findUnique as unknown as ReturnType<typeof vi.fn>
const mockGroupMemberFindUnique = prisma.groupMember.findUnique as unknown as ReturnType<typeof vi.fn>
const mockPassengerFindUnique = prisma.passenger.findUnique as unknown as ReturnType<typeof vi.fn>
const mockPassengerCreate = prisma.passenger.create as unknown as ReturnType<typeof vi.fn>
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>
const mockNotifyGroupMembers = notifyGroupMembers as ReturnType<typeof vi.fn>

// Future session (not locked)
const futureSession = {
  id: 'session-1',
  groupId: 'group-1',
  startTime: new Date(Date.now() + 3600 * 1000), // 1h in the future
}

// Past session (locked)
const lockedSession = {
  id: 'session-2',
  groupId: 'group-1',
  startTime: new Date(Date.now() - 3600 * 1000), // 1h in the past
}

const memberRole = { role: 'member' }
const adminRole = { role: 'admin' }

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

/**
 * Extracted handler — mirrors POST /sessions/:id/join in sessions.ts
 */
async function joinHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } })
    if (!session) throw new AppError(404, 'Session not found')

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: req.user!.userId, groupId: session.groupId } },
    })
    if (!membership) throw new AppError(403, 'Not a member of this group')

    const isLocked = new Date() >= session.startTime
    if (isLocked && membership.role !== 'admin') {
      throw new AppError(403, 'Les inscriptions sont fermées pour cette séance')
    }

    const existing = await prisma.passenger.findUnique({
      where: { sessionId_userId: { sessionId: session.id, userId: req.user!.userId } },
    })
    if (existing) throw new AppError(400, 'Already participating')

    await prisma.passenger.create({ data: { sessionId: session.id, userId: req.user!.userId } })

    // Fire-and-forget notification (same pattern as production code)
    prisma.user
      .findUnique({ where: { id: req.user!.userId }, select: { name: true } })
      .then((joiner) => {
        const userName = joiner?.name ?? "Quelqu'un"
        return notifyGroupMembers(session.groupId, req.user!.userId, {
          title: '🏋️ Nouvelle inscription Pioum',
          body: `${userName} est inscrit et en attente de voiture !`,
          url: `/groups/${session.groupId}`,
          type: 'NO_CAR',
        })
      })
      .catch(() => {/* silencieux en production */})

    res.json({ message: 'Joined session' })
  } catch (error) {
    next(error)
  }
}

describe('POST /sessions/:id/join — notification scénario', () => {
  let mockRes: ReturnType<typeof makeRes>
  let mockNext: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
    mockRes = makeRes()
    mockNext = vi.fn()
    mockNotifyGroupMembers.mockResolvedValue(undefined)
    mockPassengerCreate.mockResolvedValue({})
  })

  it('notifie les membres du groupe avec le bon message quand User1 rejoint sans voiture', async () => {
    // User1 (Alice) rejoint la séance — pas de voiture
    mockSessionFindUnique.mockResolvedValue(futureSession)
    mockGroupMemberFindUnique.mockResolvedValue(memberRole)
    mockPassengerFindUnique.mockResolvedValue(null)
    mockUserFindUnique.mockResolvedValue({ name: 'Alice' })

    const req = {
      params: { id: 'session-1' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await joinHandler(req, mockRes as unknown as Response, mockNext)

    // La réponse HTTP est immédiate
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Joined session' })
    expect(mockNext).not.toHaveBeenCalled()

    // Attendre que la Promise fire-and-forget soit résolue
    await vi.waitFor(() => expect(mockNotifyGroupMembers).toHaveBeenCalled())

    expect(mockNotifyGroupMembers).toHaveBeenCalledWith(
      'group-1',   // groupId
      'user-1',    // exclude User1 (celui qui s'inscrit)
      expect.objectContaining({
        body: 'Alice est inscrit et en attente de voiture !',
        type: 'NO_CAR',
        url: '/groups/group-1',
      })
    )
  })

  it("utilise 'Quelqu'un' si le nom de l'utilisateur est introuvable", async () => {
    mockSessionFindUnique.mockResolvedValue(futureSession)
    mockGroupMemberFindUnique.mockResolvedValue(memberRole)
    mockPassengerFindUnique.mockResolvedValue(null)
    mockUserFindUnique.mockResolvedValue(null) // user inconnu

    const req = {
      params: { id: 'session-1' },
      user: { userId: 'user-unknown' },
    } as unknown as Request

    await joinHandler(req, mockRes as unknown as Response, mockNext)

    await vi.waitFor(() => expect(mockNotifyGroupMembers).toHaveBeenCalled())

    expect(mockNotifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      'user-unknown',
      expect.objectContaining({
        body: "Quelqu'un est inscrit et en attente de voiture !",
        type: 'NO_CAR',
      })
    )
  })

  it('retourne 400 si User1 est déjà inscrit à la séance', async () => {
    mockSessionFindUnique.mockResolvedValue(futureSession)
    mockGroupMemberFindUnique.mockResolvedValue(memberRole)
    mockPassengerFindUnique.mockResolvedValue({ id: 'passenger-existing' }) // déjà inscrit

    const req = {
      params: { id: 'session-1' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await joinHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }))
    expect(mockNotifyGroupMembers).not.toHaveBeenCalled()
  })

  it("retourne 403 si la séance est verrouillée et que User1 n'est pas admin", async () => {
    mockSessionFindUnique.mockResolvedValue(lockedSession)
    mockGroupMemberFindUnique.mockResolvedValue(memberRole)

    const req = {
      params: { id: 'session-2' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await joinHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }))
    expect(mockNotifyGroupMembers).not.toHaveBeenCalled()
  })

  it('permet à un admin de rejoindre une séance verrouillée', async () => {
    mockSessionFindUnique.mockResolvedValue(lockedSession)
    mockGroupMemberFindUnique.mockResolvedValue(adminRole)
    mockPassengerFindUnique.mockResolvedValue(null)
    mockUserFindUnique.mockResolvedValue({ name: 'Bob' })

    const req = {
      params: { id: 'session-2' },
      user: { userId: 'user-2' },
    } as unknown as Request

    await joinHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Joined session' })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it("retourne 404 si la session n'existe pas", async () => {
    mockSessionFindUnique.mockResolvedValue(null)

    const req = {
      params: { id: 'session-inexistante' },
      user: { userId: 'user-1' },
    } as unknown as Request

    await joinHandler(req, mockRes as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }))
  })
})
