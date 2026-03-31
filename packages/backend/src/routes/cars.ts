import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { USER_SELECT } from '../lib/prismaSelects.js'
import { authenticate } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { notifyGroupMembers, notifyUser, notifyUsers } from '../notifications/notification.service.js'
import { formatSessionDate } from '../lib/formatDate.js'

export const carsRouter = Router()

const createCarSchema = z.object({
  sessionId: z.string(),
  seats: z.number().int().min(1).max(10).optional(),
  userCarId: z.string().optional()
})

const updateCarSchema = z.object({
  seats: z.number().int().min(1).max(10)
})

// Helper to check if a session is locked (startTime has passed)
function isSessionLocked(session: { startTime: Date }): boolean {
  return new Date() >= session.startTime
}

// Helper pour récupérer le nom d'un utilisateur avec fallback
async function getUserName(userId: string, fallback = 'Quelqu\'un'): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
  return user?.name ?? fallback
}

// Helper pour récupérer une voiture avec sa session ou lever une 404
async function getCarWithSession(carId: string) {
  const car = await prisma.car.findUnique({
    where: { id: carId },
    include: { session: true },
  })
  if (!car) throw new AppError(404, 'Car not found')
  return car
}

// Add a car to a session
export async function addCarHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionId, seats: providedSeats, userCarId } = createCarSchema.parse(req.body)

    const session = await prisma.session.findUnique({
      where: { id: sessionId }
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

    // Check if already has a car in this session
    const existingCar = await prisma.car.findUnique({
      where: {
        sessionId_driverId: {
          sessionId,
          driverId: req.user!.userId
        }
      }
    })

    if (existingCar) {
      throw new AppError(400, 'Already have a car in this session')
    }

    // If userCarId is provided, verify it exists and belongs to user
    let seats = providedSeats
    if (userCarId) {
      const userCar = await prisma.userCar.findUnique({
        where: { id: userCarId }
      })

      if (!userCar) {
        throw new AppError(404, 'User car not found')
      }

      if (userCar.userId !== req.user!.userId) {
        throw new AppError(403, 'Not your car')
      }

      // Use userCar's default seats if seats not provided
      if (!seats) {
        seats = userCar.defaultSeats
      }
    }

    // Fallback to 3 seats if nothing provided
    if (!seats) {
      seats = 3
    }

    // Ensure user is participating
    await prisma.passenger.upsert({
      where: {
        sessionId_userId: {
          sessionId,
          userId: req.user!.userId
        }
      },
      create: {
        sessionId,
        userId: req.user!.userId
      },
      update: {}
    })

    const car = await prisma.car.create({
      data: {
        sessionId,
        driverId: req.user!.userId,
        seats,
        userCarId
      },
      include: {
        driver: {
          select: USER_SELECT
        },
        userCar: {
          include: {
            avatar: true
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

    res.status(201).json({ car })

    // Notifier les membres du groupe qu'une voiture est disponible (fire-and-forget)
    const availableSeats = car.seats - car.passengers.length
    getUserName(req.user!.userId)
      .then((driverName) => notifyGroupMembers(session.groupId, req.user!.userId, {
        title: '🚗 Une voiture est disponible !',
        body: `${driverName} propose sa voiture pour la séance du ${formatSessionDate(session.date)}. Il reste ${availableSeats} place${availableSeats > 1 ? 's' : ''} disponible${availableSeats > 1 ? 's' : ''}.`,
        url: `/groups/${session.groupId}`,
        type: 'CAR_AVAILABLE',
      }))
      .catch((err: unknown) => {
        console.error('[Pioum] Erreur envoi notification voiture:', err)
      })
  } catch (error) {
    next(error)
  }
}

carsRouter.post('/', authenticate, addCarHandler)

// Update car seats
carsRouter.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { seats } = updateCarSchema.parse(req.body)

    const car = await prisma.car.findUnique({
      where: { id: req.params.id as string },
      include: { passengers: true }
    })

    if (!car) {
      throw new AppError(404, 'Car not found')
    }

    if (car.driverId !== req.user!.userId) {
      throw new AppError(403, 'Not your car')
    }

    // Check if new seats count is less than current passengers
    if (seats < car.passengers.length) {
      throw new AppError(400, 'Cannot reduce seats below current passenger count')
    }

    const updatedCar = await prisma.car.update({
      where: { id: req.params.id as string },
      data: { seats },
      include: {
        driver: {
          select: USER_SELECT
        },
        userCar: {
          include: {
            avatar: true
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

    res.json({ car: updatedCar })
  } catch (error) {
    next(error)
  }
})

// Delete a car
carsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const car = await prisma.car.findUnique({
      where: { id: req.params.id as string },
      include: { session: true, passengers: { select: { userId: true } } }
    })

    if (!car) {
      throw new AppError(404, 'Car not found')
    }

    if (car.driverId !== req.user!.userId) {
      throw new AppError(403, 'Not your car')
    }

    // Remove all passengers from the car first
    await prisma.passenger.updateMany({
      where: { carId: req.params.id as string },
      data: { carId: null }
    })

    await prisma.car.delete({
      where: { id: req.params.id as string }
    })

    res.json({ message: 'Car removed' })

    // Notifier uniquement les passagers de la voiture (fire-and-forget)
    const passengerIds = car.passengers.map((p) => p.userId).filter((id) => id !== car.driverId)
    if (passengerIds.length > 0) {
      getUserName(car.driverId, 'Le chauffeur')
        .then((driverName) => notifyUsers(passengerIds, {
          title: '🚨 Un chauffeur s\'est désisté !',
          body: `La voiture de ${driverName} n'est plus disponible pour la séance du ${formatSessionDate(car.session.date)}.`,
          url: `/groups/${car.session.groupId}`,
          type: 'DRIVER_LEFT',
        }))
        .catch((err: unknown) => {
          console.error('[Pioum] Erreur envoi notification désistement voiture:', err)
        })
    }
  } catch (error) {
    next(error)
  }
})

// Join a car
carsRouter.post('/:id/join', authenticate, async (req, res, next) => {
  try {
    const carId = req.params.id as string
    const userId = req.user!.userId

    const result = await prisma.$transaction(async (tx) => {
      const car = await tx.car.findUnique({
        where: { id: carId },
        include: {
          session: true,
          passengers: true
        }
      })

      if (!car) {
        throw new AppError(404, 'Car not found')
      }

      // Verify membership
      const membership = await tx.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId: car.session.groupId
          }
        }
      })

      if (!membership) {
        throw new AppError(403, 'Not a member of this group')
      }

      // Check if session is locked (admin can bypass)
      if (isSessionLocked(car.session) && membership.role !== 'admin') {
        throw new AppError(403, 'Les inscriptions sont fermées pour cette séance')
      }

      // Check for active ban from this driver
      const activeBan = await tx.ban.findFirst({
        where: {
          giverId: car.driverId,
          receiverId: userId,
          endsAt: { gt: new Date() },
          liftedAt: null
        }
      })

      if (activeBan) {
        throw new AppError(403, 'Tu es banni de cette voiture !', 'BANNED')
      }

      // Check if user is the driver
      if (car.driverId === userId) {
        throw new AppError(400, 'You are the driver')
      }

      // Check if already in this car (to avoid double counting in logic if something went wrong)
      const alreadyInThisCar = car.passengers.some(p => p.userId === userId)
      
      if (!alreadyInThisCar) {
        // Check if car is full
        if (car.passengers.length >= car.seats) {
          throw new AppError(400, 'Car is full')
        }
      }

      // Ensure user is participating in the session and joined to this car
      const passenger = await tx.passenger.upsert({
        where: {
          sessionId_userId: {
            sessionId: car.sessionId,
            userId
          }
        },
        create: {
          sessionId: car.sessionId,
          userId,
          carId: car.id
        },
        update: {
          carId: car.id
        }
      })

      return { passenger, driverId: car.driverId, groupId: car.session.groupId, sessionDate: car.session.date }
    })

    res.json({ message: 'Joined car', passenger: result.passenger })

    // Notifier le conducteur qu'un passager a rejoint sa voiture (fire-and-forget)
    getUserName(userId)
      .then((joinerName) => notifyUser(result.driverId, {
        title: '🙋 Nouveau passager !',
        body: `${joinerName} a rejoint ta voiture pour la séance du ${formatSessionDate(result.sessionDate)}.`,
        url: `/groups/${result.groupId}`,
        type: 'PASSENGER_JOINED',
      }))
      .catch((err: unknown) => {
        console.error('[Pioum] Erreur envoi notification nouveau passager', err)
      })
  } catch (error) {
    next(error)
  }
})

