import { app } from "@/config/app";

/**
 * Validates a user-supplied `next` redirect target. Only same-origin,
 * relative paths starting with a single "/" are allowed — anything that
 * could be an open redirect (protocol-relative "//", backslashes, absolute
 * URLs, schemes like "javascript:") falls back to the default.
 */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback: string = app.auth.defaultRedirectPath,
): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.startsWith("/\\")) return fallback;
  if (next.includes("\\")) return fallback;
  if (next.includes(":")) return fallback;
  // Reject control characters / whitespace tricks.
  if (/[\u0000-\u001F\u007F\s]/.test(next)) return fallback;
  return next;
}
