"use server";

import { and, desc, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { orgInvites, orgMembers, organizations, profiles } from "@/db/schema";
import { sendEmail } from "@/lib/mailtrap";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/utils";

export type TeamMember = {
  email: string;
  fullName: string | null;
  role: string;
};

export type PendingInvite = {
  email: string;
  createdAt: Date;
  inviteUrl: string;
};

export type TeamRoster =
  | {
      orgName: string;
      members: TeamMember[];
      pendingInvites: PendingInvite[];
    }
  | { error: string };

/** Loads org members and pending invites for the current user's organization. */
export async function getTeamRoster(): Promise<TeamRoster> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [membership] = await db
    .select({ org: organizations })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, user.id))
    .limit(1);

  if (!membership) return { error: "No organization found" };

  const memberRows = await db
    .select({
      email: profiles.email,
      fullName: profiles.fullName,
      role: orgMembers.role,
    })
    .from(orgMembers)
    .innerJoin(profiles, eq(orgMembers.userId, profiles.id))
    .where(eq(orgMembers.orgId, membership.org.id));

  memberRows.sort((a, b) => {
    if (a.role === "owner" && b.role !== "owner") return -1;
    if (b.role === "owner" && a.role !== "owner") return 1;
    return a.email.localeCompare(b.email);
  });
  const memberEmailSet = new Set(memberRows.map((row) => row.email.trim().toLowerCase()));

  const pendingRows = await db
    .select({
      email: orgInvites.email,
      createdAt: orgInvites.createdAt,
      token: orgInvites.token,
    })
    .from(orgInvites)
    .where(and(eq(orgInvites.orgId, membership.org.id), eq(orgInvites.status, "pending")))
    .orderBy(desc(orgInvites.createdAt));

  const appUrl = getAppUrl();

  return {
    orgName: membership.org.name,
    members: memberRows,
    pendingInvites: pendingRows
      .filter((row) => !memberEmailSet.has(row.email.trim().toLowerCase()))
      .map((row) => ({
        email: row.email,
        createdAt: row.createdAt,
        inviteUrl: `${appUrl}/invite/${row.token}`,
      })),
  };
}

type InviteMemberResult = {
  success?: boolean;
  inviteUrl?: string;
  emailWarning?: string;
  error?: string;
};

/** Creates an org invite and sends a team invite email to the given address. */
export async function inviteMember(formData: FormData): Promise<InviteMemberResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [membership] = await db
    .select({ org: organizations })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, user.id))
    .limit(1);

  if (!membership) return { error: "No organization found" };

  const [existingMember] = await db
    .select({ email: profiles.email })
    .from(orgMembers)
    .innerJoin(profiles, eq(orgMembers.userId, profiles.id))
    .where(and(eq(orgMembers.orgId, membership.org.id), eq(profiles.email, email)))
    .limit(1);

  if (existingMember) {
    return { error: "This user is already a member of your organization." };
  }

  const token = randomBytes(24).toString("hex");
  const inviteUrl = `${getAppUrl()}/invite/${token}`;
  const [invite] = await db
    .insert(orgInvites)
    .values({
      orgId: membership.org.id,
      email,
      token,
      status: "pending",
    })
    .returning();

  let emailWarning: string | undefined;
  try {
    await sendEmail({
      templateKey: "team_invite",
      to: email,
      variables: {
        invite_link: inviteUrl,
        org_name: membership.org.name,
      },
      idempotencyKey: `invite:${invite.id}`,
      userId: user.id,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to send team invite email:", err);
      emailWarning =
        "Email failed to send (check MAILTRAP_TPL_TEAM_INVITE). Use the invite link below.";
    }
  }

  revalidatePath("/team");

  return { success: true, inviteUrl, ...(emailWarning && { emailWarning }) };
}

type ActionResult = { error?: string; success?: boolean };

/** Accepts a pending org invite and adds the current user as a member. */
export async function acceptInvite(token: string): Promise<ActionResult> {
  const normalizedToken = token.trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/invite/${normalizedToken}`);

  const [invite] = await db
    .select()
    .from(orgInvites)
    .where(eq(orgInvites.token, normalizedToken))
    .limit(1);

  if (!invite || invite.status !== "pending") {
    return { error: "This invite link is invalid, expired, or has already been used." };
  }

  const [existing] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, invite.orgId), eq(orgMembers.userId, user.id)))
    .limit(1);

  const markInvitesAccepted = () =>
    db
      .update(orgInvites)
      .set({ status: "accepted" })
      .where(
        and(
          eq(orgInvites.orgId, invite.orgId),
          eq(orgInvites.email, invite.email),
          eq(orgInvites.status, "pending"),
        ),
      );

  if (existing) {
    await markInvitesAccepted();
    revalidatePath("/team");
    return { success: true };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(orgMembers).values({
        orgId: invite.orgId,
        userId: user.id,
        role: "member",
      });
      await tx
        .update(orgInvites)
        .set({ status: "accepted" })
        .where(
          and(
            eq(orgInvites.orgId, invite.orgId),
            eq(orgInvites.email, invite.email),
            eq(orgInvites.status, "pending"),
          ),
        );
    });
  } catch {
    return { error: "Could not join the organization. Please try again." };
  }

  revalidatePath("/team");
  return { success: true };
}
