import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit'

export function createActionRateLimit(opts: { limit?: number; windowMs?: number } = {}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: opts.windowMs ?? 60_000,
    limit: opts.limit ?? 15,
    keyGenerator: (req) => req.user?.userId ?? req.ip ?? 'anonymous',
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Trop d\'actions en peu de temps, réessaie dans une minute',
      code: 'ACTION_RATE_LIMIT_EXCEEDED',
      retryAfter: 60,
    },
    handler: (req, res, _next, options) => {
      console.warn(`[RATE LIMIT] Action bloquée pour ${req.user?.userId ?? req.ip} sur ${req.originalUrl}`)
      res.status(429).json(options.message)
    },
  })
}

export const actionRateLimit = createActionRateLimit()
