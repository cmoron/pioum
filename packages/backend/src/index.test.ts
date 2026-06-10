import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './index.js'

describe('app security configuration', () => {
  it('trusts the first proxy so req.ip reflects X-Forwarded-For', () => {
    expect(app.get('trust proxy')).toBe(1)
  })

  it('handles requests carrying X-Forwarded-For without rate-limit validation errors', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('X-Forwarded-For', '203.0.113.7')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('status', 'ok')
  })
})
