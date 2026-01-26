import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { authenticate } from './auth'
import { AppError } from './errorHandler'
import * as jwtLib from '../lib/jwt'

// Mock the jwt library
vi.mock('../lib/jwt', () => ({
  verifyToken: vi.fn()
}))

describe('authenticate middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {}
    }
    mockRes = {}
    mockNext = vi.fn()
    vi.clearAllMocks()
  })

  describe('No token provided', () => {
    it('should call next with AppError when no token in headers or cookies', () => {
      authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Authentication required',
          code: 'UNAUTHORIZED'
        })
      )
      expect(mockNext).toHaveBeenCalledTimes(1)
    })

    it('should call next with AppError when authorization header is empty', () => {
      mockReq.headers = { authorization: '' }
      authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      )
    })

    it('should call next with AppError when authorization header does not start with Bearer', () => {
      mockReq.headers = { authorization: 'Basic abc123' }
      authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      )
    })
  })

  describe('Token from Authorization header', () => {
    it('should successfully authenticate with Bearer token', () => {
      const mockPayload = { userId: 'user-123', email: 'test@example.com' }
      vi.mocked(jwtLib.verifyToken).mockReturnValue(mockPayload)

      mockReq.headers = { authorization: 'Bearer valid-token' }
      authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(jwtLib.verifyToken).toHaveBeenCalledWith('valid-token')
      expect(mockReq.user).toEqual(mockPayload)
      expect(mockNext).toHaveBeenCalledWith()
      expect(mockNext).toHaveBeenCalledTimes(1)
    })

    it('should extract token correctly from Bearer header', () => {
      const mockPayload = { userId: 'user-456' }
      vi.mocked(jwtLib.verifyToken).mockReturnValue(mockPayload)

      mockReq.headers = { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' }
      authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(jwtLib.verifyToken).toHaveBeenCalledWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
      expect(mockReq.user).toEqual(mockPayload)
    })

    it('should handle token with extra spaces in header', () => {
      const mockPayload = { userId: 'user-789' }
      vi.mocked(jwtLib.verifyToken).mockReturnValue(mockPayload)

      mockReq.headers = { authorization: 'Bearer  token-with-spaces' }
      authenticate(mockReq as Request, mockRes as Response, mockNext)

      // Should extract everything after 'Bearer ' (including the extra space)
      expect(jwtLib.verifyToken).toHaveBeenCalledWith(' token-with-spaces')
    })
  })

  describe('Token from cookie', () => {
    it('should successfully authenticate with cookie token', () => {
      const mockPayload = { userId: 'cookie-user', email: 'cookie@example.com' }
      vi.mocked(jwtLib.verifyToken).mockReturnValue(mockPayload)

      mockReq.cookies = { token: 'cookie-token' }
      authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(jwtLib.verifyToken).toHaveBeenCalledWith('cookie-token')
      expect(mockReq.user).toEqual(mockPayload)
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should prefer Authorization header over cookie when both present', () => {
      const mockPayload = { userId: 'header-user' }
      vi.mocked(jwtLib.verifyToken).mockReturnValue(mockPayload)

      mockReq.headers = { authorization: 'Bearer header-token' }
      mockReq.cookies = { token: 'cookie-token' }
      authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(jwtLib.verifyToken).toHaveBeenCalledWith('header-token')
      expect(jwtLib.verifyToken).not.toHaveBeenCalledWith('cookie-token')
    })
  })

  describe('Invalid token handling', () => {
    it('should call next with AppError when token verification fails', () => {
      vi.mocked(jwtLib.verifyToken).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      mockReq.headers = { authorization: 'Bearer invalid-token' }
      authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        })
      )
    })

    it('should handle expired token', () => {
      vi.mocked(jwtLib.verifyToken).mockImplementation(() => {
        throw new Error('jwt expired')
      })

      mockReq.headers = { authorization: 'Bearer expired-token' }
      authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockNextFn = mockNext as any
      const error = mockNextFn.mock.calls[0][0] as AppError
      expect(error.code).toBe('INVALID_TOKEN')
    })

    it('should not set user on request when verification fails', () => {
      vi.mocked(jwtLib.verifyToken).mockImplementation(() => {
        throw new Error('Verification failed')
      })

      mockReq.headers = { authorization: 'Bearer bad-token' }
      authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.user).toBeUndefined()
    })
  })

  describe('User payload handling', () => {
    it('should set user with userId only', () => {
      const mockPayload = { userId: 'simple-user' }
      vi.mocked(jwtLib.verifyToken).mockReturnValue(mockPayload)

      mockReq.headers = { authorization: 'Bearer token' }
      authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.user).toEqual({ userId: 'simple-user' })
    })

    it('should set user with userId and email', () => {
      const mockPayload = { userId: 'full-user', email: 'full@example.com' }
      vi.mocked(jwtLib.verifyToken).mockReturnValue(mockPayload)

      mockReq.headers = { authorization: 'Bearer token' }
      authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.user).toEqual({
        userId: 'full-user',
        email: 'full@example.com'
      })
    })
  })
})
