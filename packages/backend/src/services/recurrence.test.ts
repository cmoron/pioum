import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addDays, startOfDay, format } from 'date-fns'

// Mock prisma before importing the module
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    recurrencePattern: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn()
    },
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn()
    }
  }
}))

import { prisma } from '../lib/prisma.js'
import {
  generateSessionsForPattern,
  createRecurrencePattern,
  deleteRecurrencePattern,
  getGroupPatterns
} from './recurrence.js'

const mockedPrisma = vi.mocked(prisma)

describe('RecurrenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateSessionsForPattern', () => {
    it('should throw error if pattern not found', async () => {
      mockedPrisma.recurrencePattern.findUnique.mockResolvedValue(null)

      await expect(generateSessionsForPattern('non-existent-id')).rejects.toThrow('Pattern not found')
    })

    it('should generate sessions for correct days of week', async () => {
      const today = startOfDay(new Date())
      const pattern = {
        id: 'pattern-1',
        groupId: 'group-1',
        createdById: 'user-1',
        startTime: '12:00',
        endTime: '14:00',
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        startDate: today,
        endDate: addDays(today, 14), // 2 weeks
        createdAt: new Date()
      }

      mockedPrisma.recurrencePattern.findUnique.mockResolvedValue(pattern)
      mockedPrisma.session.create.mockResolvedValue({} as never)

      const created = await generateSessionsForPattern('pattern-1')

      // Verify that create was called for each matching day
      const calls = mockedPrisma.session.create.mock.calls

      // Each call should have recurrencePatternId set
      calls.forEach(call => {
        expect(call[0].data.recurrencePatternId).toBe('pattern-1')
        expect(call[0].data.groupId).toBe('group-1')
      })

      // All created sessions should be on Mon, Wed, or Fri
      calls.forEach(call => {
        const date = call[0].data.date as Date
        const dayOfWeek = date.getDay()
        expect([1, 3, 5]).toContain(dayOfWeek)
      })

      expect(created).toBe(calls.length)
    })

    it('should set correct start and end times', async () => {
      const today = startOfDay(new Date())
      // Find next Monday
      let nextMonday = today
      while (nextMonday.getDay() !== 1) {
        nextMonday = addDays(nextMonday, 1)
      }

      const pattern = {
        id: 'pattern-1',
        groupId: 'group-1',
        createdById: 'user-1',
        startTime: '11:30',
        endTime: '14:00',
        daysOfWeek: [1], // Only Monday
        startDate: nextMonday,
        endDate: addDays(nextMonday, 7), // Just one Monday
        createdAt: new Date()
      }

      mockedPrisma.recurrencePattern.findUnique.mockResolvedValue(pattern)
      mockedPrisma.session.create.mockResolvedValue({} as never)

      await generateSessionsForPattern('pattern-1')

      const calls = mockedPrisma.session.create.mock.calls
      expect(calls.length).toBeGreaterThan(0)

      const firstCall = calls[0][0].data
      const startTime = firstCall.startTime as Date
      const endTime = firstCall.endTime as Date

      expect(startTime.getHours()).toBe(11)
      expect(startTime.getMinutes()).toBe(30)
      expect(endTime.getHours()).toBe(14)
      expect(endTime.getMinutes()).toBe(0)
    })

    it('should skip duplicate sessions (unique constraint)', async () => {
      const today = startOfDay(new Date())
      const pattern = {
        id: 'pattern-1',
        groupId: 'group-1',
        createdById: 'user-1',
        startTime: '12:00',
        endTime: '14:00',
        daysOfWeek: [1, 2, 3, 4, 5],
        startDate: today,
        endDate: addDays(today, 7),
        createdAt: new Date()
      }

      mockedPrisma.recurrencePattern.findUnique.mockResolvedValue(pattern)

      // First call succeeds, second throws unique constraint
      mockedPrisma.session.create
        .mockResolvedValueOnce({} as never)
        .mockRejectedValueOnce(new Error('Unique constraint failed'))
        .mockResolvedValue({} as never)

      const created = await generateSessionsForPattern('pattern-1')

      // Should have skipped the duplicate
      const totalCalls = mockedPrisma.session.create.mock.calls.length
      expect(created).toBe(totalCalls - 1)
    })

    it('should respect pattern end date', async () => {
      const today = startOfDay(new Date())
      const pattern = {
        id: 'pattern-1',
        groupId: 'group-1',
        createdById: 'user-1',
        startTime: '12:00',
        endTime: '14:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Every day
        startDate: today,
        endDate: addDays(today, 5), // 6 days total (today + 5)
        createdAt: new Date()
      }

      mockedPrisma.recurrencePattern.findUnique.mockResolvedValue(pattern)
      mockedPrisma.session.create.mockResolvedValue({} as never)

      await generateSessionsForPattern('pattern-1')

      const calls = mockedPrisma.session.create.mock.calls
      // Should create exactly 6 sessions (today through endDate inclusive)
      expect(calls.length).toBe(6)
    })

    it('should not generate sessions for dates before start date', async () => {
      const futureStart = addDays(startOfDay(new Date()), 7)
      const pattern = {
        id: 'pattern-1',
        groupId: 'group-1',
        createdById: 'user-1',
        startTime: '12:00',
        endTime: '14:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startDate: futureStart,
        endDate: addDays(futureStart, 3),
        createdAt: new Date()
      }

      mockedPrisma.recurrencePattern.findUnique.mockResolvedValue(pattern)
      mockedPrisma.session.create.mockResolvedValue({} as never)

      await generateSessionsForPattern('pattern-1')

      const calls = mockedPrisma.session.create.mock.calls
      // All dates should be >= futureStart
      calls.forEach(call => {
        const date = call[0].data.date as Date
        expect(date.getTime()).toBeGreaterThanOrEqual(startOfDay(futureStart).getTime())
      })
    })
  })

  describe('createRecurrencePattern', () => {
    it('should create pattern and generate sessions', async () => {
      const today = startOfDay(new Date())
      const patternData = {
        groupId: 'group-1',
        createdById: 'user-1',
        startTime: '12:00',
        endTime: '14:00',
        daysOfWeek: [1, 2, 3, 4, 5],
        startDate: today,
        endDate: addDays(today, 30)
      }

      const createdPattern = {
        id: 'new-pattern-id',
        ...patternData,
        createdAt: new Date()
      }

      mockedPrisma.recurrencePattern.create.mockResolvedValue(createdPattern)
      mockedPrisma.recurrencePattern.findUnique.mockResolvedValue(createdPattern)
      mockedPrisma.session.create.mockResolvedValue({} as never)

      const result = await createRecurrencePattern(patternData)

      expect(result.pattern.id).toBe('new-pattern-id')
      expect(result.sessionsCreated).toBeGreaterThan(0)
      expect(mockedPrisma.recurrencePattern.create).toHaveBeenCalledWith({
        data: patternData
      })
    })
  })

  describe('deleteRecurrencePattern', () => {
    it('should detach sessions and delete pattern', async () => {
      await deleteRecurrencePattern('pattern-1', false)

      expect(mockedPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { recurrencePatternId: 'pattern-1' },
        data: { recurrencePatternId: null }
      })
      expect(mockedPrisma.recurrencePattern.delete).toHaveBeenCalledWith({
        where: { id: 'pattern-1' }
      })
      expect(mockedPrisma.session.deleteMany).not.toHaveBeenCalled()
    })

    it('should delete future sessions when requested', async () => {
      await deleteRecurrencePattern('pattern-1', true)

      expect(mockedPrisma.session.deleteMany).toHaveBeenCalled()
      const deleteCall = mockedPrisma.session.deleteMany.mock.calls[0][0]
      expect(deleteCall.where.recurrencePatternId).toBe('pattern-1')
      expect(deleteCall.where.startTime.gt).toBeDefined()
      expect(deleteCall.where.passengers).toEqual({ none: {} })
    })
  })

  describe('getGroupPatterns', () => {
    it('should return patterns with creator and session count', async () => {
      const mockPatterns = [
        {
          id: 'pattern-1',
          groupId: 'group-1',
          createdById: 'user-1',
          startTime: '12:00',
          endTime: '14:00',
          daysOfWeek: [1, 2, 3, 4, 5],
          startDate: new Date(),
          endDate: null,
          createdAt: new Date(),
          createdBy: { id: 'user-1', name: 'Test User' },
          _count: { sessions: 10 }
        }
      ]

      mockedPrisma.recurrencePattern.findMany.mockResolvedValue(mockPatterns)

      const patterns = await getGroupPatterns('group-1')

      expect(patterns).toEqual(mockPatterns)
      expect(mockedPrisma.recurrencePattern.findMany).toHaveBeenCalledWith({
        where: { groupId: 'group-1' },
        include: {
          createdBy: {
            select: { id: true, name: true }
          },
          _count: {
            select: { sessions: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    })
  })
})

describe('Session generation edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle pattern with no end date (uses 90 days ahead)', async () => {
    const today = startOfDay(new Date())
    const pattern = {
      id: 'pattern-1',
      groupId: 'group-1',
      createdById: 'user-1',
      startTime: '12:00',
      endTime: '14:00',
      daysOfWeek: [1], // Only Monday
      startDate: today,
      endDate: null, // No end date
      createdAt: new Date()
    }

    mockedPrisma.recurrencePattern.findUnique.mockResolvedValue(pattern)
    mockedPrisma.session.create.mockResolvedValue({} as never)

    await generateSessionsForPattern('pattern-1')

    const calls = mockedPrisma.session.create.mock.calls
    // Should have ~13 Mondays in 90 days
    expect(calls.length).toBeGreaterThan(10)
    expect(calls.length).toBeLessThan(15)

    // Verify all sessions are on Monday
    calls.forEach(call => {
      const date = call[0].data.date as Date
      expect(date.getDay()).toBe(1)
    })
  })

  it('should handle weekend-only pattern', async () => {
    const today = startOfDay(new Date())
    const pattern = {
      id: 'pattern-1',
      groupId: 'group-1',
      createdById: 'user-1',
      startTime: '10:00',
      endTime: '12:00',
      daysOfWeek: [0, 6], // Sunday and Saturday
      startDate: today,
      endDate: addDays(today, 14),
      createdAt: new Date()
    }

    mockedPrisma.recurrencePattern.findUnique.mockResolvedValue(pattern)
    mockedPrisma.session.create.mockResolvedValue({} as never)

    await generateSessionsForPattern('pattern-1')

    const calls = mockedPrisma.session.create.mock.calls
    // Should only have weekend days
    calls.forEach(call => {
      const date = call[0].data.date as Date
      const dayOfWeek = date.getDay()
      expect([0, 6]).toContain(dayOfWeek)
    })
  })
})
