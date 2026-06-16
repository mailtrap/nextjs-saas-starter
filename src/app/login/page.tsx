"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeRedirect } from "@/lib/utils";

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeRedirect(searchParams.get("redirect"));
  const redirectQuery = searchParams.get("redirect")
    ? `?redirect=${encodeURIComponent(redirect)}`
    : "";

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await signIn(formData);
    if (result?.error) setError(result.error);
    else router.push(redirect);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full">
              Log in
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/magic-link" className="underline">
              Magic link
            </Link>
            {" · "}
            <Link href="/reset-password" className="underline">
              Forgot password
            </Link>
          </p>
        </CardContent>
      </Card>
      <p className="text-center text-sm">
        No account?{" "}
        <Link href={`/signup${redirectQuery}`} className="underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

/** Email and password login form. */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
