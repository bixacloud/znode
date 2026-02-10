import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch (e) {
    console.warn('⚠️ Could not initialize Prisma Client (DATABASE_URL may not be set). Install wizard will handle setup.');
    return new Proxy({} as PrismaClient, {
      get(_, prop) {
        if (prop === '$connect' || prop === '$disconnect') {
          return () => Promise.resolve();
        }
        if (prop === 'then') return undefined;
        throw new Error('Database not configured. Please run the install wizard.');
      },
    });
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
