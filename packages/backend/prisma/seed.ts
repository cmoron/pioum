import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const avatars = [
  // Users category - photos de profil
  { name: 'gMelon', imageUrl: '/avatars/users/avatar_grolem_melon.webp', category: 'users' },
  { name: 'gPiou', imageUrl: '/avatars/users/avatar_grolem_piou.webp', category: 'users' },
  { name: 'gSaucisse', imageUrl: '/avatars/users/avatar_grolem_saucisse.webp', category: 'users' },
  { name: 'gSeb', imageUrl: '/avatars/users/avatar_grolem_seb.webp', category: 'users' },
  { name: 'gTheB', imageUrl: '/avatars/users/avatar_grolem_b.webp', category: 'users' },
  { name: 'gClovi', imageUrl: '/avatars/users/avatar_grolem_clovi.webp', category: 'users' },
  { name: 'gMax', imageUrl: '/avatars/users/avatar_grolem_max.webp', category: 'users' },
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

async function main() {
  console.log('Seeding database...')

  // Supprimer les anciens avatars (ceux qui ne sont plus dans la liste)
  const avatarIds = avatars.map(a => a.name.toLowerCase().replace(/[^a-z0-9]/g, '-'))
  await prisma.avatar.deleteMany({
    where: { id: { notIn: avatarIds } }
  })
  console.log('Cleaned old avatars')

  // Create avatars
  for (const avatar of avatars) {
    await prisma.avatar.upsert({
      where: { id: avatar.name.toLowerCase().replace(/[^a-z0-9]/g, '-') },
      update: avatar,
      create: {
        id: avatar.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        ...avatar
      }
    })
  }

  console.log('Seeded', avatars.length, 'avatars')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
