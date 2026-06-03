import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { AppError } from './errorHandler.js'

/**
 * Platform-admin gate. Must run AFTER `authenticate` (relies on req.user).
 * The role is read from the DB rather than the JWT so that promotions/demotions
 * take effect immediately instead of waiting for a 7-day token to expire.
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED')
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    })

    if (!user || user.role !== 'admin') {
      throw new AppError(403, 'Admin access required', 'FORBIDDEN')
    }

    next()
  } catch (error) {
    next(error)
  }
}
