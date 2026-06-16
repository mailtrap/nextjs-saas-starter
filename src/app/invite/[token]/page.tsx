import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orgInvites, organizations } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteAcceptCard } from "./invite-accept-card";

/** Page for accepting an organization invite via token link. */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = rawToken.trim();

  const [row] = await db
    .select({
      status: orgInvites.status,
      orgName: organizations.name,
    })
    .from(orgInvites)
    .innerJoin(organizations, eq(orgInvites.orgId, organizations.id))
    .where(eq(orgInvites.token, token))
    .limit(1);

  if (!row || row.status !== "pending") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Invite unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This invite link is invalid, expired, or has already been used.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <InviteAcceptCard token={token} orgName={row.orgName} />;
}
