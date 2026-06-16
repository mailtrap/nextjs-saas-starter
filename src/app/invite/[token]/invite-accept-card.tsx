"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/actions/org";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  token: string;
  orgName: string;
};

/** Client form to accept a pending team invite. */
export function InviteAcceptCard({ token, orgName }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const redirectPath = `/invite/${token}`;
  const authQuery = `?redirect=${encodeURIComponent(redirectPath)}`;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const result = await acceptInvite(token);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    router.push("/team");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Accept team invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You have been invited to join <strong>{orgName}</strong>.
          </p>
          <form action={handleSubmit}>
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Joining…" : "Join organization"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            <Link href={`/login${authQuery}`} className="underline">
              Log in
            </Link>
            {" · "}
            <Link href={`/signup${authQuery}`} className="underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
