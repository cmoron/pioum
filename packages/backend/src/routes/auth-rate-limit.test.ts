import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../index.js'

describe('POST /api/auth/magic-link — rate limit', () => {
  it('blocks repeated requests from the same IP with 429', async () => {
    // Corps invalide : rejeté par zod (400) sans toucher la DB,
    // mais chaque requête est comptée par le limiteur.
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/auth/magic-link').send({})
      expect(res.status).toBe(400)
    }

    const res = await request(app).post('/api/auth/magic-link').send({})
    expect(res.status).toBe(429)
    expect(res.body.code).toBe('MAGIC_LINK_RATE_LIMIT_EXCEEDED')
  })

  it('does not apply the magic-link limit to /magic-link/verify', async () => {
    const res = await request(app).post('/api/auth/magic-link/verify').send({})
    expect(res.status).toBe(400)
  })
})
