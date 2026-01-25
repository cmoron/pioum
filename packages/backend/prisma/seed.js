import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const avatars = [
    // Animals category
    { name: 'Lion', imageUrl: '/avatars/lion.svg', category: 'animals' },
    { name: 'Ours', imageUrl: '/avatars/bear.svg', category: 'animals' },
    { name: 'Loup', imageUrl: '/avatars/wolf.svg', category: 'animals' },
    { name: 'Aigle', imageUrl: '/avatars/eagle.svg', category: 'animals' },
    { name: 'Gorille', imageUrl: '/avatars/gorilla.svg', category: 'animals' },
    // Cars category
    { name: 'Citadine', imageUrl: '🚗', category: 'cars' },
    { name: 'SUV', imageUrl: '🚙', category: 'cars' },
    { name: 'Berline', imageUrl: '🚘', category: 'cars' },
    { name: 'Break', imageUrl: '🚐', category: 'cars' },
    { name: 'Sportive', imageUrl: '🏎️', category: 'cars' },
    { name: 'Van', imageUrl: '🚐', category: 'cars' },
    { name: 'Pickup', imageUrl: '🛻', category: 'cars' },
];
async function main() {
    console.log('Seeding database...');
    // Create avatars
    for (const avatar of avatars) {
        await prisma.avatar.upsert({
            where: { id: avatar.name.toLowerCase() },
            update: avatar,
            create: {
                id: avatar.name.toLowerCase(),
                ...avatar
            }
        });
    }
    console.log('Seeded', avatars.length, 'avatars');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map
