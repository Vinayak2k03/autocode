import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { getDatabaseConfig } from "@/config/database";
import { PrismaClient } from "@/lib/database/generated/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const { url } = getDatabaseConfig();
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

/**
 * Lazily-initialised Prisma singleton. Created on first access so that
 * `next build` and tests can import modules without a live DATABASE_URL.
 */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}
