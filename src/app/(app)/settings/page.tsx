import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-muted-foreground">Signed in as</p>
          <p>{user.email}</p>
        </CardContent>
      </Card>
      <Card className="border-dashed opacity-60" aria-disabled="true">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Preferences</CardTitle>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            Coming soon
          </span>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Additional settings will be available in a future phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
