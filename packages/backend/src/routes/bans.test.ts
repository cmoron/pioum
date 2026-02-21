import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import '../middleware/auth.js'
import { USER_SELECT } from '../lib/prismaSelects.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    groupMember: {
      findMany: vi.fn()
    },
    user: {
      findMany: vi.fn()
    }
  }
}))

import { prisma } from '../lib/prisma.js'

const mockGroupMemberFindMany = prisma.groupMember.findMany as unknown as ReturnType<typeof vi.fn>
const mockUserFindMany = prisma.user.findMany as unknown as ReturnType<typeof vi.fn>

/**
 * Extracted route handler logic for unit testing.
 * Mirrors the handler in bans.ts GET /bannable-users.
 */
async function bannableUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const myMemberships = await prisma.groupMember.findMany({
      where: { userId: req.user!.userId },
      select: { groupId: true }
    })

    const myGroupIds = myMemberships.map((m: { groupId: string }) => m.groupId)

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user!.userId },
        memberships: {
          some: {
            groupId: { in: myGroupIds }
          }
        }
      },
      select: USER_SELECT
    })

    res.json({ users })
  } catch (error) {
    next(error)
  }
}

describe('GET /bans/bannable-users', () => {
  let mockReq: Record<string, unknown>
  let mockRes: Record<string, unknown>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      params: {},
      query: {},
      headers: {},
      cookies: {},
      user: { userId: 'user-123' }
    }
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    }
    mockNext = vi.fn()
    vi.clearAllMocks()
  })

  describe('Successful retrieval', () => {
    it('should return users sharing at least one group with current user', async () => {
      mockGroupMemberFindMany.mockResolvedValue([
        { groupId: 'group-1' },
        { groupId: 'group-2' }
      ])
      const mockUsers = [
        { id: 'user-456', name: 'Alice', avatarId: null, customAvatarUrl: null, avatar: null },
        { id: 'user-789', name: 'Bob', avatarId: null, customAvatarUrl: null, avatar: null }
      ]
      mockUserFindMany.mockResolvedValue(mockUsers)

      await bannableUsersHandler(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      )

      expect(mockRes.json as ReturnType<typeof vi.fn>).toHaveBeenCalledWith({ users: mockUsers })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should query memberships for the authenticated user', async () => {
      mockGroupMemberFindMany.mockResolvedValue([])
      mockUserFindMany.mockResolvedValue([])

      await bannableUsersHandler(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      )

      expect(mockGroupMemberFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        select: { groupId: true }
      })
    })

    it('should exclude the current user from the results', async () => {
      mockGroupMemberFindMany.mockResolvedValue([{ groupId: 'group-1' }])
      mockUserFindMany.mockResolvedValue([])

      await bannableUsersHandler(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      )

      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 'user-123' }
          })
        })
      )
    })

    it('should filter users by the current user group ids', async () => {
      mockGroupMemberFindMany.mockResolvedValue([
        { groupId: 'group-1' },
        { groupId: 'group-2' }
      ])
      mockUserFindMany.mockResolvedValue([])

      await bannableUsersHandler(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      )

      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            memberships: {
              some: {
                groupId: { in: ['group-1', 'group-2'] }
              }
            }
          })
        })
      )
    })

    it('should return empty list when current user has no groups', async () => {
      mockGroupMemberFindMany.mockResolvedValue([])
      mockUserFindMany.mockResolvedValue([])

      await bannableUsersHandler(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      )

      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            memberships: { some: { groupId: { in: [] } } }
          })
        })
      )
      expect(mockRes.json as ReturnType<typeof vi.fn>).toHaveBeenCalledWith({ users: [] })
    })

    it('should use USER_SELECT for the user query', async () => {
      mockGroupMemberFindMany.mockResolvedValue([{ groupId: 'group-1' }])
      mockUserFindMany.mockResolvedValue([])

      await bannableUsersHandler(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      )

      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ select: USER_SELECT })
      )
    })
  })

  describe('Error handling', () => {
    it('should pass groupMember query errors to next middleware', async () => {
      const dbError = new Error('Database connection failed')
      mockGroupMemberFindMany.mockRejectedValue(dbError)

      await bannableUsersHandler(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(dbError)
      expect(mockRes.json as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
    })

    it('should pass user query errors to next middleware', async () => {
      mockGroupMemberFindMany.mockResolvedValue([{ groupId: 'group-1' }])
      const dbError = new Error('User query failed')
      mockUserFindMany.mockRejectedValue(dbError)

      await bannableUsersHandler(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(dbError)
      expect(mockRes.json as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
    })
  })
})
