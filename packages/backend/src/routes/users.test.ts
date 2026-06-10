import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../index.js'

describe('GET /api/users', () => {
  it("n'expose plus la liste globale des utilisateurs", async () => {
    const res = await request(app).get('/api/users')
    expect(res.status).toBe(404)
  })
})
