import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import {
  createRecurrencePattern,
  deleteRecurrencePattern,
  getGroupPatterns
} from '../services/recurrence.js'

export const recurrencePatternsRouter = Router()

const createPatternSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:mm requis'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:mm requis'),
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1, 'Au moins un jour requis'),
  startDate: z.string(), // ISO date
  endDate: z.string().optional() // ISO date
})

// Get all patterns for a group
recurrencePatternsRouter.get('/groups/:groupId/recurrence-patterns', authenticate, async (req, res, next) => {
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

    const patterns = await getGroupPatterns(groupId)

    res.json({ patterns })
  } catch (error) {
    next(error)
  }
})

// Create a new pattern
recurrencePatternsRouter.post('/groups/:groupId/recurrence-patterns', authenticate, async (req, res, next) => {
  try {
    const groupId = req.params.groupId as string
    const data = createPatternSchema.parse(req.body)

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

    // Validate times
    if (data.startTime >= data.endTime) {
      throw new AppError(400, 'L\'heure de fin doit être après l\'heure de début')
    }

    // Validate dates
    const startDate = new Date(data.startDate)
    const endDate = data.endDate ? new Date(data.endDate) : undefined

    if (endDate && endDate < startDate) {
      throw new AppError(400, 'La date de fin doit être après la date de début')
    }

    const { pattern, sessionsCreated } = await createRecurrencePattern({
      groupId,
      createdById: req.user!.userId,
      startTime: data.startTime,
      endTime: data.endTime,
      daysOfWeek: data.daysOfWeek,
      startDate,
      endDate
    })

    res.status(201).json({ pattern, sessionsCreated })
  } catch (error) {
    next(error)
  }
})

// Delete a pattern
recurrencePatternsRouter.delete('/recurrence-patterns/:id', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id as string
    const deleteFutureSessions = req.query.deleteFutureSessions === 'true'

    const pattern = await prisma.recurrencePattern.findUnique({
      where: { id },
      include: { group: true }
    })

    if (!pattern) {
      throw new AppError(404, 'Pattern not found')
    }

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId: pattern.groupId
        }
      }
    })

    if (!membership) {
      throw new AppError(403, 'Not a member of this group')
    }

    // Only creator or admin can delete
    if (pattern.createdById !== req.user!.userId && membership.role !== 'admin') {
      throw new AppError(403, 'Seul le créateur ou un admin peut supprimer ce pattern')
    }

    await deleteRecurrencePattern(id, deleteFutureSessions)

    res.json({ message: 'Pattern deleted' })
  } catch (error) {
    next(error)
  }
})
