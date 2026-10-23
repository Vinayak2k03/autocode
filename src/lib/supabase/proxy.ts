import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { EnvValidationError, parsePublicEnv } from "@/config/env.public";
import { app } from "@/config/app";
import { safeRedirectPath } from "@/lib/redirect";

const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/settings"];
const AUTH_PREFIXES = ["/sign-in", "/sign-up", "/forgot-password"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isAuthPage(pathname: string) {
  return AUTH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Refreshes the Supabase session cookie on every request and redirects:
 *  - unauthenticated users away from protected pages (-> /sign-in?next=...)
 *  - authenticated users away from auth pages (-> /dashboard)
 * This is UX only — every server action / route handler re-verifies the
 * user with supabase.auth.getUser().
 */
export async function updateSession(request: NextRequest) {
  let env;
  try {
    env = parsePublicEnv({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    const message =
      error instanceof EnvValidationError
        ? error.message
        : "Missing or invalid environment configuration.";
    return new NextResponse(
      `Autocode is not configured correctly.\n\n${message}`,
      { status: 500, headers: { "content-type": "text/plain" } },
    );
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (isProtected(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = app.auth.signInPath;
    url.search = "";
    url.searchParams.set(
      "next",
      safeRedirectPath(`${pathname}${search}`, app.auth.defaultRedirectPath),
    );
    url.searchParams.set("message", "Please sign in to continue.");
    return NextResponse.redirect(url);
  }

  if (isAuthPage(pathname) && user) {
    const url = request.nextUrl.clone();
    url.pathname = app.auth.defaultRedirectPath;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
