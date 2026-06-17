"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orgMembers, organizations, profiles, subscriptions } from "@/db/schema";
import { sendEmail } from "@/lib/mailtrap";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/utils";

/** Registers a new user, creates profile, org, free subscription, and sends a welcome email. */
export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Sign up failed" };

  await db.insert(profiles).values({
    id: data.user.id,
    email,
    fullName: fullName || null,
  });

  await db.insert(subscriptions).values({
    userId: data.user.id,
    planKey: "free",
    status: "active",
  });

  const [org] = await db
    .insert(organizations)
    .values({
      name: `${fullName || email.split("@")[0]}'s Team`,
      ownerId: data.user.id,
    })
    .returning();

  await db.insert(orgMembers).values({
    orgId: org.id,
    userId: data.user.id,
    role: "owner",
  });

  try {
    await sendEmail({
      templateKey: "welcome",
      to: email,
      variables: { user_name: fullName || email, app_url: getAppUrl() },
      idempotencyKey: `welcome:${data.user.id}`,
      userId: data.user.id,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[signup] welcome email failed:", err);
    }
  }

  return { success: true };
}

/** Signs in a user with email and password. */
export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };
  return { success: true };
}

/** Sends a magic-link OTP email via Supabase (delivered through the Send Email Hook). */
export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${getAppUrl()}/dashboard` },
  });

  if (error) return { error: error.message };
  return { success: "Check your email for a magic link." };
}

/** Requests a password reset email via Supabase (delivered through the Send Email Hook). */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: "If an account exists, a reset link was sent." };
}

/** Updates the authenticated user's password. */
export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { success: true };
}

/** Signs out the current user and redirects to the landing page. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Creates profile, free subscription, and default org if missing (e.g. magic-link sign-in). */
export async function ensureProfile(userId: string, email: string) {
  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (!existing) {
    await db.insert(profiles).values({ id: userId, email });
    await db.insert(subscriptions).values({ userId, planKey: "free", status: "active" });
  }

  const [member] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1);

  if (!member) {
    const [org] = await db
      .insert(organizations)
      .values({
        name: `${email.split("@")[0] || "My"}'s Team`,
        ownerId: userId,
      })
      .returning();

    await db.insert(orgMembers).values({
      orgId: org.id,
      userId,
      role: "owner",
    });
  }
}
