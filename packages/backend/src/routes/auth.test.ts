import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../index.js'

describe('Auth API', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health')
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('status', 'ok')
      expect(res.body).toHaveProperty('timestamp')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return null user when not authenticated', async () => {
      const res = await request(app).get('/api/auth/me')
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('user', null)
    })
  })

  describe('POST /api/auth/magic-link', () => {
    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/magic-link')
        .send({ email: 'invalid-email' })
      expect(res.status).toBe(400)
    })
  })
})
