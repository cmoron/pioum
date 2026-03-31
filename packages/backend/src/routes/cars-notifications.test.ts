import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../middleware/auth.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    car: { findUnique: vi.fn(), delete: vi.fn() },
    groupMember: { findUnique: vi.fn() },
    ban: { findFirst: vi.fn() },
    passenger: { upsert: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn() },
    '$transaction': vi.fn(),
  },
}))

vi.mock('../notifications/notification.service.js', () => ({
  notifyUser: vi.fn(),
  notifyUsers: vi.fn(),
  notifyGroupMembers: vi.fn(),
}))

vi.mock('../middleware/auth.js', () => ({
  authenticate: (
    req: import('express').Request,
    _res: import('express').Response,
    next: import('express').NextFunction
  ) => {
    ;(req as import('express').Request & { user: { userId: string } }).user = {
      userId: (req.headers['x-test-user-id'] as string) ?? 'driver-1',
    }
    next()
  },
}))

import express from 'express'
import request from 'supertest'
import { prisma } from '../lib/prisma.js'
import { notifyUser, notifyUsers } from '../notifications/notification.service.js'
import { carsRouter } from './cars.js'
import { errorHandler } from '../middleware/errorHandler.js'

const mockCarFindUnique = vi.mocked(prisma.car.findUnique)
const mockCarDelete = vi.mocked(prisma.car.delete)
const mockGroupMemberFindUnique = vi.mocked(prisma.groupMember.findUnique)
const mockBanFindFirst = vi.mocked(prisma.ban.findFirst)
const mockPassengerUpsert = vi.mocked(prisma.passenger.upsert)
const mockPassengerFindFirst = vi.mocked(prisma.passenger.findFirst)
const mockPassengerUpdate = vi.mocked(prisma.passenger.update)
const mockPassengerUpdateMany = vi.mocked(prisma.passenger.updateMany)
const mockUserFindUnique = vi.mocked(prisma.user.findUnique)
const mockTransaction = vi.mocked(prisma.$transaction)
const mockNotifyUser = vi.mocked(notifyUser)
const mockNotifyUsers = vi.mocked(notifyUsers)

const sessionDate = new Date(2026, 2, 21)

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/cars', carsRouter)
  app.use(errorHandler)
  return app
}

// ── DELETE /cars/:id — DRIVER_LEFT ─────────────────────────────────────────

describe('DELETE /cars/:id — notification DRIVER_LEFT', () => {
  const carWithPassengers = {
    id: 'car-1',
    driverId: 'driver-1',
    session: { id: 'session-1', groupId: 'group-1', date: sessionDate },
    passengers: [{ userId: 'passenger-1' }, { userId: 'passenger-2' }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockNotifyUsers.mockResolvedValue(undefined)
    mockPassengerUpdateMany.mockResolvedValue({ count: 0 })
    mockCarDelete.mockResolvedValue({})
  })

  it('notifie les passagers avec DRIVER_LEFT quand le chauffeur supprime sa voiture', async () => {
    mockCarFindUnique.mockResolvedValue(carWithPassengers as never)
    mockUserFindUnique.mockResolvedValue({ name: 'Alice' })

    const res = await request(buildApp())
      .delete('/cars/car-1')
      .set('x-test-user-id', 'driver-1')

    expect(res.status).toBe(200)

    await vi.waitFor(() => expect(mockNotifyUsers).toHaveBeenCalled())

    expect(mockNotifyUsers).toHaveBeenCalledWith(
      expect.arrayContaining(['passenger-1', 'passenger-2']),
      expect.objectContaining({
        title: "🚨 Un chauffeur s'est désisté !",
        body: expect.stringContaining('Alice'),
        type: 'DRIVER_LEFT',
        url: '/groups/group-1',
      })
    )
  })

  it("utilise 'Le chauffeur' si le nom du chauffeur est introuvable", async () => {
    mockCarFindUnique.mockResolvedValue(carWithPassengers as never)
    mockUserFindUnique.mockResolvedValue(null)

    await request(buildApp()).delete('/cars/car-1').set('x-test-user-id', 'driver-1')

    await vi.waitFor(() => expect(mockNotifyUsers).toHaveBeenCalled())

    expect(mockNotifyUsers).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ body: expect.stringContaining('Le chauffeur') })
    )
  })

  it("n'envoie pas de notification si la voiture n'avait aucun passager", async () => {
    mockCarFindUnique.mockResolvedValue({ ...carWithPassengers, passengers: [] } as never)

    await request(buildApp()).delete('/cars/car-1').set('x-test-user-id', 'driver-1')

    await new Promise((r) => setTimeout(r, 10))
    expect(mockNotifyUsers).not.toHaveBeenCalled()
  })

  it('retourne 403 si ce n\'est pas la voiture du conducteur', async () => {
    mockCarFindUnique.mockResolvedValue(carWithPassengers as never)

    const res = await request(buildApp())
      .delete('/cars/car-1')
      .set('x-test-user-id', 'autre-user')

    expect(res.status).toBe(403)
    expect(mockNotifyUsers).not.toHaveBeenCalled()
  })
})

// ── POST /cars/:id/join — PASSENGER_JOINED ─────────────────────────────────

