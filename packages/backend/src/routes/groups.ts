import { Router } from 'express'
import { z } from 'zod'
import { customAlphabet } from 'nanoid'
import { prisma } from '../lib/prisma.js'
import { USER_SELECT } from '../lib/prismaSelects.js'
import { authenticate } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

export const groupsRouter = Router()

// Génère des codes en majuscules uniquement (plus facile à lire/taper)
const generateInviteCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)

const createGroupSchema = z.object({
  name: z.string().min(1).max(100)
})

const joinGroupSchema = z.object({
  inviteCode: z.string()
})

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarId: z.string().nullable().optional()
})

// Get user's groups
groupsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.user!.userId },
      include: {
        group: {
          include: {
            avatar: true,
            members: {
              include: {
                user: {
                  select: USER_SELECT
                }
              }
            }
          }
        }
      }
    })

    const groups = memberships.map(m => ({
      ...m.group,
      role: m.role,
      members: m.group.members.map(gm => ({
        ...gm.user,
        role: gm.role,
        joinedAt: gm.joinedAt
      }))
    }))

    res.json({ groups })
  } catch (error) {
    next(error)
  }
})

// Create a group
groupsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { name } = createGroupSchema.parse(req.body)

    const group = await prisma.group.create({
      data: {
        name,
        inviteCode: generateInviteCode(),
        members: {
          create: {
            userId: req.user!.userId,
            role: 'admin'
          }
        }
      },
      include: {
        avatar: true,
        members: {
          include: {
            user: {
              select: USER_SELECT
            }
          }
        }
      }
    })

    // Transform members to match expected format
    const transformedGroup = {
      ...group,
      members: group.members.map(gm => ({
        ...gm.user,
        role: gm.role,
        joinedAt: gm.joinedAt
      }))
    }

    res.status(201).json({ group: transformedGroup })
  } catch (error) {
    next(error)
  }
})

// Join a group
groupsRouter.post('/join', authenticate, async (req, res, next) => {
  try {
    const { inviteCode } = joinGroupSchema.parse(req.body)

    const group = await prisma.group.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() }
    })

    if (!group) {
      throw new AppError(404, 'Group not found', 'GROUP_NOT_FOUND')
    }

    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId: group.id
        }
      }
    })

    if (existingMember) {
      throw new AppError(400, 'Already a member', 'ALREADY_MEMBER')
    }

    await prisma.groupMember.create({
      data: {
        userId: req.user!.userId,
        groupId: group.id,
        role: 'member'
      }
    })

    const updatedGroup = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        avatar: true,
        members: {
          include: {
            user: {
              select: USER_SELECT
            }
          }
        }
      }
    })

    // Transform members to match expected format
    const transformedGroup = updatedGroup ? {
      ...updatedGroup,
      members: updatedGroup.members.map(gm => ({
        ...gm.user,
        role: gm.role,
        joinedAt: gm.joinedAt
      }))
    } : null

    res.json({ group: transformedGroup })
  } catch (error) {
    next(error)
  }
})

// Get group by ID
groupsRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId: req.params.id as string
        }
      }
    })

    if (!membership) {
      throw new AppError(403, 'Not a member of this group')
    }

    const group = await prisma.group.findUnique({
      where: { id: req.params.id as string },
      include: {
        avatar: true,
        members: {
          include: {
            user: {
              select: USER_SELECT
            }
          }
        }
      }
    })

    if (!group) {
      throw new AppError(404, 'Group not found')
    }

    // Transform members to match expected format (flatten user data)
    const transformedGroup = {
      ...group,
      members: group.members.map(gm => ({
        ...gm.user,
        role: gm.role,
        joinedAt: gm.joinedAt
      }))
    }

    res.json({ group: transformedGroup, role: membership.role })
  } catch (error) {
    next(error)
  }
})

// Leave a group
groupsRouter.delete('/:id/leave', authenticate, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId: req.params.id as string
        }
      }
    })

    if (!membership) {
      throw new AppError(404, 'Not a member of this group')
    }

    await prisma.groupMember.delete({
      where: { id: membership.id }
    })

    res.json({ message: 'Left group' })
  } catch (error) {
    next(error)
  }
})

// Update group (admin only)
groupsRouter.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId: req.params.id as string
        }
      }
    })

    if (!membership || membership.role !== 'admin') {
      throw new AppError(403, 'Admin access required')
    }

    const data = updateGroupSchema.parse(req.body)

    const group = await prisma.group.update({
      where: { id: req.params.id as string },
      data,
      include: {
        avatar: true,
        members: {
          include: {
            user: {
              select: USER_SELECT
            }
          }
        }
      }
    })

    const transformedGroup = {
      ...group,
      members: group.members.map(gm => ({
        ...gm.user,
        role: gm.role,
        joinedAt: gm.joinedAt
      }))
    }

    res.json({ group: transformedGroup })
  } catch (error) {
    next(error)
  }
})

// Regenerate invite code (admin only)
groupsRouter.post('/:id/regenerate-code', authenticate, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId: req.params.id as string
        }
      }
    })

    if (!membership || membership.role !== 'admin') {
      throw new AppError(403, 'Admin access required')
    }

    const group = await prisma.group.update({
      where: { id: req.params.id as string },
      data: { inviteCode: generateInviteCode() }
    })

    res.json({ inviteCode: group.inviteCode })
  } catch (error) {
    next(error)
  }
})

// Delete group (admin only)
groupsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.userId,
          groupId: req.params.id as string
        }
      }
    })

    if (!membership || membership.role !== 'admin') {
      throw new AppError(403, 'Admin access required')
    }

    // Delete the group (cascade will handle members, sessions, etc.)
    await prisma.group.delete({
      where: { id: req.params.id as string }
    })

    res.json({ message: 'Groupe supprimé' })
  } catch (error) {
    next(error)
  }
})
