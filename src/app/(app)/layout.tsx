import { redirect } from "next/navigation";

import { app } from "@/config/app";
import { AccountMenu } from "@/components/account-menu";
import { AppNav } from "@/components/app-nav";
import { MobileNav } from "@/components/mobile-nav";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Server-side gate for the protected area. The proxy redirect is only UX;
 * every page/action re-verifies the user independently.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `${app.auth.signInPath}?message=${encodeURIComponent("Please sign in to continue.")}`,
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-border p-4 md:block">
        <AppNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <MobileNav />
          <span className="hidden text-sm text-muted-foreground md:block">
            {app.name}
          </span>
          <AccountMenu email={user.email ?? "Account"} />
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
