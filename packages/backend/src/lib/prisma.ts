import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const logLevels: ('query' | 'error' | 'warn')[] =
  process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn']

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: logLevels,
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
