import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import './auth.js' // loads the Express.Request.user augmentation
import { requireAdmin } from './requireAdmin'
import { AppError } from './errorHandler'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma.js'

const mockFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>

describe('requireAdmin middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = { user: { userId: 'user-1' } }
    mockRes = {}
    mockNext = vi.fn()
    vi.clearAllMocks()
  })

  it('rejects with 401 when no authenticated user', async () => {
    mockReq.user = undefined
    await requireAdmin(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }),
    )
  })

  it('rejects with 403 when the user is not an admin', async () => {
    mockFindUnique.mockResolvedValue({ role: 'user' })
    await requireAdmin(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' }),
    )
  })

  it('rejects with 403 when the user no longer exists', async () => {
    mockFindUnique.mockResolvedValue(null)
    await requireAdmin(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
    const err = (mockNext as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError
    expect(err.statusCode).toBe(403)
  })

  it('passes through (next with no args) for an admin', async () => {
    mockFindUnique.mockResolvedValue({ role: 'admin' })
    await requireAdmin(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalledTimes(1)
    expect(mockNext).toHaveBeenCalledWith()
  })

  it('reads the role from the DB by the authenticated user id', async () => {
    mockFindUnique.mockResolvedValue({ role: 'admin' })
    await requireAdmin(mockReq as Request, mockRes as Response, mockNext)

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { role: true },
    })
  })
})
