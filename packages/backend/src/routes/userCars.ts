import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

export const userCarsRouter = Router()

const createUserCarSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  avatarId: z.string(),
  defaultSeats: z.number().int().min(1).max(10).default(3)
})

const updateUserCarSchema = z.object({
  name: z.string().min(1).max(50).optional().nullable(),
  avatarId: z.string().optional(),
  defaultSeats: z.number().int().min(1).max(10).optional()
})

// Get all user's cars
userCarsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const userCars = await prisma.userCar.findMany({
      where: { userId: req.user!.userId },
      include: {
        avatar: true
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ userCars })
  } catch (error) {
    next(error)
  }
})

// Create a new user car
userCarsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createUserCarSchema.parse(req.body)

    // Verify avatar exists
    const avatar = await prisma.avatar.findUnique({
      where: { id: data.avatarId }
    })

    if (!avatar) {
      throw new AppError(404, 'Avatar not found')
    }

    const userCar = await prisma.userCar.create({
      data: {
        userId: req.user!.userId,
        name: data.name,
        avatarId: data.avatarId,
        defaultSeats: data.defaultSeats
      },
      include: {
        avatar: true
      }
    })

    res.status(201).json({ userCar })
  } catch (error) {
    next(error)
  }
})

// Update a user car
userCarsRouter.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const data = updateUserCarSchema.parse(req.body)

    const userCar = await prisma.userCar.findUnique({
      where: { id: req.params.id as string }
    })

    if (!userCar) {
      throw new AppError(404, 'User car not found')
    }

    if (userCar.userId !== req.user!.userId) {
      throw new AppError(403, 'Not your car')
    }

    // Verify avatar exists if provided
    if (data.avatarId) {
      const avatar = await prisma.avatar.findUnique({
        where: { id: data.avatarId }
      })

      if (!avatar) {
        throw new AppError(404, 'Avatar not found')
      }
    }

    const updatedUserCar = await prisma.userCar.update({
      where: { id: req.params.id as string },
      data,
      include: {
        avatar: true
      }
    })

    res.json({ userCar: updatedUserCar })
  } catch (error) {
    next(error)
  }
})

// Delete a user car
userCarsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const userCar = await prisma.userCar.findUnique({
      where: { id: req.params.id as string }
    })

    if (!userCar) {
      throw new AppError(404, 'User car not found')
    }

    if (userCar.userId !== req.user!.userId) {
      throw new AppError(403, 'Not your car')
    }

    // Remove reference from all session cars
    await prisma.car.updateMany({
      where: { userCarId: req.params.id as string },
      data: { userCarId: null }
    })

    await prisma.userCar.delete({
      where: { id: req.params.id as string }
    })

    res.json({ message: 'User car deleted' })
  } catch (error) {
    next(error)
  }
})
