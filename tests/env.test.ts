import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "@/config/env.public";
import { parseServerEnv } from "@/config/env.server";

const validPublic = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

const validServer = {
  DATABASE_URL: "postgresql://u:p@host:6543/postgres?pgbouncer=true",
  DIRECT_URL: "postgresql://u:p@host:5432/postgres",
};

describe("parsePublicEnv", () => {
  it("accepts a valid config", () => {
    expect(parsePublicEnv(validPublic)).toEqual(validPublic);
  });

  it("fails with a clear message listing missing vars", () => {
    expect(() => parsePublicEnv({})).toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("rejects a non-URL app URL", () => {
    expect(() =>
      parsePublicEnv({ ...validPublic, NEXT_PUBLIC_APP_URL: "notaurl" }),
    ).toThrowError(/NEXT_PUBLIC_APP_URL/);
  });
});

describe("parseServerEnv", () => {
  it("accepts a valid config and applies defaults", () => {
    const env = parseServerEnv(validServer);
    expect(env.NODE_ENV).toBe("development");
    expect(env.DATABASE_URL).toBe(validServer.DATABASE_URL);
  });

  it("fails when DATABASE_URL is missing", () => {
    expect(() =>
      parseServerEnv({ DIRECT_URL: validServer.DIRECT_URL }),
    ).toThrowError(/DATABASE_URL/);
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expect(() =>
      parseServerEnv({ ...validServer, DATABASE_URL: "https://example.com" }),
    ).toThrowError(/DATABASE_URL/);
  });

  it("rejects a non-postgres DIRECT_URL", () => {
    expect(() =>
      parseServerEnv({ ...validServer, DIRECT_URL: "mysql://x" }),
    ).toThrowError(/DIRECT_URL/);
  });

  it("keeps public vars out of the server schema", () => {
    const env = parseServerEnv({ ...validServer, ...validPublic });
    expect(env).not.toHaveProperty("NEXT_PUBLIC_SUPABASE_URL");
  });
});
