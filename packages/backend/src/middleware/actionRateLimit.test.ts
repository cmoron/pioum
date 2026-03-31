import { describe, it, expect, vi, afterEach, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createActionRateLimit } from './actionRateLimit.js'

// buildApp lit le userId depuis x-test-user-id pour simuler plusieurs
// utilisateurs distincts sur la même instance de limiter.
function buildApp(limit: number) {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    const userId = req.headers['x-test-user-id'] as string | undefined
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

  afterAll(() => {
    consoleWarnSpy.mockRestore()
  })

  it('laisse passer les requêtes sous la limite', async () => {
    const app = buildApp(3)

    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/test').set('x-test-user-id', 'user-1')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
    }
  })

  it('bloque la requête dépassant la limite avec 429', async () => {
    const app = buildApp(3)

    for (let i = 0; i < 3; i++) {
      await request(app).get('/test').set('x-test-user-id', 'user-1')
    }

    const res = await request(app).get('/test').set('x-test-user-id', 'user-1')
    expect(res.status).toBe(429)
    expect(res.body).toMatchObject({
      error: expect.stringContaining('Trop d'),
      code: 'ACTION_RATE_LIMIT_EXCEEDED',
      retryAfter: 60,
    })
  })

  it('retryAfter est cohérent avec windowMs', async () => {
    const app = express()
    app.use(express.json())
    app.use((req, _res, next) => {
      ;(req as express.Request & { user: { userId: string } }).user = { userId: 'user-1' }
      next()
    })
    app.use('/test', createActionRateLimit({ limit: 1, windowMs: 30_000 }), (_req, res) => {
      res.json({ ok: true })
    })

    await request(app).get('/test')
    const res = await request(app).get('/test')
    expect(res.status).toBe(429)
    expect(res.body.retryAfter).toBe(30)
  })

  it('log un warning contenant l\'userId quand un utilisateur est bloqué', async () => {
    const app = buildApp(1)

    await request(app).get('/test').set('x-test-user-id', 'user-42')
    await request(app).get('/test').set('x-test-user-id', 'user-42')

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('user-42')
    )
  })

  it('isole les compteurs par userId sur le même limiter', async () => {
    const app = buildApp(2)

    // user-1 atteint sa limite
    await request(app).get('/test').set('x-test-user-id', 'user-1')
    await request(app).get('/test').set('x-test-user-id', 'user-1')
    const blocked = await request(app).get('/test').set('x-test-user-id', 'user-1')
    expect(blocked.status).toBe(429)

    // user-2 a son propre compteur sur le même limiter
    const ok = await request(app).get('/test').set('x-test-user-id', 'user-2')
    expect(ok.status).toBe(200)
  })

  it('utilise l\'IP comme fallback si req.user est absent', async () => {
    const app = buildApp(1)

    await request(app).get('/test')
    const res = await request(app).get('/test')

    expect(res.status).toBe(429)
  })
})
