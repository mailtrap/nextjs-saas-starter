"use client";

import { useState } from "react";
import Link from "next/link";
import { signInWithMagicLink } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Form to request a passwordless magic-link email. */
export default function MagicLinkPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);
    const result = await signInWithMagicLink(formData);
    if (result?.error) setError(result.error);
    if (result?.success) setMessage(result.success);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Magic link login</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full">
              Send magic link
            </Button>
          </form>
          {message && <p className="mt-4 text-sm text-green-700">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
