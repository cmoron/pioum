import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import {
  saveSubscription,
  removeSubscription,
  WebPushSubscription,
} from './notification.service.js'
import { NOTIFICATION_TYPES } from '@pioum/shared/notifications'

export const notificationsRouter = Router()

interface SubscribeBody {
  subscription: WebPushSubscription
}

function validateBody(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter((f) => (req.body as Record<string, unknown>)[f] === undefined)
    if (missing.length > 0) {
      res.status(400).json({ error: `Champs manquants : ${missing.join(', ')}` })
      return
    }
    next()
  }
}

// Enregistre la subscription push de l'utilisateur connecté
notificationsRouter.post(
  '/subscribe',
  authenticate,
  validateBody(['subscription']),
  async (req: Request<object, object, SubscribeBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await saveSubscription(req.user!.userId, req.body.subscription)
      res.status(201).json({ message: 'Abonnement enregistré' })
    } catch (err) {
      next(err)
    }
  }
)

// Supprime la subscription push de l'utilisateur connecté
notificationsRouter.post(
  '/unsubscribe',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await removeSubscription(req.user!.userId)
      res.status(200).json({ message: 'Désabonnement effectué' })
    } catch (err) {
      next(err)
    }
  }
)

// Vérifie si l'utilisateur connecté a une subscription en DB
notificationsRouter.get(
  '/subscription',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sub = await prisma.pushSubscription.findUnique({ where: { userId: req.user!.userId } })
      res.json({ subscribed: sub !== null, enabledTypes: sub?.enabledTypes ?? [] })
    } catch (err) {
      next(err)
    }
  }
)

// Met à jour les types de notifications activés pour l'utilisateur connecté
const preferencesSchema = z.object({
  enabledTypes: z.array(z.enum(NOTIFICATION_TYPES)),
})

notificationsRouter.patch(
  '/preferences',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { enabledTypes } = preferencesSchema.parse(req.body)
      const sub = await prisma.pushSubscription.findUnique({ where: { userId: req.user!.userId } })
      if (!sub) {
        next(new AppError(404, 'Aucun abonnement push trouvé'))
        return
      }
      await prisma.pushSubscription.update({
        where: { userId: req.user!.userId },
        data: { enabledTypes },
      })
      res.json({ enabledTypes })
    } catch (err) {
      next(err)
    }
  }
)

// Renvoie la clé publique VAPID au frontend
notificationsRouter.get('/vapid-public-key', (_req: Request, res: Response): void => {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) {
    res.status(503).json({ error: 'Push notifications non configurées' })
    return
  }
  res.json({ vapidPublicKey: key })
})
