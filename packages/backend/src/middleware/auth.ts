import { Request, Response, NextFunction } from 'express'
import { verifyToken, JWTPayload } from '../lib/jwt.js'
import { AppError } from './errorHandler.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const tokenFromCookie = req.cookies?.token

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : tokenFromCookie

  if (!token) {
    return next(new AppError(401, 'Authentication required', 'UNAUTHORIZED'))
  }

  try {
    const payload = verifyToken(token)
    req.user = payload
    next()
  } catch {
    next(new AppError(401, 'Invalid or expired token', 'INVALID_TOKEN'))
  }
}
