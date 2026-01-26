import { describe, it, expect } from 'vitest'
import { signToken, verifyToken, JWTPayload } from './jwt'
import jwt from 'jsonwebtoken'

describe('JWT Utilities', () => {
  const mockPayload: JWTPayload = {
    userId: 'test-user-123',
    email: 'test@example.com'
  }

  describe('signToken', () => {
    it('should create a valid JWT token', () => {
      const token = signToken(mockPayload)
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT format: header.payload.signature
    })

    it('should include userId in token payload', () => {
      const token = signToken(mockPayload)
      const decoded = jwt.decode(token) as JWTPayload
      expect(decoded.userId).toBe(mockPayload.userId)
    })

    it('should include email in token payload when provided', () => {
      const token = signToken(mockPayload)
      const decoded = jwt.decode(token) as JWTPayload
      expect(decoded.email).toBe(mockPayload.email)
    })

    it('should set expiration time', () => {
      const token = signToken(mockPayload)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decoded = jwt.decode(token) as any
      expect(decoded.exp).toBeTruthy()
      expect(decoded.iat).toBeTruthy()
      // Token should expire in ~7 days (with some tolerance)
      const expiresIn = decoded.exp - decoded.iat
      expect(expiresIn).toBeGreaterThan(6 * 24 * 60 * 60) // > 6 days
      expect(expiresIn).toBeLessThan(8 * 24 * 60 * 60) // < 8 days
    })

    it('should create different tokens for different payloads', () => {
      const token1 = signToken({ userId: 'user1' })
      const token2 = signToken({ userId: 'user2' })
      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyToken', () => {
    it('should successfully verify a valid token', () => {
      const token = signToken(mockPayload)
      const verified = verifyToken(token)
      expect(verified.userId).toBe(mockPayload.userId)
      expect(verified.email).toBe(mockPayload.email)
    })

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here'
      expect(() => verifyToken(invalidToken)).toThrow()
    })

    it('should throw error for malformed token', () => {
      const malformedToken = 'not-a-jwt'
      expect(() => verifyToken(malformedToken)).toThrow()
    })

    it('should throw error for token with wrong signature', () => {
      // Create a token with a different secret
      const wrongToken = jwt.sign(mockPayload, 'wrong-secret', { expiresIn: '7d' })
      expect(() => verifyToken(wrongToken)).toThrow()
    })

    it('should verify token without email', () => {
      const payloadWithoutEmail: JWTPayload = { userId: 'user-no-email' }
      const token = signToken(payloadWithoutEmail)
      const verified = verifyToken(token)
      expect(verified.userId).toBe('user-no-email')
      expect(verified.email).toBeUndefined()
    })
  })

  describe('Round-trip signing and verification', () => {
    it('should correctly round-trip with full payload', () => {
      const originalPayload: JWTPayload = {
        userId: 'test-123',
        email: 'test@example.com'
      }
      const token = signToken(originalPayload)
      const verified = verifyToken(token)

      expect(verified.userId).toBe(originalPayload.userId)
      expect(verified.email).toBe(originalPayload.email)
    })

    it('should handle special characters in payload', () => {
      const specialPayload: JWTPayload = {
        userId: 'user-with-special-chars-!@#$%',
        email: 'test+filter@example.com'
      }
      const token = signToken(specialPayload)
      const verified = verifyToken(token)

      expect(verified.userId).toBe(specialPayload.userId)
      expect(verified.email).toBe(specialPayload.email)
    })
  })
})
