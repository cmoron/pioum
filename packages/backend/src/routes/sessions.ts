import { Router } from 'express'
import { z } from 'zod'
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

    let session = await prisma.session.findUnique({
      where: {
        groupId_date: {
          groupId,
          date: today
        }
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

    const session = await prisma.session.upsert({
      where: {
        groupId_date: {
          groupId,
          date: sessionDate
        }
      },
      create: {
        groupId,
        date: sessionDate,
        startTime: sessionStartTime,
        endTime: sessionEndTime
      },
      update: {},
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
    next(error)
  }
})
