import { config } from "dotenv";

config({ path: ".env.local" });
config();
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI commands (migrate dev/deploy/diff, studio) use the direct connection.
    // The pooled DATABASE_URL is only used by the runtime Prisma Client
    // (see src/config/database.ts).
    // Read lazily so `prisma generate`/`validate` work without env vars.
    // Commands that open a connection (migrate dev/deploy, studio) require
    // DIRECT_URL to be set and will fail with a clear driver error if not.
    url: process.env.DIRECT_URL ?? "",
  },
});
