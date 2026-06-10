import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { avatars, seedAvatarId, seedAvatars, bootstrapAdmins } from '../../prisma/seed.js'

function makePrismaMock() {
  return {
    avatar: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockResolvedValue({}),
    },
    user: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  }
}

function asPrisma(mock: ReturnType<typeof makePrismaMock>): PrismaClient {
  return mock as unknown as PrismaClient
}

describe('seedAvatars', () => {
  it('ne supprime que les avatars seedés retirés de la liste, jamais les uploads admin', async () => {
    const prisma = makePrismaMock()

    await seedAvatars(asPrisma(prisma))

    expect(prisma.avatar.deleteMany).toHaveBeenCalledExactlyOnceWith({
      where: {
        id: { notIn: avatars.map((a) => seedAvatarId(a.name)) },
        // Les avatars uploadés via l'admin ont une imageUrl /api/avatars/files/<key>
        // et doivent survivre au seed (relancé à chaque déploiement staging)
        imageUrl: { startsWith: '/avatars/' },
      },
    })
  })

  it('upserte chaque avatar de la liste avec un id déterministe dérivé du nom', async () => {
    const prisma = makePrismaMock()

    await seedAvatars(asPrisma(prisma))

    expect(prisma.avatar.upsert).toHaveBeenCalledTimes(avatars.length)
    const first = avatars[0]
    expect(prisma.avatar.upsert).toHaveBeenCalledWith({
      where: { id: seedAvatarId(first.name) },
      update: first,
      create: { id: seedAvatarId(first.name), ...first },
    })
  })
})

describe('seedAvatarId', () => {
  it('slugifie le nom en minuscules alphanumériques', () => {
    expect(seedAvatarId('gMelon')).toBe('gmelon')
    expect(seedAvatarId('Vieux Van 2')).toBe('vieux-van-2')
  })
})

describe('bootstrapAdmins', () => {
  it('promeut les emails normalisés (trim + lowercase) qui ne sont pas déjà admin', async () => {
    const prisma = makePrismaMock()

    await bootstrapAdmins(asPrisma(prisma), ' Foo@Example.com ,bar@example.com,')

    expect(prisma.user.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { email: { in: ['foo@example.com', 'bar@example.com'] }, role: { not: 'admin' } },
      data: { role: 'admin' },
    })
  })

  it('ne touche à rien si la liste est vide', async () => {
    const prisma = makePrismaMock()

    await bootstrapAdmins(asPrisma(prisma), '')

    expect(prisma.user.updateMany).not.toHaveBeenCalled()
  })
})
