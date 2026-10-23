import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url({
    protocol: /^https?$/,
    error: "NEXT_PUBLIC_APP_URL must be a valid http(s) URL",
  }),
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    protocol: /^https?$/,
    error: "NEXT_PUBLIC_SUPABASE_URL must be a valid http(s) URL",
  }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function formatEnvIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

export class EnvValidationError extends Error {
  constructor(error: z.ZodError) {
    super(
      `Invalid environment configuration. Missing or invalid variables:\n${formatEnvIssues(error)}\nSee .env.example and README.md for the required variables.`,
    );
    this.name = "EnvValidationError";
  }
}

/**
 * Parses and validates only the public (NEXT_PUBLIC_*) environment variables.
 * This module is safe to import from client components: it never reads
 * server-only variables.
 */
export function parsePublicEnv(
  source: Record<string, string | undefined>,
): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!result.success) {
    throw new EnvValidationError(result.error);
  }
  return result.data;
}

let cached: PublicEnv | null = null;

/**
 * Lazily validates and returns the public env. Validation is deferred until
 * first use so that `next build` can compile the app without real env vars.
 */
export function getPublicEnv(): PublicEnv {
  if (!cached) {
    cached = parsePublicEnv({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
  }
  return cached;
}
