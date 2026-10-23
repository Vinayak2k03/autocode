import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { app } from "@/config/app";
import { safeRedirectPath } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

const EMAIL_OTP_TYPES: ReadonlySet<string> = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function redirectWithError(request: NextRequest, message: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = `?message=${encodeURIComponent(message)}`;
  return NextResponse.redirect(url);
}

/**
 * Email link landing route. Handles both flows used by Supabase Auth emails:
 *   - token_hash + type  (recommended "Confirm signup/Recovery" templates)
 *   - code             (PKCE flow, e.g. OAuth or code-exchange templates)
 * A `next` param controls the post-verification redirect (validated).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeRedirectPath(searchParams.get("next"));

  const supabase = await createClient();

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectWithError(
        request,
        "This link is invalid or has expired. Please request a new one.",
      );
    }
    return NextResponse.redirect(new URL(next, request.nextUrl.origin));
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash && type && EMAIL_OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) {
      return redirectWithError(
        request,
        "This link is invalid or has expired. Please request a new one.",
      );
    }
    // Recovery links must land on the reset-password form.
    const target =
      type === "recovery" && !searchParams.get("next")
        ? "/reset-password"
        : next;
    return NextResponse.redirect(new URL(target, request.nextUrl.origin));
  }

  return redirectWithError(
    request,
    "This link is invalid or has expired. Please request a new one.",
  );
}
