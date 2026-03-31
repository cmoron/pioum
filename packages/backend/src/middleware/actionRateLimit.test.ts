import { describe, it, expect, vi, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createActionRateLimit } from './actionRateLimit.js'

function buildApp(limit: number, userId?: string) {
  const app = express()
  app.use(express.json())
  // Simulate authenticate middleware setting req.user
  app.use((req, _res, next) => {
    if (userId) {
      ;(req as express.Request & { user: { userId: string } }).user = { userId }
    }
    next()
  })
  app.use('/test', createActionRateLimit({ limit, windowMs: 60_000 }), (_req, res) => {
    res.json({ ok: true })
  })
  return app
}

describe('createActionRateLimit', () => {
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  afterEach(() => {
    consoleWarnSpy.mockClear()
  })

  it('laisse passer les requêtes sous la limite', async () => {
    const app = buildApp(3, 'user-1')

    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/test')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
    }
  })

  it('bloque la requête dépassant la limite avec 429', async () => {
    const app = buildApp(3, 'user-1')

    for (let i = 0; i < 3; i++) {
      await request(app).get('/test')
    }

    const res = await request(app).get('/test')
    expect(res.status).toBe(429)
    expect(res.body).toMatchObject({
      error: expect.stringContaining('Trop d'),
      code: 'ACTION_RATE_LIMIT_EXCEEDED',
      retryAfter: 60,
    })
  })

  it('log un warning quand un utilisateur est bloqué', async () => {
    const app = buildApp(1, 'user-42')

    await request(app).get('/test')
    await request(app).get('/test')

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('user-42')
    )
  })

  it('isole les compteurs par userId', async () => {
    const app = buildApp(2, 'user-1')
    const app2 = buildApp(2, 'user-2')

    // user-1 atteint sa limite
    await request(app).get('/test')
    await request(app).get('/test')
    const blocked = await request(app).get('/test')
    expect(blocked.status).toBe(429)

    // user-2 a son propre compteur indépendant
    const ok = await request(app2).get('/test')
    expect(ok.status).toBe(200)
  })

  it('utilise l\'IP comme fallback si req.user est absent', async () => {
    const app = buildApp(1)

    await request(app).get('/test')
    const res = await request(app).get('/test')

    expect(res.status).toBe(429)
  })
})
