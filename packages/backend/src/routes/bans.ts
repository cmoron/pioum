import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { USER_SELECT } from '../lib/prismaSelects.js'
import { authenticate } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

export const bansRouter = Router()

const createBanSchema = z.object({
  receiverId: z.string(),
  reason: z.string().max(200).optional(),
  duration: z.enum(['1d', '3d', '1w', '2w'])
})

const DURATION_MAP: Record<string, number> = {
  '1d': 1 * 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '2w': 14 * 24 * 60 * 60 * 1000
}

// Get my active bans (given and received)
bansRouter.get('/active', authenticate, async (req, res, next) => {
  try {
    const now = new Date()

    const [bansGiven, bansReceived] = await Promise.all([
      prisma.ban.findMany({
        where: {
          giverId: req.user!.userId,
          endsAt: { gt: now },
          liftedAt: null
        },
        include: {
          receiver: {
            select: USER_SELECT
          }
        },
        orderBy: { endsAt: 'asc' }
      }),
      prisma.ban.findMany({
        where: {
          receiverId: req.user!.userId,
          endsAt: { gt: now },
          liftedAt: null
        },
        include: {
          giver: {
            select: USER_SELECT
          }
        },
        orderBy: { endsAt: 'asc' }
      })
    ])

    res.json({ bansGiven, bansReceived })
  } catch (error) {
    next(error)
  }
})

// Get ban hall of fame (most bans given/received)
bansRouter.get('/hall-of-fame', authenticate, async (req, res, next) => {
  try {
    const [topBanners, topBanned] = await Promise.all([
      prisma.ban.groupBy({
        by: ['giverId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      prisma.ban.groupBy({
        by: ['receiverId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      })
    ])

    // Get user details
    const giverIds = topBanners.map(b => b.giverId)
    const receiverIds = topBanned.map(b => b.receiverId)
    const allUserIds = [...new Set([...giverIds, ...receiverIds])]

    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: USER_SELECT
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    const hallOfFame = {
      topBanners: topBanners.map(b => ({
        user: userMap.get(b.giverId),
        count: b._count.id
      })),
      topBanned: topBanned.map(b => ({
        user: userMap.get(b.receiverId),
        count: b._count.id
      }))
    }

    res.json({ hallOfFame })
  } catch (error) {
    next(error)
  }
})

// Get users bannable by the current user (users sharing at least one group)
bansRouter.get('/bannable-users', authenticate, async (req, res, next) => {
  try {
    const myMemberships = await prisma.groupMember.findMany({
      where: { userId: req.user!.userId },
      select: { groupId: true }
    })

    const myGroupIds = myMemberships.map(m => m.groupId)

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user!.userId },
        memberships: {
          some: {
            groupId: { in: myGroupIds }
          }
        }
      },
      select: USER_SELECT
    })

    res.json({ users })
  } catch (error) {
    next(error)
  }
})

// Create a ban
bansRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { receiverId, reason, duration } = createBanSchema.parse(req.body)

    if (receiverId === req.user!.userId) {
      throw new AppError(400, 'Cannot ban yourself')
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    })

    if (!receiver) {
      throw new AppError(404, 'User not found')
    }

    // Check for existing active ban
    const existingBan = await prisma.ban.findFirst({
      where: {
        giverId: req.user!.userId,
        receiverId,
        endsAt: { gt: new Date() },
        liftedAt: null
      }
    })

    if (existingBan) {
      throw new AppError(400, 'Already banned this user')
    }

    const durationMs = DURATION_MAP[duration]
    const endsAt = new Date(Date.now() + durationMs)

    const ban = await prisma.ban.create({
      data: {
        giverId: req.user!.userId,
        receiverId,
        reason,
        endsAt
      },
      include: {
        receiver: {
          select: USER_SELECT
        }
      }
    })

    // Retirer le banni des voitures du bannisseur (sessions en cours)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Trouver les voitures du bannisseur dans les sessions actives
    const giverCars = await prisma.car.findMany({
      where: {
        driverId: req.user!.userId,
        session: {
          date: { gte: today }
        }
      },
      select: { id: true }
    })

    if (giverCars.length > 0) {
      await prisma.passenger.updateMany({
        where: {
          userId: receiverId,
          carId: { in: giverCars.map(c => c.id) }
        },
        data: {
          carId: null
        }
      })
    }

    res.status(201).json({ ban })
  } catch (error) {
    next(error)
  }
})

// Lift a ban early
bansRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const ban = await prisma.ban.findUnique({
      where: { id: req.params.id as string }
    })

    if (!ban) {
      throw new AppError(404, 'Ban not found')
    }

    if (ban.giverId !== req.user!.userId) {
      throw new AppError(403, 'Only the ban giver can lift the ban')
    }

    if (ban.liftedAt) {
      throw new AppError(400, 'Ban already lifted')
    }

    await prisma.ban.update({
      where: { id: req.params.id as string },
      data: { liftedAt: new Date() }
    })

    res.json({ message: 'Ban lifted' })
  } catch (error) {
    next(error)
  }
})

// Check if user is banned by another user
bansRouter.get('/check/:giverId', authenticate, async (req, res, next) => {
  try {
    const ban = await prisma.ban.findFirst({
      where: {
        giverId: (req.params.giverId as string),
        receiverId: req.user!.userId,
        endsAt: { gt: new Date() },
        liftedAt: null
      }
    })

    res.json({ banned: !!ban, ban })
  } catch (error) {
    next(error)
  }
})
