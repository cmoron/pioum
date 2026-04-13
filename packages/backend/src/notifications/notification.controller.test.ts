import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import express from 'express'
import request from 'supertest'

vi.mock('./notification.service.js', () => ({
  saveSubscription: vi.fn(),
  removeSubscription: vi.fn(),
  NOTIFICATION_TYPES: [
    'NEW_INSCRIPTION', 'NEW_WITHDRAWAL', 'CAR_AVAILABLE', 'NO_CAR',
    'DRIVER_LEFT', 'USER_BANNED', 'PASSENGER_JOINED', 'PASSENGER_LEFT', 'PASSENGER_KICKED',
  ] as const,
}))

vi.mock('../middleware/auth.js', () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    ;(req as Request & { user: { userId: string } }).user = {
      userId: (req.headers['x-test-user-id'] as string) ?? 'user-123',
    }
    next()
  },
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    pushSubscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { saveSubscription, removeSubscription } from './notification.service.js'
import { prisma } from '../lib/prisma.js'
import { notificationsRouter } from './notification.controller.js'
import { errorHandler } from '../middleware/errorHandler.js'

const mockPushSubFindUnique = vi.mocked(prisma.pushSubscription.findUnique)
const mockPushSubUpdate = vi.mocked(prisma.pushSubscription.update)

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/notifications', notificationsRouter)
  app.use(errorHandler)
  return app
}

const mockSaveSubscription = saveSubscription as ReturnType<typeof vi.fn>
const mockRemoveSubscription = removeSubscription as ReturnType<typeof vi.fn>

const mockSub = {
  endpoint: 'https://fcm.googleapis.com/push/abc123',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
}

function makeRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

async function subscribeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const body = req.body as Record<string, unknown>
  const missing = ['subscription'].filter((f) => body[f] === undefined)
  if (missing.length > 0) {
    res.status(400).json({ error: `Champs manquants : ${missing.join(', ')}` })
    return
  }
  try {
    await saveSubscription(req.user!.userId, body.subscription as Parameters<typeof saveSubscription>[1])
    res.status(201).json({ message: 'Abonnement enregistré' })
  } catch (err) {
    next(err)
  }
}

async function unsubscribeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await removeSubscription(req.user!.userId)
    res.status(200).json({ message: 'Désabonnement effectué' })
  } catch (err) {
    next(err)
  }
}

function vapidPublicKeyHandler(req: Request, res: Response): void {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) {
    res.status(503).json({ error: 'Push notifications non configurées' })
    return
  }
  res.json({ vapidPublicKey: key })
}

describe('POST /notifications/subscribe', () => {
  let mockReq: Record<string, unknown>
  let mockRes: ReturnType<typeof makeRes>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      user: { userId: 'user-123' },
      body: { subscription: mockSub },
    }
    mockRes = makeRes()
    mockNext = vi.fn()
    vi.clearAllMocks()
  })

  it('returns 201 with success message when subscription is saved', async () => {
    mockSaveSubscription.mockResolvedValue(undefined)

    await subscribeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(201)
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Abonnement enregistré' })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('calls saveSubscription with the authenticated user id', async () => {
    mockSaveSubscription.mockResolvedValue(undefined)

    await subscribeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

    expect(mockSaveSubscription).toHaveBeenCalledWith('user-123', mockSub)
  })

  it('returns 400 when subscription field is missing', async () => {
    mockReq.body = {}

    await subscribeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Champs manquants : subscription' })
    expect(mockSaveSubscription).not.toHaveBeenCalled()
  })

  it('passes errors from saveSubscription to next middleware', async () => {
    const err = new Error('DB failure')
    mockSaveSubscription.mockRejectedValue(err)

    await subscribeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(err)
    expect(mockRes.status).not.toHaveBeenCalledWith(201)
  })
})

