import { describe, it, expect } from 'vitest'
import { Request } from 'express'
import { getParam } from './params'

describe('getParam', () => {
  it('should return a string parameter', () => {
    const mockReq = {
      params: { id: 'test-123' }
    } as unknown as Request

    const result = getParam(mockReq, 'id')
    expect(result).toBe('test-123')
  })

  it('should return first element when parameter is an array', () => {
    const mockReq = {
      params: { id: ['first', 'second', 'third'] }
    } as unknown as Request

    const result = getParam(mockReq, 'id')
    expect(result).toBe('first')
  })

  it('should return undefined when parameter does not exist', () => {
    const mockReq = {
      params: {}
    } as unknown as Request

    const result = getParam(mockReq, 'nonexistent')
    expect(result).toBeUndefined()
  })

  it('should handle empty string parameter', () => {
    const mockReq = {
      params: { id: '' }
    } as unknown as Request

    const result = getParam(mockReq, 'id')
    expect(result).toBe('')
  })

  it('should handle numeric strings', () => {
    const mockReq = {
      params: { id: '12345' }
    } as unknown as Request

    const result = getParam(mockReq, 'id')
    expect(result).toBe('12345')
  })

  it('should handle special characters in parameter', () => {
    const mockReq = {
      params: { code: 'ABC-123_xyz' }
    } as unknown as Request

    const result = getParam(mockReq, 'code')
    expect(result).toBe('ABC-123_xyz')
  })

  it('should return first element from empty array', () => {
    const mockReq = {
      params: { id: [] }
    } as unknown as Request

    const result = getParam(mockReq, 'id')
    expect(result).toBeUndefined()
  })

  it('should handle multiple different parameters', () => {
    const mockReq = {
      params: {
        userId: 'user-123',
        groupId: 'group-456',
        sessionId: 'session-789'
      }
    } as unknown as Request

    expect(getParam(mockReq, 'userId')).toBe('user-123')
    expect(getParam(mockReq, 'groupId')).toBe('group-456')
    expect(getParam(mockReq, 'sessionId')).toBe('session-789')
  })
})
