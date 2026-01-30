import { prisma } from '../lib/prisma.js'
import { addDays, startOfDay } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

// All times in patterns are stored as Paris time
const TIMEZONE = 'Europe/Paris'

interface CreatePatternInput {
  groupId: string
  createdById: string
  startTime: string // HH:mm
  endTime: string // HH:mm
  daysOfWeek: number[] // 0=Sunday, 1=Monday, etc.
  startDate: Date
  endDate?: Date
}

// Generate sessions for a recurrence pattern
// Returns the number of sessions created
export async function generateSessionsForPattern(
  patternId: string,
  daysAhead: number = 90
): Promise<number> {
  const pattern = await prisma.recurrencePattern.findUnique({
    where: { id: patternId }
  })

  if (!pattern) {
    throw new Error('Pattern not found')
  }

  const today = startOfDay(new Date())
  const endDate = pattern.endDate
    ? new Date(Math.min(pattern.endDate.getTime(), addDays(today, daysAhead).getTime()))
    : addDays(today, daysAhead)

  // Start from today or pattern start date, whichever is later
  let currentDate = new Date(Math.max(today.getTime(), pattern.startDate.getTime()))
  currentDate = startOfDay(currentDate)

  const sessionsToCreate: {
    groupId: string
    date: Date
    startTime: Date
    endTime: Date
    recurrencePatternId: string
    createdById: string
  }[] = []

  // Parse start/end times
  const [startHour, startMin] = pattern.startTime.split(':').map(Number)
  const [endHour, endMin] = pattern.endTime.split(':').map(Number)

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay() // 0=Sunday, 1=Monday, etc.

    if (pattern.daysOfWeek.includes(dayOfWeek)) {
      // Create session datetime in Paris timezone, then convert to UTC
      // This ensures DST is handled correctly
      const parisStartTime = new Date(currentDate)
      parisStartTime.setHours(startHour, startMin, 0, 0)
      const sessionStartTime = fromZonedTime(parisStartTime, TIMEZONE)

      const parisEndTime = new Date(currentDate)
      parisEndTime.setHours(endHour, endMin, 0, 0)
      const sessionEndTime = fromZonedTime(parisEndTime, TIMEZONE)

      sessionsToCreate.push({
        groupId: pattern.groupId,
        date: currentDate,
        startTime: sessionStartTime,
        endTime: sessionEndTime,
        recurrencePatternId: pattern.id,
        createdById: pattern.createdById
      })
    }

    currentDate = addDays(currentDate, 1)
  }

  // Create sessions, skipping duplicates (using unique constraint on groupId+startTime)
  let created = 0
  for (const sessionData of sessionsToCreate) {
    try {
      await prisma.session.create({
        data: sessionData
      })
      created++
    } catch (error: unknown) {
      // Skip if session already exists (unique constraint violation)
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        continue
      }
      throw error
    }
  }

  return created
}

// Create a new recurrence pattern and generate initial sessions
export async function createRecurrencePattern(input: CreatePatternInput): Promise<{
  pattern: Awaited<ReturnType<typeof prisma.recurrencePattern.create>>
  sessionsCreated: number
}> {
  const pattern = await prisma.recurrencePattern.create({
    data: {
      groupId: input.groupId,
      createdById: input.createdById,
      startTime: input.startTime,
      endTime: input.endTime,
      daysOfWeek: input.daysOfWeek,
      startDate: input.startDate,
      endDate: input.endDate
    }
  })

  const sessionsCreated = await generateSessionsForPattern(pattern.id)

  return { pattern, sessionsCreated }
}

// Delete a pattern and optionally its future sessions
export async function deleteRecurrencePattern(
  patternId: string,
  deleteFutureSessions: boolean = false
): Promise<void> {
  if (deleteFutureSessions) {
    const now = new Date()
    await prisma.session.deleteMany({
      where: {
        recurrencePatternId: patternId,
        startTime: { gt: now },
        // Only delete sessions with no participants
        passengers: { none: {} }
      }
    })
  }

  // Detach remaining sessions from pattern
  await prisma.session.updateMany({
    where: { recurrencePatternId: patternId },
    data: { recurrencePatternId: null }
  })

  await prisma.recurrencePattern.delete({
    where: { id: patternId }
  })
}

// Get all patterns for a group
export async function getGroupPatterns(groupId: string) {
  return prisma.recurrencePattern.findMany({
    where: { groupId },
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
}
