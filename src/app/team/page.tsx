import { getTeamRoster } from "@/actions/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyInviteButton } from "./copy-invite-button";
import { TeamInviteForm } from "./team-invite-form";

export const dynamic = "force-dynamic";

function formatInviteDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/** Organization team page with members, pending invites, and invite form. */
export default async function TeamPage() {
  const roster = await getTeamRoster();

  if ("error" in roster) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground">{roster.error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground">{roster.orgName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          {roster.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <ul className="divide-y">
              {roster.members.map((member) => (
                <li
                  key={member.email}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{member.email}</p>
                    {member.fullName && (
                      <p className="text-xs text-muted-foreground">{member.fullName}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRole(member.role)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invites</CardTitle>
        </CardHeader>
        <CardContent>
          {roster.pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            <ul className="divide-y">
              {roster.pendingInvites.map((invite) => (
                <li
                  key={invite.email + invite.createdAt.toISOString()}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited {formatInviteDate(invite.createdAt)}
                    </p>
                  </div>
                  <CopyInviteButton inviteUrl={invite.inviteUrl} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <TeamInviteForm />
    </div>
  );
}
