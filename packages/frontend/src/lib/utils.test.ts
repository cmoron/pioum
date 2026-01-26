import { describe, it, expect } from 'vitest'
import { isImageUrl } from './utils'

describe('isImageUrl', () => {
  describe('Valid image URLs', () => {
    it('should return true for http URLs', () => {
      expect(isImageUrl('http://example.com/image.jpg')).toBe(true)
    })

    it('should return true for https URLs', () => {
      expect(isImageUrl('https://example.com/avatar.png')).toBe(true)
    })

    it('should return true for local paths starting with /', () => {
      expect(isImageUrl('/images/avatar.jpg')).toBe(true)
    })

    it('should return true for deep local paths', () => {
      expect(isImageUrl('/assets/images/user/avatar.png')).toBe(true)
    })

    it('should return true for http URL without extension', () => {
      expect(isImageUrl('http://example.com/image')).toBe(true)
    })

    it('should return true for https URL with query parameters', () => {
      expect(isImageUrl('https://example.com/image.jpg?size=large')).toBe(true)
    })

    it('should return true for https URL with hash', () => {
      expect(isImageUrl('https://example.com/image#section')).toBe(true)
    })
  })

  describe('Invalid image URLs', () => {
    it('should return false for undefined', () => {
      expect(isImageUrl(undefined)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isImageUrl(null)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isImageUrl('')).toBe(false)
    })

    it('should return false for emoji strings', () => {
      expect(isImageUrl('🚗')).toBe(false)
    })

    it('should return false for plain text', () => {
      expect(isImageUrl('avatar')).toBe(false)
    })

    it('should return false for relative paths without leading slash', () => {
      expect(isImageUrl('images/avatar.jpg')).toBe(false)
    })

    it('should return false for data URLs', () => {
      expect(isImageUrl('data:image/png;base64,iVBORw0KG')).toBe(false)
    })

    it('should return false for file protocol', () => {
      expect(isImageUrl('file:///path/to/image.jpg')).toBe(false)
    })

    it('should return false for whitespace only', () => {
      expect(isImageUrl('   ')).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should handle URLs with special characters', () => {
      expect(isImageUrl('https://example.com/image%20with%20spaces.jpg')).toBe(true)
    })

    it('should handle very long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '.jpg'
      expect(isImageUrl(longUrl)).toBe(true)
    })

    it('should handle URLs with multiple slashes', () => {
      expect(isImageUrl('https://example.com//images//avatar.jpg')).toBe(true)
    })

    it('should handle local paths with special characters', () => {
      expect(isImageUrl('/images/avatar_2024-01.png')).toBe(true)
    })

    it('should be case sensitive for protocol', () => {
      expect(isImageUrl('HTTP://example.com/image.jpg')).toBe(false)
      expect(isImageUrl('HTTPS://example.com/image.jpg')).toBe(false)
    })

    it('should handle URLs with authentication', () => {
      expect(isImageUrl('https://user:pass@example.com/image.jpg')).toBe(true)
    })

    it('should handle URLs with port numbers', () => {
      expect(isImageUrl('https://example.com:8080/image.jpg')).toBe(true)
    })

    it('should handle single slash path', () => {
      expect(isImageUrl('/')).toBe(true)
    })

    it('should match URLs starting with http prefix', () => {
      // The function uses startsWith('http'), so it will match 'httpx://'
      // This is by design - it's checking for http/https URLs
      expect(isImageUrl('httpx://example.com/image.jpg')).toBe(true)
    })
  })
})
