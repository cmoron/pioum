import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { AppError, errorHandler } from './errorHandler'
import { z } from 'zod'

describe('AppError', () => {
  it('should create an error with statusCode and message', () => {
    const error = new AppError(404, 'Not found')
    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('Not found')
    expect(error.name).toBe('AppError')
  })

  it('should create an error with optional code', () => {
    const error = new AppError(401, 'Unauthorized', 'AUTH_FAILED')
    expect(error.statusCode).toBe(401)
    expect(error.message).toBe('Unauthorized')
    expect(error.code).toBe('AUTH_FAILED')
  })

  it('should be instanceof Error', () => {
    const error = new AppError(500, 'Internal error')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AppError)
  })

  it('should have correct error name', () => {
    const error = new AppError(400, 'Bad request')
    expect(error.name).toBe('AppError')
  })
})

describe('errorHandler', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let jsonSpy: ReturnType<typeof vi.fn>
  let statusSpy: ReturnType<typeof vi.fn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockReq = {}
    jsonSpy = vi.fn()
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy })
    mockRes = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: statusSpy as any
    }
    mockNext = vi.fn()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('AppError handling', () => {
    it('should handle AppError with correct status and message', () => {
      const error = new AppError(404, 'Resource not found')
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(statusSpy).toHaveBeenCalledWith(404)
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Resource not found',
        code: undefined
      })
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should handle AppError with error code', () => {
      const error = new AppError(401, 'Invalid token', 'INVALID_TOKEN')
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(statusSpy).toHaveBeenCalledWith(401)
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      })
    })

    it('should handle various status codes correctly', () => {
      const testCases = [
        { status: 400, message: 'Bad Request', code: 'BAD_REQUEST' },
        { status: 403, message: 'Forbidden', code: 'FORBIDDEN' },
        { status: 409, message: 'Conflict', code: 'CONFLICT' }
      ]

      testCases.forEach(({ status, message, code }) => {
        const error = new AppError(status, message, code)
        errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

        expect(statusSpy).toHaveBeenCalledWith(status)
        expect(jsonSpy).toHaveBeenCalledWith({ error: message, code })
      })
    })
  })

  describe('ZodError handling', () => {
    it('should handle ZodError with validation details', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18)
      })

      try {
        schema.parse({ email: 'invalid', age: 15 })
      } catch (err) {
        errorHandler(err as Error, mockReq as Request, mockRes as Response, mockNext)

        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith({
          error: 'Validation error',
          details: expect.any(Array)
        })
      }
    })

    it('should include validation error details', () => {
      const schema = z.object({
        name: z.string().min(3)
      })

      try {
        schema.parse({ name: 'ab' })
      } catch (err) {
        errorHandler(err as Error, mockReq as Request, mockRes as Response, mockNext)

        const callArgs = jsonSpy.mock.calls[0][0]
        expect(callArgs.error).toBe('Validation error')
        expect(callArgs.details).toBeDefined()
        expect(Array.isArray(callArgs.details)).toBe(true)
      }
    })
  })

  describe('Generic error handling', () => {
    it('should handle generic Error as 500 internal server error', () => {
      const error = new Error('Something went wrong')
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(statusSpy).toHaveBeenCalledWith(500)
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Internal server error'
      })
    })

    it('should log all errors to console', () => {
      const error = new Error('Test error')
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', error)
    })

    it('should handle unknown error types', () => {
      const error = new TypeError('Type error occurred')
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(statusSpy).toHaveBeenCalledWith(500)
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Internal server error'
      })
    })
  })

  describe('Error logging', () => {
    it('should log AppError to console', () => {
      const error = new AppError(404, 'Not found')
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', error)
    })

    it('should log ZodError to console', () => {
      const schema = z.string()
      try {
        schema.parse(123)
      } catch (err) {
        errorHandler(err as Error, mockReq as Request, mockRes as Response, mockNext)
        expect(consoleErrorSpy).toHaveBeenCalled()
      }
    })
  })
})
