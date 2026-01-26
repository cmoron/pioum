import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendMagicLinkEmail } from './email'

// Mock nodemailer - declare mockSendMail first
vi.mock('nodemailer', () => {
  const mockSendMail = vi.fn()
  return {
    default: {
      createTransport: vi.fn(() => ({
        sendMail: mockSendMail
      }))
    },
    mockSendMail
  }
})

// Get the mock from the module
const nodemailerModule = await import('nodemailer')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSendMail = (nodemailerModule as any).mockSendMail

describe('sendMagicLinkEmail', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    // Mock console.log to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('Development mode', () => {
    it('should return magic link URL in development', async () => {
      process.env.NODE_ENV = 'development'
      process.env.FRONTEND_URL = 'http://localhost:5173'
      delete process.env.SMTP_HOST

      const email = 'test@example.com'
      const token = 'test-token-123'

      const result = await sendMagicLinkEmail(email, token)

      expect(result).toBe('http://localhost:5173/auth/verify?token=test-token-123')
      expect(mockSendMail).not.toHaveBeenCalled()
    })

    it('should use default frontend URL when not set', async () => {
      delete process.env.NODE_ENV
      delete process.env.SMTP_HOST
      delete process.env.FRONTEND_URL

      const result = await sendMagicLinkEmail('user@test.com', 'token-abc')

      expect(result).toBe('http://localhost:5173/auth/verify?token=token-abc')
    })

    it('should log magic link to console in development', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log')
      delete process.env.SMTP_HOST

      await sendMagicLinkEmail('dev@test.com', 'dev-token')

      expect(consoleLogSpy).toHaveBeenCalled()
      expect(consoleLogSpy.mock.calls.some(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('MAGIC LINK'))
      )).toBe(true)
    })

    it('should handle special characters in token', async () => {
      delete process.env.SMTP_HOST
      const specialToken = 'token-with-special_chars.123'

      const result = await sendMagicLinkEmail('test@example.com', specialToken)

      expect(result).toContain(specialToken)
      expect(result).toBe(`http://localhost:5173/auth/verify?token=${specialToken}`)
    })
  })

  describe('Production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      process.env.SMTP_HOST = 'smtp.example.com'
      process.env.SMTP_PORT = '587'
      process.env.SMTP_USER = 'test@example.com'
      process.env.SMTP_PASS = 'password'
      process.env.SMTP_FROM = 'Pioum <noreply@pioum.app>'
      process.env.FRONTEND_URL = 'https://pioum.app'
    })

    it('should send email and return null in production', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' })

      const result = await sendMagicLinkEmail('user@example.com', 'prod-token')

      expect(result).toBeNull()
      expect(mockSendMail).toHaveBeenCalledTimes(1)
    })

    it('should send email with correct recipient', async () => {
      mockSendMail.mockResolvedValue({})
      const email = 'recipient@example.com'

      await sendMagicLinkEmail(email, 'token')

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email
        })
      )
    })

    it('should include magic link in email HTML', async () => {
      mockSendMail.mockResolvedValue({})
      const token = 'magic-token-xyz'

      await sendMagicLinkEmail('user@test.com', token)

      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.html).toContain('https://pioum.app/auth/verify?token=magic-token-xyz')
    })

    it('should use configured SMTP_FROM address', async () => {
      mockSendMail.mockResolvedValue({})
      process.env.SMTP_FROM = 'Custom App <custom@example.com>'

      await sendMagicLinkEmail('user@test.com', 'token')

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Custom App <custom@example.com>'
        })
      )
    })

    it('should have correct email subject', async () => {
      mockSendMail.mockResolvedValue({})

      await sendMagicLinkEmail('user@test.com', 'token')

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Connexion à Pioum'
        })
      )
    })

    it('should include HTML content', async () => {
      mockSendMail.mockResolvedValue({})

      await sendMagicLinkEmail('user@test.com', 'token')

      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.html).toBeTruthy()
      expect(callArgs.html).toContain('Pioum')
      expect(callArgs.html).toContain('Se connecter')
      expect(callArgs.html).toContain('15 minutes')
    })
  })

  describe('Error handling', () => {
    it('should propagate email sending errors', async () => {
      process.env.NODE_ENV = 'production'
      process.env.SMTP_HOST = 'smtp.example.com'

      const emailError = new Error('SMTP connection failed')
      mockSendMail.mockRejectedValue(emailError)

      await expect(
        sendMagicLinkEmail('user@test.com', 'token')
      ).rejects.toThrow('SMTP connection failed')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty email', async () => {
      delete process.env.SMTP_HOST

      const result = await sendMagicLinkEmail('', 'token')

      expect(result).toBeTruthy()
      expect(result).toContain('token')
    })

    it('should handle very long tokens', async () => {
      delete process.env.SMTP_HOST
      const longToken = 'a'.repeat(500)

      const result = await sendMagicLinkEmail('test@test.com', longToken)

      expect(result).toContain(longToken)
    })

    it('should use custom frontend URL', async () => {
      delete process.env.SMTP_HOST
      process.env.FRONTEND_URL = 'https://custom-domain.com'

      const result = await sendMagicLinkEmail('test@test.com', 'token')

      expect(result).toBe('https://custom-domain.com/auth/verify?token=token')
    })
  })
})
