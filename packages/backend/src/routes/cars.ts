import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

export const carsRouter = Router()

const createCarSchema = z.object({
  sessionId: z.string(),
  seats: z.number().int().min(1).max(10).optional(),
  userCarId: z.string().optional()
})

const updateCarSchema = z.object({
  seats: z.number().int().min(1).max(10)
})

// Add a car to a session
carsRouter.post('/', authenticate, async (req, res, next) => {
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
          select: {
            id: true,
            name: true,
            avatarId: true,
            customAvatarUrl: true,
            avatar: true
          }
        },
        userCar: {
          include: {
            avatar: true
          }
        },
        passengers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarId: true,
                customAvatarUrl: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    res.status(201).json({ car })
  } catch (error) {
    next(error)
  }
})

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
          select: {
            id: true,
            name: true,
            avatarId: true,
            customAvatarUrl: true,
            avatar: true
          }
        },
        userCar: {
          include: {
            avatar: true
          }
        },
        passengers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarId: true,
                customAvatarUrl: true,
                avatar: true
              }
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
      where: { id: req.params.id as string }
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
  } catch (error) {
    next(error)
  }
})

// Join a car
carsRouter.post('/:id/join', authenticate, async (req, res, next) => {
  try {
    const car = await prisma.car.findUnique({
      where: { id: req.params.id as string },
      include: {
        session: true,
        passengers: true
      }
    })

    if (!car) {
      throw new AppError(404, 'Car not found')
    }

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId: car.session.groupId
        }
      }
    })

    if (!membership) {
      throw new AppError(403, 'Not a member of this group')
    }

    // Check for active ban from this driver
    const activeBan = await prisma.ban.findFirst({
      where: {
        giverId: car.driverId,
        receiverId: req.user!.userId,
        endsAt: { gt: new Date() },
        liftedAt: null
      }
    })

    if (activeBan) {
      throw new AppError(403, 'Tu es banni de cette voiture !', 'BANNED')
    }

    // Check if car is full
    if (car.passengers.length >= car.seats) {
      throw new AppError(400, 'Car is full')
    }

    // Check if user is the driver
    if (car.driverId === req.user!.userId) {
      throw new AppError(400, 'You are the driver')
    }

    // Ensure user is participating in the session
    const passenger = await prisma.passenger.upsert({
      where: {
        sessionId_userId: {
          sessionId: car.sessionId,
          userId: req.user!.userId
        }
      },
      create: {
        sessionId: car.sessionId,
        userId: req.user!.userId,
        carId: car.id
      },
      update: {
        carId: car.id
      }
    })

    res.json({ message: 'Joined car', passenger })
  } catch (error) {
    next(error)
  }
})

// Leave a car
carsRouter.delete('/:id/leave', authenticate, async (req, res, next) => {
  try {
    const car = await prisma.car.findUnique({
      where: { id: req.params.id as string }
    })

    if (!car) {
      throw new AppError(404, 'Car not found')
    }

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
  } catch (error) {
    next(error)
  }
})

// Kick a passenger (driver only)
carsRouter.delete('/:id/kick/:userId', authenticate, async (req, res, next) => {
  try {
    const car = await prisma.car.findUnique({
      where: { id: req.params.id as string }
    })

    if (!car) {
      throw new AppError(404, 'Car not found')
    }

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
  } catch (error) {
    next(error)
  }
})
