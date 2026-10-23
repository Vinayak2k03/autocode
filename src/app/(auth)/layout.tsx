import Link from "next/link";

import { app } from "@/config/app";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          {app.name}
        </Link>
        <p className="text-sm text-muted-foreground">{app.description}</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
