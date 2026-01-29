import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { USER_SELECT } from '../lib/prismaSelects.js'
import { authenticate } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

export const sessionsRouter = Router()

const createSessionSchema = z.object({
  groupId: z.string(),
  date: z.string().optional(), // ISO date string, defaults to today
  startTime: z.string().optional(), // ISO datetime string
  endTime: z.string().optional() // ISO datetime string
})

// Helper to get today's date at midnight UTC
function getTodayDate(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

// Helper to get default start/end times for a date (12:00 - 14:00 local time)
function getDefaultTimes(date: Date): { startTime: Date; endTime: Date } {
  const startTime = new Date(date)
  startTime.setHours(12, 0, 0, 0)

  const endTime = new Date(date)
  endTime.setHours(14, 0, 0, 0)

  return { startTime, endTime }
}

// Helper to check if a session is locked (startTime has passed)
function isSessionLocked(session: { startTime: Date }): boolean {
  return new Date() >= session.startTime
}

// Get upcoming sessions for a group
sessionsRouter.get('/upcoming/:groupId', authenticate, async (req, res, next) => {
  try {
    const groupId = req.params.groupId as string
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)
    const cursor = req.query.cursor as string | undefined

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId
        }
      }
    })

    if (!membership) {
      throw new AppError(403, 'Not a member of this group')
    }

    const now = new Date()

    const sessions = await prisma.session.findMany({
      where: {
        groupId,
        // Sessions that haven't ended yet (endTime > now)
        endTime: { gt: now },
        // If cursor provided, get sessions after that one
        ...(cursor && {
          id: { not: cursor },
          startTime: { gte: (await prisma.session.findUnique({ where: { id: cursor } }))?.startTime }
        })
      },
      include: {
        cars: {
          include: {
            driver: {
              select: USER_SELECT
            },
            userCar: {
              include: { avatar: true }
            },
            passengers: {
              include: {
                user: {
                  select: USER_SELECT
                }
              }
            }
          }
        },
        passengers: {
          include: {
            user: {
              select: USER_SELECT
            }
          }
        }
      },
      orderBy: { startTime: 'asc' },
      take: limit + 1 // Take one extra to know if there are more
    })

    const hasMore = sessions.length > limit
    const resultSessions = hasMore ? sessions.slice(0, limit) : sessions
    const nextCursor = hasMore ? resultSessions[resultSessions.length - 1]?.id : undefined

    res.json({
      sessions: resultSessions,
      hasMore,
      nextCursor
    })
  } catch (error) {
    next(error)
  }
})

// Get or create today's session for a group
sessionsRouter.get('/today/:groupId', authenticate, async (req, res, next) => {
  try {
    const groupId = req.params.groupId as string

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId
        }
      }
    })

    if (!membership) {
      throw new AppError(403, 'Not a member of this group')
    }

    const today = getTodayDate()

    let session = await prisma.session.findFirst({
      where: {
        groupId,
        date: today
      },
      orderBy: { startTime: 'asc' },
      include: {
        cars: {
          include: {
            driver: {
              select: USER_SELECT
            },
            passengers: {
              include: {
                user: {
                  select: USER_SELECT
                }
              }
            }
          }
        },
        passengers: {
          include: {
            user: {
              select: USER_SELECT
            }
          }
        }
      }
    })

    if (!session) {
      const { startTime, endTime } = getDefaultTimes(today)
      session = await prisma.session.create({
        data: {
          groupId,
          date: today,
          startTime,
          endTime
        },
        include: {
          cars: {
            include: {
              driver: {
                select: USER_SELECT
              },
              passengers: {
                include: {
                  user: {
                    select: USER_SELECT
                  }
                }
              }
            }
          },
          passengers: {
            include: {
              user: {
                select: USER_SELECT
              }
            }
          }
        }
      })
    }

    res.json({ session })
  } catch (error) {
    next(error)
  }
})

// Get session by ID
sessionsRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id as string },
      include: {
        group: true,
        cars: {
          include: {
            driver: {
              select: USER_SELECT
            },
            passengers: {
              include: {
                user: {
                  select: USER_SELECT
                }
              }
            }
          }
        },
        passengers: {
          include: {
            user: {
              select: USER_SELECT
            }
          }
        }
      }
    })

    if (!session) {
      throw new AppError(404, 'Session not found')
    }

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId: session.groupId
        }
      }
    })

    if (!membership) {
      throw new AppError(403, 'Not a member of this group')
    }

    res.json({ session })
  } catch (error) {
    next(error)
  }
})

