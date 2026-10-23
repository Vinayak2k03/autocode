/**
 * Renders a `?message=` query param (used by redirects for expired
 * sessions, invalid email links, etc.) in an aria-live region.
 */
export function AuthMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="status"
      aria-live="polite"
      className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
    >
      {message}
    </p>
  );
}
