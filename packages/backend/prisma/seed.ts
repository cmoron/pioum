import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const avatars = [
  // Users category - photos de profil
  { name: 'gMelon', imageUrl: '/avatars/users/avatar_grolem_melon.jpeg', category: 'users' },
  { name: 'gPiou', imageUrl: '/avatars/users/avatar_grolem_piou.jpeg', category: 'users' },
  { name: 'gSaucisse', imageUrl: '/avatars/users/avatar_grolem_saucisse.jpeg', category: 'users' },
  { name: 'gSeb', imageUrl: '/avatars/users/avatar_grolem_seb.jpeg', category: 'users' },
  { name: 'gTheB', imageUrl: '/avatars/users/avatar_grolem_b.jpeg', category: 'users' },
  { name: 'gClovi', imageUrl: '/avatars/users/avatar_grolem_clovi.jpeg', category: 'users' },
  { name: 'aLion', imageUrl: '/avatars/users/avatar_animal_lion.jpeg', category: 'users' },
  { name: 'aGorilla', imageUrl: '/avatars/users/avatar_animal_gorilla.jpeg', category: 'users' },
  { name: 'aWolf', imageUrl: '/avatars/users/avatar_animal_wolf.jpeg', category: 'users' },
  { name: 'aBear', imageUrl: '/avatars/users/avatar_animal_bear.jpeg', category: 'users' },

  // Cars category - avatars pour les voitures
  { name: 'Van', imageUrl: '/avatars/cars/cars_van.png', category: 'cars' },
  { name: 'Citadine', imageUrl: '/avatars/cars/cars_citadine.png', category: 'cars' },
  { name: 'Sportive', imageUrl: '/avatars/cars/cars_sportive.png', category: 'cars' },
  { name: 'Berline', imageUrl: '/avatars/cars/cars_berline.png', category: 'cars' },
  { name: 'SUV', imageUrl: '/avatars/cars/cars_suv.png', category: 'cars' },

  // Groups category - avatars pour les groupes
  { name: 'Fitness', imageUrl: '🏋️‍♂️', category: 'groups' },
  { name: 'Muscle', imageUrl: '💪', category: 'groups' },
  { name: 'Shaker', imageUrl: '🥤', category: 'groups' },
  { name: 'Trophée', imageUrl: '🏆', category: 'groups' },
  { name: 'Équipe', imageUrl: '👥', category: 'groups' },
  { name: 'Gym', imageUrl: '🏢', category: 'groups' },
  { name: 'Médaille', imageUrl: '🥇', category: 'groups' },
  { name: 'Feu', imageUrl: '🔥', category: 'groups' },
  { name: 'Étoile', imageUrl: '⭐', category: 'groups' },
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
