import type { Metadata } from "next";

import { AuthMessage } from "@/components/auth-message";
import { SignInForm } from "@/components/forms/sign-in-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const { next, message } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AuthMessage message={message} />
        <SignInForm next={next} />
      </CardContent>
    </Card>
  );
}
