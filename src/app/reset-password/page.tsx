"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset, updatePassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Password reset request and new-password forms. */
export default function ResetPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              const r = await requestPasswordReset(fd);
              setMessage(r?.success ?? r?.error ?? null);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full">
              Send reset link
            </Button>
          </form>
          {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Set new password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              const r = await updatePassword(fd);
              if (r?.success) window.location.href = "/dashboard";
              if (r?.error) setMessage(r.error);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            <Button type="submit" className="w-full">
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm">
        <Link href="/login" className="underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
