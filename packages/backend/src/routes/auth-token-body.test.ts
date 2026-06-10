import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    magicLink: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

import { app } from '../index.js'
import { prisma } from '../lib/prisma.js'

const mockMagicLinkFindUnique = vi.mocked(prisma.magicLink.findUnique)
const mockMagicLinkUpdate = vi.mocked(prisma.magicLink.update)

const user = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  avatar: null,
}

describe('POST /api/auth/magic-link/verify — token uniquement en cookie httpOnly', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMagicLinkFindUnique.mockResolvedValue({
      id: 'ml-1',
      token: 'valid-token',
      usedAt: null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      user,
    } as never)
    mockMagicLinkUpdate.mockResolvedValue({} as never)
  })

  it('renvoie le user sans le JWT dans le body', async () => {
    const res = await request(app)
      .post('/api/auth/magic-link/verify')
      .send({ token: 'valid-token' })

    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ id: 'user-1' })
    expect(res.body).not.toHaveProperty('token')
  })

  it('pose bien le JWT en cookie httpOnly', async () => {
    const res = await request(app)
      .post('/api/auth/magic-link/verify')
      .send({ token: 'valid-token' })

    const cookies = res.headers['set-cookie'] as unknown as string[]
    expect(cookies?.some((c) => c.startsWith('token=') && /httponly/i.test(c))).toBe(true)
  })
})
