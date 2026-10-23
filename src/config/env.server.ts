import "server-only";

import { z } from "zod";

import { EnvValidationError } from "./env.public";

const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (value) => /^postgres(ql)?:\/\//.test(value),
    "must be a valid postgres:// or postgresql:// connection URL",
  );

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  DATABASE_URL: postgresUrl,
  DIRECT_URL: postgresUrl,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Parses and validates server-only environment variables from an arbitrary
 * source map so it can be unit-tested without mutating process.env.
 */
export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse({
    NODE_ENV: source.NODE_ENV,
    APP_ENV: source.APP_ENV,
    DATABASE_URL: source.DATABASE_URL,
    DIRECT_URL: source.DIRECT_URL,
  });
  if (!result.success) {
    throw new EnvValidationError(result.error);
  }
  return result.data;
}

let cached: ServerEnv | null = null;

/**
 * Lazily validates and returns the server env. Deferred to first use so that
 * `next build` succeeds without real env vars; any request that actually
 * needs the database will surface a clear error instead.
 */
export function getServerEnv(): ServerEnv {
  if (!cached) {
    cached = parseServerEnv({
      NODE_ENV: process.env.NODE_ENV,
      APP_ENV: process.env.APP_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL,
    });
  }
  return cached;
}
