import { PrismaClient } from '@prisma/client'
import { pathToFileURL } from 'node:url'

export const avatars = [
  // Users category - photos de profil
  { name: 'gMelon', imageUrl: '/avatars/users/avatar_grolem_melon.webp', category: 'users' },
  { name: 'gPiou', imageUrl: '/avatars/users/avatar_grolem_piou.webp', category: 'users' },
  { name: 'gSaucisse', imageUrl: '/avatars/users/avatar_grolem_saucisse.webp', category: 'users' },
  { name: 'gSeb', imageUrl: '/avatars/users/avatar_grolem_seb.webp', category: 'users' },
  { name: 'gTheB', imageUrl: '/avatars/users/avatar_grolem_b.webp', category: 'users' },
  { name: 'gClovi', imageUrl: '/avatars/users/avatar_grolem_clovi.webp', category: 'users' },
  { name: 'gMax', imageUrl: '/avatars/users/avatar_grolem_max.webp', category: 'users' },
  { name: 'gChristophe', imageUrl: '/avatars/users/avatar_grolem_christophe.webp', category: 'users' },
  { name: 'aLion', imageUrl: '/avatars/users/avatar_animal_lion.webp', category: 'users' },
  { name: 'aGorilla', imageUrl: '/avatars/users/avatar_animal_gorilla.webp', category: 'users' },
  { name: 'aWolf', imageUrl: '/avatars/users/avatar_animal_wolf.webp', category: 'users' },
  { name: 'aBear', imageUrl: '/avatars/users/avatar_animal_bear.webp', category: 'users' },
  { name: 'aShark', imageUrl: '/avatars/users/avatar_animal_shark.webp', category: 'users' },
  { name: 'hSuperman', imageUrl: '/avatars/users/avatar_hero_superman.webp', category: 'users' },
  { name: 'hHulk', imageUrl: '/avatars/users/avatar_hero_hulk.webp', category: 'users' },
  { name: 'hBatman', imageUrl: '/avatars/users/avatar_hero_batman.webp', category: 'users' },

  // Cars category - avatars pour les voitures
  { name: 'Van', imageUrl: '/avatars/cars/cars_van.png', category: 'cars' },
  { name: 'Citadine', imageUrl: '/avatars/cars/cars_citadine.png', category: 'cars' },
  { name: 'Sportive', imageUrl: '/avatars/cars/cars_sportive.png', category: 'cars' },
  { name: 'Berline', imageUrl: '/avatars/cars/cars_berline.png', category: 'cars' },
  { name: 'SUV', imageUrl: '/avatars/cars/cars_suv.png', category: 'cars' },

  // Groups category - avatars pour les groupes
  { name: 'Genius', imageUrl: '/avatars/groups/avatar_groups_genius.webp', category: 'groups' },
  { name: 'Gorillas', imageUrl: '/avatars/groups/avatar_groups_gorillas.webp', category: 'groups' },
  { name: 'Lions', imageUrl: '/avatars/groups/avatar_groups_lions.webp', category: 'groups' },
  { name: 'Sharks', imageUrl: '/avatars/groups/avatar_groups_sharks.webp', category: 'groups' },
  { name: 'Wolves', imageUrl: '/avatars/groups/avatar_groups_wolves.webp', category: 'groups' },
]

/** Id déterministe d'un avatar seedé, dérivé de son nom. */
export function seedAvatarId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-')
}

export async function seedAvatars(prisma: PrismaClient): Promise<void> {
  const avatarIds = avatars.map((a) => seedAvatarId(a.name))

  // Ne supprimer que les avatars seedés (imageUrl statique /avatars/...) retirés
  // de la liste. Les avatars uploadés via l'admin (/api/avatars/files/<key>, id cuid)
  // doivent survivre : le seed est relancé à chaque déploiement.
  await prisma.avatar.deleteMany({
    where: {
      id: { notIn: avatarIds },
      imageUrl: { startsWith: '/avatars/' },
    },
  })
  console.log('Cleaned removed seed avatars')

  for (const avatar of avatars) {
    await prisma.avatar.upsert({
      where: { id: seedAvatarId(avatar.name) },
      update: avatar,
      create: {
        id: seedAvatarId(avatar.name),
        ...avatar,
      },
    })
  }

  console.log('Seeded', avatars.length, 'avatars')
}

// Bootstrap platform admins (idempotent).
// ADMIN_BOOTSTRAP_EMAILS=comma,separated,emails — promotes matching existing users to "admin".
export async function bootstrapAdmins(prisma: PrismaClient, emailsCsv: string): Promise<void> {
  const bootstrapEmails = emailsCsv
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (bootstrapEmails.length === 0) return

  const { count } = await prisma.user.updateMany({
    where: { email: { in: bootstrapEmails }, role: { not: 'admin' } },
    data: { role: 'admin' },
  })
  console.log(`Promoted ${count} user(s) to admin from ADMIN_BOOTSTRAP_EMAILS`)
}

async function main(prisma: PrismaClient): Promise<void> {
  console.log('Seeding database...')
  await seedAvatars(prisma)
  await bootstrapAdmins(prisma, process.env.ADMIN_BOOTSTRAP_EMAILS ?? '')
}

// Exécution directe uniquement (tsx prisma/seed.ts) — pas d'effet de bord à l'import (tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = new PrismaClient()
  main(prisma)
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