// Leave a car
carsRouter.delete('/:id/leave', authenticate, async (req, res, next) => {
  try {
    const car = await getCarWithSession(req.params.id as string)

    const passenger = await prisma.passenger.findFirst({
      where: {
        carId: req.params.id as string,
        userId: req.user!.userId
      }
    })

    if (!passenger) {
      throw new AppError(404, 'Not in this car')
    }

    await prisma.passenger.update({
      where: { id: passenger.id },
      data: { carId: null }
    })

    res.json({ message: 'Left car' })

    // Notifier le conducteur qu'un passager a quitté sa voiture (fire-and-forget)
    getUserName(req.user!.userId)
      .then((leaverName) => notifyUser(car.driverId, {
        title: '🚪 Un passager est parti !',
        body: `${leaverName} a quitté ta voiture pour la séance du ${formatSessionDate(car.session.date)}.`,
        url: `/groups/${car.session.groupId}`,
        type: 'PASSENGER_LEFT',
      }))
      .catch((err: unknown) => {
        console.error('[Pioum] Erreur envoi notification départ passager:', err)
      })
  } catch (error) {
    next(error)
  }
})

// Kick a passenger (driver only)
carsRouter.delete('/:id/kick/:userId', authenticate, async (req, res, next) => {
  try {
    const car = await getCarWithSession(req.params.id as string)

    if (car.driverId !== req.user!.userId) {
      throw new AppError(403, 'Only the driver can kick passengers')
    }

    const passenger = await prisma.passenger.findFirst({
      where: {
        carId: req.params.id as string,
        userId: (req.params.userId as string)
      }
    })

    if (!passenger) {
      throw new AppError(404, 'Passenger not in this car')
    }

    await prisma.passenger.update({
      where: { id: passenger.id },
      data: { carId: null }
    })

    res.json({ message: 'Passenger kicked' })

    // Notifier le passager éjecté (fire-and-forget)
    notifyUser(req.params.userId as string, {
      title: '👢 Tu as été éjecté !',
      body: `Tu as été retiré de la voiture pour la séance du ${formatSessionDate(car.session.date)}.`,
      url: `/groups/${car.session.groupId}`,
      type: 'PASSENGER_KICKED',
    }).catch((err: unknown) => {
      console.error('[Pioum] Erreur envoi notification éjection passager:', err)
    })
  } catch (error) {
    next(error)
  }
})
