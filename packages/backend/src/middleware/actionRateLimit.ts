import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit'

// NOTE: le fallback IP utilise req.socket.remoteAddress (IP directe, non spoofable)
// plutôt que req.ip qui dépend de la config trust proxy.
// En pratique ce fallback ne s'active pas : authenticate() s'exécute avant ce middleware.
export function createActionRateLimit(opts: { limit?: number; windowMs?: number } = {}): RateLimitRequestHandler {
  const windowMs = opts.windowMs ?? 60_000
  const retryAfter = Math.ceil(windowMs / 1000)

  return rateLimit({
    windowMs,
    limit: opts.limit ?? 15,
    keyGenerator: (req) => req.user?.userId ?? req.socket?.remoteAddress ?? 'unknown',
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: 'Trop d\'actions en peu de temps, réessaie plus tard',
      code: 'ACTION_RATE_LIMIT_EXCEEDED',
      retryAfter,
    },
    handler: (req, res, _next, options) => {
      console.warn(`[RATE LIMIT] Action bloquée pour ${req.user?.userId ?? req.socket?.remoteAddress} sur ${req.originalUrl}`)
      res.status(429).json(options.message)
    },
  })
}

export const actionRateLimit = createActionRateLimit()
