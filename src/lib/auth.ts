import "server-only";

import { createClient } from "@/lib/supabase/server";

export class UnauthenticatedError extends Error {
  constructor() {
    super("You must be signed in to perform this action.");
    this.name = "UnauthenticatedError";
  }
}

/**
 * Verifies the caller's identity on the server via supabase.auth.getUser()
 * (never getSession — that trusts the cookie without validating it).
 * Throws UnauthenticatedError when there is no valid session.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthenticatedError();
  }
  return user;
}
