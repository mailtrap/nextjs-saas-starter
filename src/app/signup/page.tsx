"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeRedirect } from "@/lib/utils";

function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeRedirect(searchParams.get("redirect"));
  const redirectQuery = searchParams.get("redirect")
    ? `?redirect=${encodeURIComponent(redirect)}`
    : "";

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await signUp(formData);
    if (result?.error) setError(result.error);
    else router.push(redirect);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Name</Label>
              <Input id="fullName" name="fullName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full">
              Sign up
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-sm">
        Have an account?{" "}
        <Link href={`/login${redirectQuery}`} className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

/** New account registration form. */
export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-center">Loading…</div>}>
      <SignUpForm />
    </Suspense>
  );
}
