import { describe, expect, it } from "vitest";

import { app } from "@/config/app";
import { safeRedirectPath } from "@/lib/redirect";

const FALLBACK = app.auth.defaultRedirectPath;

describe("safeRedirectPath", () => {
  it.each(["/dashboard", "/projects/123", "/settings?tab=a", "/"])(
    "allows same-origin relative path %s",
    (path) => {
      expect(safeRedirectPath(path)).toBe(path);
    },
  );

  it.each<[string | null | undefined, string]>([
    [undefined, "undefined"],
    [null, "null"],
    ["", "empty"],
  ])("falls back for %s", (value) => {
    expect(safeRedirectPath(value)).toBe(FALLBACK);
  });

  it.each([
    ["//evil.com", "protocol-relative"],
    ["/\\evil.com", "backslash after slash"],
    ["https://evil.com", "absolute URL"],
    ["http://evil.com/x", "absolute http URL"],
    ["javascript:alert(1)", "javascript scheme"],
    ["evil.com", "bare domain"],
    ["dashboard", "no leading slash"],
    ["/path\\@evil.com", "embedded backslash"],
    ["/%2f%2fevil.com", "encoded slash (rejected via colon-less but kept path)"],
  ])("rejects open-redirect candidate %s (%s)", (value) => {
    const result = safeRedirectPath(value);
    expect(result.startsWith("//")).toBe(false);
    if (value === "/%2f%2fevil.com") {
      // Encoded chars in the path itself are same-origin and allowed.
      expect(result).toBe(value);
    } else {
      expect(result).toBe(FALLBACK);
    }
  });
});