describe('POST /notifications/unsubscribe', () => {
  let mockReq: Record<string, unknown>
  let mockRes: ReturnType<typeof makeRes>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = { user: { userId: 'user-123' } }
    mockRes = makeRes()
    mockNext = vi.fn()
    vi.clearAllMocks()
  })

  it('returns 200 with success message when unsubscribed', async () => {
    mockRemoveSubscription.mockResolvedValue(undefined)

    await unsubscribeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Désabonnement effectué' })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('calls removeSubscription with the authenticated user id', async () => {
    mockRemoveSubscription.mockResolvedValue(undefined)

    await unsubscribeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

    expect(mockRemoveSubscription).toHaveBeenCalledWith('user-123')
  })

  it('passes errors from removeSubscription to next middleware', async () => {
    const err = new Error('DB failure')
    mockRemoveSubscription.mockRejectedValue(err)

    await unsubscribeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(err)
  })
})

describe('GET /notifications/vapid-public-key', () => {
  let mockReq: Record<string, unknown>
  let mockRes: ReturnType<typeof makeRes>

  beforeEach(() => {
    mockReq = {}
    mockRes = makeRes()
    delete process.env.VAPID_PUBLIC_KEY
  })

  it('returns the VAPID public key when configured', () => {
    process.env.VAPID_PUBLIC_KEY = 'BNcRdreALRFXTkOOUHK1EtK2wtwe...'

    vapidPublicKeyHandler(mockReq as unknown as Request, mockRes as unknown as Response)

    expect(mockRes.json).toHaveBeenCalledWith({ vapidPublicKey: 'BNcRdreALRFXTkOOUHK1EtK2wtwe...' })
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  it('returns 503 when VAPID_PUBLIC_KEY env var is not set', () => {
    vapidPublicKeyHandler(mockReq as unknown as Request, mockRes as unknown as Response)

    expect(mockRes.status).toHaveBeenCalledWith(503)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Push notifications non configurées' })
  })
})

// ── PATCH /preferences ─────────────────────────────────────────────────────

describe('PATCH /notifications/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('met à jour les préférences et retourne les types activés', async () => {
    mockPushSubFindUnique.mockResolvedValue({ userId: 'user-123' } as never)
    mockPushSubUpdate.mockResolvedValue({} as never)

    const res = await request(buildApp())
      .patch('/notifications/preferences')
      .set('x-test-user-id', 'user-123')
      .send({ enabledTypes: ['CAR_AVAILABLE'] })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ enabledTypes: ['CAR_AVAILABLE'] })
    expect(mockPushSubUpdate).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      data: { enabledTypes: ['CAR_AVAILABLE'] },
    })
  })

  it('accepte enabledTypes vide (tout activé par convention)', async () => {
    mockPushSubFindUnique.mockResolvedValue({ userId: 'user-123' } as never)
    mockPushSubUpdate.mockResolvedValue({} as never)

    const res = await request(buildApp())
      .patch('/notifications/preferences')
      .set('x-test-user-id', 'user-123')
      .send({ enabledTypes: [] })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ enabledTypes: [] })
  })

  it("retourne 404 si l'utilisateur n'a pas de subscription push", async () => {
    mockPushSubFindUnique.mockResolvedValue(null)

    const res = await request(buildApp())
      .patch('/notifications/preferences')
      .set('x-test-user-id', 'user-123')
      .send({ enabledTypes: ['CAR_AVAILABLE'] })

    expect(res.status).toBe(404)
    expect(mockPushSubUpdate).not.toHaveBeenCalled()
  })

  it('retourne 400 si enabledTypes contient un type inconnu', async () => {
    const res = await request(buildApp())
      .patch('/notifications/preferences')
      .set('x-test-user-id', 'user-123')
      .send({ enabledTypes: ['TYPE_INEXISTANT'] })

    expect(res.status).toBe(400)
    expect(mockPushSubFindUnique).not.toHaveBeenCalled()
  })

  it('retourne 400 si le body est invalide (champ manquant)', async () => {
    const res = await request(buildApp())
      .patch('/notifications/preferences')
      .set('x-test-user-id', 'user-123')
      .send({})

    expect(res.status).toBe(400)
  })
})
