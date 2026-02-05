import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler.js'
import '../middleware/auth.js' // Import for Express.Request.user type augmentation

// Mock prisma before importing
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    groupMember: {
      findUnique: vi.fn()
    },
    session: {
      findMany: vi.fn()
    }
  }
}))

import { prisma } from '../lib/prisma.js'

const mockGroupMemberFindUnique = prisma.groupMember.findUnique as unknown as ReturnType<typeof vi.fn>
const mockSessionFindMany = prisma.session.findMany as unknown as ReturnType<typeof vi.fn>

/**
 * Extracted route handler logic for unit testing.
 * Mirrors the handler in sessions.ts GET /range/:groupId.
 */
async function rangeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = req.params.groupId as string
    const from = req.query.from as string | undefined
    const to = req.query.to as string | undefined

    if (!from || !to) {
      throw new AppError(400, 'Both "from" and "to" query parameters are required')
    }

    const fromDate = new Date(from)
    const toDate = new Date(to)

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new AppError(400, 'Invalid date format for "from" or "to"')
    }

    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId
        }
      }
    })

    if (!membership) {
      throw new AppError(403, 'Not a member of this group')
    }

    const sessions = await prisma.session.findMany({
      where: {
        groupId,
        date: {
          gte: fromDate,
          lte: toDate
        }
      },
      include: {
        cars: {
          include: {
            driver: true,
            userCar: true,
            passengers: true
          }
        },
        passengers: {
          include: {
            user: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    })

    res.json({ sessions })
  } catch (error) {
    next(error)
  }
}

describe('GET /sessions/range/:groupId', () => {
  let mockReq: Record<string, unknown>
  let mockRes: Record<string, unknown>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      params: {},
      query: {},
      headers: {},
      cookies: {}
    }
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    }
    mockNext = vi.fn()
    vi.clearAllMocks()
  })

  describe('Query parameter validation', () => {
    beforeEach(() => {
      mockReq.user = { userId: 'user-123' }
      mockReq.params = { groupId: 'group-123' }
    })

    it('should return 400 when "from" parameter is missing', async () => {
      mockReq.query = { to: '2024-01-31' }

      await rangeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Both "from" and "to" query parameters are required'
        })
      )
    })

    it('should return 400 when "to" parameter is missing', async () => {
      mockReq.query = { from: '2024-01-01' }

      await rangeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Both "from" and "to" query parameters are required'
        })
      )
    })

    it('should return 400 when both parameters are missing', async () => {
      mockReq.query = {}

      await rangeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Both "from" and "to" query parameters are required'
        })
      )
    })

    it('should return 400 when "from" date is invalid', async () => {
      mockReq.query = { from: 'not-a-date', to: '2024-01-31' }

      await rangeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Invalid date format for "from" or "to"'
        })
      )
    })

    it('should return 400 when "to" date is invalid', async () => {
      mockReq.query = { from: '2024-01-01', to: 'invalid-date' }

      await rangeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Invalid date format for "from" or "to"'
        })
      )
    })
  })

  describe('Group membership verification', () => {
    beforeEach(() => {
      mockReq.user = { userId: 'user-123' }
      mockReq.params = { groupId: 'group-456' }
      mockReq.query = { from: '2024-01-01', to: '2024-01-31' }
    })

    it('should return 403 when user is not a group member', async () => {
      mockGroupMemberFindUnique.mockResolvedValue(null)

      await rangeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

      expect(mockGroupMemberFindUnique).toHaveBeenCalledWith({
        where: {
          userId_groupId: {
            userId: 'user-123',
            groupId: 'group-456'
          }
        }
      })
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Not a member of this group'
        })
      )
    })
  })

  describe('Successful session retrieval', () => {
    beforeEach(() => {
      mockReq.user = { userId: 'user-123' }
      mockReq.params = { groupId: 'group-456' }
      mockReq.query = { from: '2024-01-01', to: '2024-01-31' }

      mockGroupMemberFindUnique.mockResolvedValue({
        userId: 'user-123',
        groupId: 'group-456',
        role: 'member'
      })
    })

    it('should return sessions when user is a member', async () => {
      const mockSessions = [
        { id: 'session-1', groupId: 'group-456', cars: [], passengers: [] }
      ]
      mockSessionFindMany.mockResolvedValue(mockSessions)

      await rangeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

      expect((mockRes.json as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({ sessions: mockSessions })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return empty array when no sessions exist in range', async () => {
      mockSessionFindMany.mockResolvedValue([])

      await rangeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

      expect((mockRes.json as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({ sessions: [] })
    })

    it('should pass correct date range to prisma query', async () => {
      mockSessionFindMany.mockResolvedValue([])

      await rangeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

      expect(mockSessionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            groupId: 'group-456',
            date: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-01-31')
            }
          }
        })
      )
    })

    it('should order sessions by startTime ascending', async () => {
      mockSessionFindMany.mockResolvedValue([])

      await rangeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

      expect(mockSessionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { startTime: 'asc' }
        })
      )
    })

    it('should include cars and passengers in query', async () => {
      mockSessionFindMany.mockResolvedValue([])

      await rangeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

      expect(mockSessionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            cars: expect.any(Object),
            passengers: expect.any(Object)
          })
        })
      )
    })
  })

  describe('Error handling', () => {
    beforeEach(() => {
      mockReq.user = { userId: 'user-123' }
      mockReq.params = { groupId: 'group-456' }
      mockReq.query = { from: '2024-01-01', to: '2024-01-31' }
      mockGroupMemberFindUnique.mockResolvedValue({
        userId: 'user-123',
        groupId: 'group-456',
        role: 'member'
      })
    })

    it('should pass database errors to next middleware', async () => {
      const dbError = new Error('Database connection failed')
      mockSessionFindMany.mockRejectedValue(dbError)

      await rangeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(dbError)
    })

    it('should pass membership check errors to next middleware', async () => {
      const dbError = new Error('Database unavailable')
      mockGroupMemberFindUnique.mockRejectedValue(dbError)

      await rangeHandler(mockReq as unknown as Request, mockRes as unknown as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(dbError)
    })
  })
})
