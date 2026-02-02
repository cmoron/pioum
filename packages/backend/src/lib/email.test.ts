import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Resend
const mockResendSend = vi.fn()
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = { send: mockResendSend }
    }
  }
})

// Mock nodemailer
const mockSendMail = vi.fn()
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail
    }))
  }
}))

describe('sendMagicLinkEmail', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = { ...originalEnv }
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('Development mode (no email provider)', () => {
    it('should return magic link URL in development without providers', async () => {
      process.env.NODE_ENV = 'development'
      process.env.FRONTEND_URL = 'http://localhost:5173'
      delete process.env.RESEND_API_KEY
      delete process.env.SMTP_HOST

      const { sendMagicLinkEmail } = await import('./email')
      const result = await sendMagicLinkEmail('test@example.com', 'test-token-123')

      expect(result).toBe('http://localhost:5173/auth/verify?token=test-token-123')
    })

    it('should use default frontend URL when not set', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.RESEND_API_KEY
      delete process.env.SMTP_HOST
      delete process.env.FRONTEND_URL

      const { sendMagicLinkEmail } = await import('./email')
      const result = await sendMagicLinkEmail('user@test.com', 'token-abc')

      expect(result).toBe('http://localhost:5173/auth/verify?token=token-abc')
    })

    it('should log magic link to console in development', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log')
      process.env.NODE_ENV = 'development'
      delete process.env.RESEND_API_KEY
      delete process.env.SMTP_HOST

      const { sendMagicLinkEmail } = await import('./email')
      await sendMagicLinkEmail('dev@test.com', 'dev-token')

      expect(consoleLogSpy).toHaveBeenCalled()
      expect(consoleLogSpy.mock.calls.some(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('MAGIC LINK'))
      )).toBe(true)
    })

    it('should handle special characters in token', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.RESEND_API_KEY
      delete process.env.SMTP_HOST
      process.env.FRONTEND_URL = 'http://localhost:5173'
      const specialToken = 'token-with-special_chars.123'

      const { sendMagicLinkEmail } = await import('./email')
      const result = await sendMagicLinkEmail('test@example.com', specialToken)

      expect(result).toContain(specialToken)
      expect(result).toBe(`http://localhost:5173/auth/verify?token=${specialToken}`)
    })
  })

  describe('Resend provider', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      process.env.RESEND_API_KEY = 're_test_key'
      process.env.EMAIL_FROM = 'Pioum <noreply@pioum.app>'
      process.env.FRONTEND_URL = 'https://pioum.app'
      delete process.env.SMTP_HOST
    })

    it('should send email via Resend and return null', async () => {
      mockResendSend.mockResolvedValue({ data: { id: 'test-id' }, error: null })

      const { sendMagicLinkEmail } = await import('./email')
      const result = await sendMagicLinkEmail('user@example.com', 'prod-token')

      expect(result).toBeNull()
      expect(mockResendSend).toHaveBeenCalledTimes(1)
    })

    it('should send email with correct recipient', async () => {
      mockResendSend.mockResolvedValue({ data: { id: 'test-id' }, error: null })
      const email = 'recipient@example.com'

      const { sendMagicLinkEmail } = await import('./email')
      await sendMagicLinkEmail(email, 'token')

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({ to: email })
      )
    })

    it('should include magic link in email HTML', async () => {
      mockResendSend.mockResolvedValue({ data: { id: 'test-id' }, error: null })
      const token = 'magic-token-xyz'

      const { sendMagicLinkEmail } = await import('./email')
      await sendMagicLinkEmail('user@test.com', token)

      const callArgs = mockResendSend.mock.calls[0][0]
      expect(callArgs.html).toContain('https://pioum.app/auth/verify?token=magic-token-xyz')
    })

    it('should use configured EMAIL_FROM address', async () => {
      mockResendSend.mockResolvedValue({ data: { id: 'test-id' }, error: null })
      process.env.EMAIL_FROM = 'Custom App <custom@example.com>'

      const { sendMagicLinkEmail } = await import('./email')
      await sendMagicLinkEmail('user@test.com', 'token')

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'Custom App <custom@example.com>' })
      )
    })

    it('should have correct email subject', async () => {
      mockResendSend.mockResolvedValue({ data: { id: 'test-id' }, error: null })

      const { sendMagicLinkEmail } = await import('./email')
      await sendMagicLinkEmail('user@test.com', 'token')

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Connexion à Pioum' })
      )
    })

    it('should throw error when Resend fails', async () => {
      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key' }
      })

      const { sendMagicLinkEmail } = await import('./email')

      await expect(sendMagicLinkEmail('user@test.com', 'token'))
        .rejects.toThrow('Failed to send email: Invalid API key')
    })
  })

  describe('SMTP fallback', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      delete process.env.RESEND_API_KEY
      process.env.SMTP_HOST = 'smtp.example.com'
      process.env.SMTP_PORT = '587'
      process.env.SMTP_USER = 'test@example.com'
      process.env.SMTP_PASS = 'password'
      process.env.EMAIL_FROM = 'Pioum <noreply@pioum.app>'
      process.env.FRONTEND_URL = 'https://pioum.app'
    })

    it('should send email via SMTP and return null', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' })

      const { sendMagicLinkEmail } = await import('./email')
      const result = await sendMagicLinkEmail('user@example.com', 'prod-token')

      expect(result).toBeNull()
      expect(mockSendMail).toHaveBeenCalledTimes(1)
    })

    it('should propagate SMTP errors', async () => {
      const emailError = new Error('SMTP connection failed')
      mockSendMail.mockRejectedValue(emailError)

      const { sendMagicLinkEmail } = await import('./email')

      await expect(sendMagicLinkEmail('user@test.com', 'token'))
        .rejects.toThrow('SMTP connection failed')
    })
  })

  describe('Production without email provider', () => {
    it('should throw error when no provider configured in production', async () => {
      process.env.NODE_ENV = 'production'
      delete process.env.RESEND_API_KEY
      delete process.env.SMTP_HOST

      const { sendMagicLinkEmail } = await import('./email')

      await expect(sendMagicLinkEmail('user@test.com', 'token'))
        .rejects.toThrow('Email service not configured')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty email', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.RESEND_API_KEY
      delete process.env.SMTP_HOST

      const { sendMagicLinkEmail } = await import('./email')
      const result = await sendMagicLinkEmail('', 'token')

      expect(result).toBeTruthy()
      expect(result).toContain('token')
    })

    it('should handle very long tokens', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.RESEND_API_KEY
      delete process.env.SMTP_HOST
      const longToken = 'a'.repeat(500)

      const { sendMagicLinkEmail } = await import('./email')
      const result = await sendMagicLinkEmail('test@test.com', longToken)

      expect(result).toContain(longToken)
    })

    it('should use custom frontend URL', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.RESEND_API_KEY
      delete process.env.SMTP_HOST
      process.env.FRONTEND_URL = 'https://custom-domain.com'

      const { sendMagicLinkEmail } = await import('./email')
      const result = await sendMagicLinkEmail('test@test.com', 'token')

      expect(result).toBe('https://custom-domain.com/auth/verify?token=token')
    })
  })
})
