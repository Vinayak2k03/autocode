import "server-only";

import { getServerEnv } from "./env.server";

export type DatabaseConfig = {
  /** Pooled runtime connection string (Supavisor, transaction mode). */
  url: string;
};

/**
 * Single source of truth for the runtime database connection. The Prisma
 * singleton in src/lib/database/prisma.ts reads only from here.
 */
export function getDatabaseConfig(): DatabaseConfig {
  const env = getServerEnv();
  return { url: env.DATABASE_URL };
}
