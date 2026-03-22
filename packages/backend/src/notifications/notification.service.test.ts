import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    pushSubscription: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    groupMember: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@pushforge/builder', () => ({
  buildPushHTTPRequest: vi.fn(),
}))

import { prisma } from '../lib/prisma.js'
import { buildPushHTTPRequest } from '@pushforge/builder'
import {
  saveSubscription,
  removeSubscription,
  notifyUser,
  notifyGroupMembers,
  type WebPushSubscription,
  type PioumNotificationPayload,
} from './notification.service.js'

const mockUpsert = vi.mocked(prisma.pushSubscription.upsert)
const mockDeleteMany = vi.mocked(prisma.pushSubscription.deleteMany)
const mockFindUnique = vi.mocked(prisma.pushSubscription.findUnique)
const mockFindMany = vi.mocked(prisma.pushSubscription.findMany)
const mockGroupMemberFindMany = vi.mocked(prisma.groupMember.findMany)
const mockBuildPushHTTPRequest = vi.mocked(buildPushHTTPRequest)

const mockSub: WebPushSubscription = {
  endpoint: 'https://fcm.googleapis.com/push/abc123',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
}

const mockPayload: PioumNotificationPayload = {
  title: 'Nouvelle inscription',
  body: 'Alice s\'est inscrite à la séance',
  url: '/groups/g1/sessions/s1',
  type: 'NEW_INSCRIPTION',
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.VAPID_PRIVATE_KEY_JWK = JSON.stringify({ kty: 'EC', crv: 'P-256', d: 'test' })
  process.env.VAPID_EMAIL = 'mailto:test@example.com'
})

describe('saveSubscription', () => {
  it('upserts with correct data for a new subscription', async () => {
    mockUpsert.mockResolvedValue({})

    await saveSubscription('user-1', mockSub)

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: {
        endpoint: mockSub.endpoint,
        p256dh: mockSub.keys.p256dh,
        auth: mockSub.keys.auth,
      },
      create: {
        userId: 'user-1',
        endpoint: mockSub.endpoint,
        p256dh: mockSub.keys.p256dh,
        auth: mockSub.keys.auth,
      },
    })
  })

  it('throws if prisma upsert fails', async () => {
    mockUpsert.mockRejectedValue(new Error('DB error'))

    await expect(saveSubscription('user-1', mockSub)).rejects.toThrow('DB error')
  })

  it('throws 400 if endpoint does not start with https', async () => {
    const badSub = { ...mockSub, endpoint: 'http://insecure.example.com' }
    await expect(saveSubscription('user-1', badSub)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 if keys are missing', async () => {
    const badSub = { endpoint: mockSub.endpoint, keys: { p256dh: '', auth: '' } }
    await expect(saveSubscription('user-1', badSub)).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('removeSubscription', () => {
  it('deletes all subscriptions for the user', async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 })

    await removeSubscription('user-1')

    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
  })

  it('does not throw if the user has no subscription', async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 })

    await expect(removeSubscription('user-1')).resolves.toBeUndefined()
  })
})

describe('notifyUser', () => {
  it('returns early without sending if user has no subscription', async () => {
    mockFindUnique.mockResolvedValue(null)

    await notifyUser('user-1', mockPayload)

    expect(mockBuildPushHTTPRequest).not.toHaveBeenCalled()
  })

  it('builds and sends the push request when subscription exists', async () => {
    mockFindUnique.mockResolvedValue({
      userId: 'user-1',
      endpoint: mockSub.endpoint,
      p256dh: mockSub.keys.p256dh,
      auth: mockSub.keys.auth,
    })
    mockBuildPushHTTPRequest.mockResolvedValue({
      endpoint: mockSub.endpoint,
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array(),
    })
    const mockFetch = vi.fn().mockResolvedValue({ status: 201, ok: true })
    vi.stubGlobal('fetch', mockFetch)

    await notifyUser('user-1', mockPayload)

    expect(mockBuildPushHTTPRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription: { endpoint: mockSub.endpoint, keys: mockSub.keys },
        message: expect.objectContaining({
          payload: mockPayload,
        }),
      })
    )
    expect(mockFetch).toHaveBeenCalledWith(
      mockSub.endpoint,
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('removes the subscription when push endpoint returns 410', async () => {
    mockFindUnique.mockResolvedValue({
      userId: 'user-1',
      endpoint: mockSub.endpoint,
      p256dh: mockSub.keys.p256dh,
      auth: mockSub.keys.auth,
    })
    mockBuildPushHTTPRequest.mockResolvedValue({
      endpoint: mockSub.endpoint,
      headers: {},
      body: new Uint8Array(),
    })
    mockDeleteMany.mockResolvedValue({ count: 1 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 410, ok: false }))

    await notifyUser('user-1', mockPayload)

    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
  })

  it('throws when push endpoint returns a non-ok, non-410 status', async () => {
    mockFindUnique.mockResolvedValue({
      userId: 'user-1',
      endpoint: mockSub.endpoint,
      p256dh: mockSub.keys.p256dh,
      auth: mockSub.keys.auth,
    })
    mockBuildPushHTTPRequest.mockResolvedValue({
      endpoint: mockSub.endpoint,
      headers: {},
      body: new Uint8Array(),
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
      text: vi.fn().mockResolvedValue('Internal Server Error'),
    }))

    await expect(notifyUser('user-1', mockPayload)).rejects.toThrow('Push failed: 500')
  })
})

describe('notifyGroupMembers', () => {
  it('notifies all group members except the excluded user', async () => {
    mockGroupMemberFindMany.mockResolvedValue([
      { userId: 'user-2' },
      { userId: 'user-3' },
    ])
    // Aucune souscription trouvée → aucun push envoyé
    mockFindMany.mockResolvedValue([])

    await notifyGroupMembers('group-1', 'user-1', mockPayload)

    expect(mockGroupMemberFindMany).toHaveBeenCalledWith({
      where: { groupId: 'group-1', userId: { not: 'user-1' } },
      select: { userId: true },
    })
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: { in: ['user-2', 'user-3'] } },
    })
  })

  it('resolves even if one member notification fails', async () => {
    mockGroupMemberFindMany.mockResolvedValue([
      { userId: 'user-2' },
      { userId: 'user-3' },
    ])
    mockFindMany.mockResolvedValue([
      { userId: 'user-2', endpoint: mockSub.endpoint, p256dh: mockSub.keys.p256dh, auth: mockSub.keys.auth },
    ])
    mockBuildPushHTTPRequest.mockRejectedValue(new Error('VAPID sign failed'))

    await expect(notifyGroupMembers('group-1', 'user-1', mockPayload)).resolves.toBeUndefined()
  })

  it('does nothing when the group has no other members', async () => {
    mockGroupMemberFindMany.mockResolvedValue([])

    await notifyGroupMembers('group-1', 'user-1', mockPayload)

    expect(mockFindMany).not.toHaveBeenCalled()
  })
})