describe('POST /cars/:id/join — notification PASSENGER_JOINED', () => {
  const joinCar = {
    id: 'car-1',
    driverId: 'driver-1',
    sessionId: 'session-1',
    seats: 4,
    passengers: [],
    session: { id: 'session-1', groupId: 'group-1', startTime: new Date(Date.now() + 3_600_000), date: sessionDate },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockNotifyUser.mockResolvedValue(undefined)
    // Mock $transaction to call the callback with the mocked prisma as tx
    mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma))
    mockGroupMemberFindUnique.mockResolvedValue({ role: 'member' } as never)
    mockBanFindFirst.mockResolvedValue(null)
    mockPassengerUpsert.mockResolvedValue({ id: 'p-1', carId: 'car-1' } as never)
  })

  it('notifie le chauffeur avec PASSENGER_JOINED quand un passager rejoint', async () => {
    mockCarFindUnique.mockResolvedValue(joinCar as never)
    mockUserFindUnique.mockResolvedValue({ name: 'Bob' })

    const res = await request(buildApp())
      .post('/cars/car-1/join')
      .set('x-test-user-id', 'passenger-1')

    expect(res.status).toBe(200)

    await vi.waitFor(() => expect(mockNotifyUser).toHaveBeenCalled())

    expect(mockNotifyUser).toHaveBeenCalledWith(
      'driver-1',
      expect.objectContaining({
        title: '🙋 Nouveau passager !',
        body: expect.stringContaining('Bob'),
        type: 'PASSENGER_JOINED',
        url: '/groups/group-1',
      })
    )
  })

  it('retourne 403 si l\'utilisateur est banni par le chauffeur', async () => {
    mockCarFindUnique.mockResolvedValue(joinCar as never)
    mockBanFindFirst.mockResolvedValue({ id: 'ban-1' } as never)

    const res = await request(buildApp())
      .post('/cars/car-1/join')
      .set('x-test-user-id', 'passenger-1')

    expect(res.status).toBe(403)
    expect(mockNotifyUser).not.toHaveBeenCalled()
  })
})

// ── DELETE /cars/:id/leave — PASSENGER_LEFT ────────────────────────────────

describe('DELETE /cars/:id/leave — notification PASSENGER_LEFT', () => {
  const carForLeave = {
    id: 'car-1',
    driverId: 'driver-1',
    session: { id: 'session-1', groupId: 'group-1', date: sessionDate },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockNotifyUser.mockResolvedValue(undefined)
    mockPassengerUpdate.mockResolvedValue({} as never)
  })

  it('notifie le chauffeur avec PASSENGER_LEFT quand un passager quitte', async () => {
    mockCarFindUnique.mockResolvedValue(carForLeave as never)
    mockPassengerFindFirst.mockResolvedValue({ id: 'p-1' } as never)
    mockUserFindUnique.mockResolvedValue({ name: 'Charlie' })

    const res = await request(buildApp())
      .delete('/cars/car-1/leave')
      .set('x-test-user-id', 'passenger-1')

    expect(res.status).toBe(200)

    await vi.waitFor(() => expect(mockNotifyUser).toHaveBeenCalled())

    expect(mockNotifyUser).toHaveBeenCalledWith(
      'driver-1',
      expect.objectContaining({
        title: '🚪 Un passager est parti !',
        body: expect.stringContaining('Charlie'),
        type: 'PASSENGER_LEFT',
        url: '/groups/group-1',
      })
    )
  })

  it("retourne 404 si l'utilisateur n'est pas dans cette voiture", async () => {
    mockCarFindUnique.mockResolvedValue(carForLeave as never)
    mockPassengerFindFirst.mockResolvedValue(null)

    const res = await request(buildApp())
      .delete('/cars/car-1/leave')
      .set('x-test-user-id', 'passenger-1')

    expect(res.status).toBe(404)
    expect(mockNotifyUser).not.toHaveBeenCalled()
  })
})

// ── DELETE /cars/:id/kick/:userId — PASSENGER_KICKED ──────────────────────

describe('DELETE /cars/:id/kick/:userId — notification PASSENGER_KICKED', () => {
  const carForKick = {
    id: 'car-1',
    driverId: 'driver-1',
    session: { id: 'session-1', groupId: 'group-1', date: sessionDate },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockNotifyUser.mockResolvedValue(undefined)
    mockPassengerUpdate.mockResolvedValue({} as never)
  })

  it('notifie le passager éjecté avec PASSENGER_KICKED', async () => {
    mockCarFindUnique.mockResolvedValue(carForKick as never)
    mockPassengerFindFirst.mockResolvedValue({ id: 'p-1' } as never)

    const res = await request(buildApp())
      .delete('/cars/car-1/kick/passenger-1')
      .set('x-test-user-id', 'driver-1')

    expect(res.status).toBe(200)

    await vi.waitFor(() => expect(mockNotifyUser).toHaveBeenCalled())

    expect(mockNotifyUser).toHaveBeenCalledWith(
      'passenger-1',
      expect.objectContaining({
        title: '👢 Tu as été éjecté !',
        type: 'PASSENGER_KICKED',
        url: '/groups/group-1',
      })
    )
  })

  it('retourne 403 si ce n\'est pas le chauffeur qui tente d\'éjecter', async () => {
    mockCarFindUnique.mockResolvedValue(carForKick as never)

    const res = await request(buildApp())
      .delete('/cars/car-1/kick/passenger-1')
      .set('x-test-user-id', 'autre-user')

    expect(res.status).toBe(403)
    expect(mockNotifyUser).not.toHaveBeenCalled()
  })

  it('retourne 404 si le passager n\'est pas dans cette voiture', async () => {
    mockCarFindUnique.mockResolvedValue(carForKick as never)
    mockPassengerFindFirst.mockResolvedValue(null)

    const res = await request(buildApp())
      .delete('/cars/car-1/kick/passenger-1')
      .set('x-test-user-id', 'driver-1')

    expect(res.status).toBe(404)
    expect(mockNotifyUser).not.toHaveBeenCalled()
  })
})