// Get session lock status
sessionsRouter.get('/:id/lock-status', authenticate, async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, groupId: true, startTime: true }
    })

    if (!session) {
      throw new AppError(404, 'Session not found')
    }

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId: session.groupId
        }
      }
    })

    if (!membership) {
      throw new AppError(403, 'Not a member of this group')
    }

    const isLocked = isSessionLocked(session)
    const isAdmin = membership.role === 'admin'

    res.json({
      isLocked,
      canModify: !isLocked || isAdmin,
      locksAt: session.startTime
    })
  } catch (error) {
    next(error)
  }
})

// Join session (participate)
sessionsRouter.post('/:id/join', authenticate, async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id as string }
    })

    if (!session) {
      throw new AppError(404, 'Session not found')
    }

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId: session.groupId
        }
      }
    })

    if (!membership) {
      throw new AppError(403, 'Not a member of this group')
    }

    // Check if session is locked (admin can bypass)
    if (isSessionLocked(session) && membership.role !== 'admin') {
      throw new AppError(403, 'Les inscriptions sont fermées pour cette séance')
    }

    // Check if already participating
    const existing = await prisma.passenger.findUnique({
      where: {
        sessionId_userId: {
          sessionId: session.id,
          userId: req.user!.userId
        }
      }
    })

    if (existing) {
      throw new AppError(400, 'Already participating')
    }

    await prisma.passenger.create({
      data: {
        sessionId: session.id,
        userId: req.user!.userId
      }
    })

    res.json({ message: 'Joined session' })
  } catch (error) {
    next(error)
  }
})

// Leave session
sessionsRouter.delete('/:id/leave', authenticate, async (req, res, next) => {
  try {
    const passenger = await prisma.passenger.findUnique({
      where: {
        sessionId_userId: {
          sessionId: req.params.id as string,
          userId: req.user!.userId
        }
      }
    })

    if (!passenger) {
      throw new AppError(404, 'Not participating in this session')
    }

    // Also remove any car they might have
    await prisma.car.deleteMany({
      where: {
        sessionId: req.params.id as string,
        driverId: req.user!.userId
      }
    })

    await prisma.passenger.delete({
      where: { id: passenger.id }
    })

    res.json({ message: 'Left session' })
  } catch (error) {
    next(error)
  }
})

// Create a session for a specific date
sessionsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { groupId, date, startTime, endTime } = createSessionSchema.parse(req.body)

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId
        }
      }
    })

    if (!membership) {
      throw new AppError(403, 'Not a member of this group')
    }

    const sessionDate = date ? new Date(date) : getTodayDate()
    const defaultTimes = getDefaultTimes(sessionDate)
    const sessionStartTime = startTime ? new Date(startTime) : defaultTimes.startTime
    const sessionEndTime = endTime ? new Date(endTime) : defaultTimes.endTime

    const session = await prisma.session.create({
      data: {
        groupId,
        date: sessionDate,
        startTime: sessionStartTime,
        endTime: sessionEndTime,
        createdById: req.user!.userId
      },
      include: {
        cars: {
          include: {
            driver: true,
            passengers: {
              include: { user: true }
            }
          }
        },
        passengers: {
          include: { user: true }
        }
      }
    })

    res.json({ session })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return next(new AppError(409, 'Une séance existe déjà sur ce créneau'))
    }
    next(error)
  }
})

// Delete a session
sessionsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id as string },
      include: {
        _count: { select: { passengers: true } }
      }
    })

    if (!session) {
      throw new AppError(404, 'Session not found')
    }

    // Verify membership and get role
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId: session.groupId
        }
      }
    })

    if (!membership) {
      throw new AppError(403, 'Not a member of this group')
    }

    const isAdmin = membership.role === 'admin'
    const isCreator = session.createdById === req.user!.userId
    const hasParticipants = session._count.passengers > 0

    if (!isAdmin && !isCreator) {
      throw new AppError(403, 'Seul le créateur ou un admin peut supprimer cette séance')
    }

    if (isCreator && !isAdmin && hasParticipants) {
      throw new AppError(403, 'Impossible de supprimer une séance avec des participants')
    }

    await prisma.session.delete({
      where: { id: session.id }
    })

    res.json({ message: 'Séance supprimée', hadParticipants: hasParticipants })
  } catch (error) {
    next(error)
  }
})
