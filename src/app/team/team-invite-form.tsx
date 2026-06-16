"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteMember } from "@/actions/org";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyInviteButton } from "./copy-invite-button";

type InviteResult = {
  success?: boolean;
  inviteUrl?: string;
  emailWarning?: string;
  error?: string;
};

/** Form to invite a new member by email. */
export function TeamInviteForm() {
  const router = useRouter();
  const [result, setResult] = useState<InviteResult | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite member</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Mailtrap team invite template must use{" "}
          <code className="text-xs">{"{{invite_link}}"}</code> and{" "}
          <code className="text-xs">{"{{org_name}}"}</code>.
        </p>
        <form
          action={async (fd) => {
            const r = await inviteMember(fd);
            setResult(r);
            if (r?.success) {
              router.refresh();
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <Button type="submit">Send invite</Button>
        </form>
        {result?.error && <p className="mt-4 text-sm text-red-600">{result.error}</p>}
        {result?.success && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-green-700">Invite created</p>
            {result.emailWarning && (
              <p className="text-sm text-amber-600">{result.emailWarning}</p>
            )}
            {result.inviteUrl && (
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={result.inviteUrl}
                  className="font-mono text-xs"
                />
                <CopyInviteButton inviteUrl={result.inviteUrl} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
