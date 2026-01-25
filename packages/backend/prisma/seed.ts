import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const avatars = [
  // Users category - photos de profil
  { name: 'Melon', imageUrl: '/avatars/users/Avatar_Melon.jpeg', category: 'users' },
  { name: 'Piou', imageUrl: '/avatars/users/Avatar_Piou.jpeg', category: 'users' },
  { name: 'Saucisse', imageUrl: '/avatars/users/Avatar_Saucisse.jpeg', category: 'users' },
  { name: 'Seb', imageUrl: '/avatars/users/Avatar_Seb.jpeg', category: 'users' },
  { name: 'TheB', imageUrl: '/avatars/users/Avatar_TheB.jpeg', category: 'users' },
  { name: 'Clovi', imageUrl: '/avatars/users/Avatar_Clovi.jpeg', category: 'users' },
  { name: 'Lion', imageUrl: '/avatars/users/Avatar_lion.png', category: 'users' },
  { name: 'Gorilla', imageUrl: '/avatars/users/Avatar_gorilla.png', category: 'users' },
  { name: 'Wolf', imageUrl: '/avatars/users/Avatar_wolf.png', category: 'users' },
  { name: 'Bear', imageUrl: '/avatars/users/Avatar_bear.png', category: 'users' },

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
