"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/** Updates the current user's display name in the profile table. */
export async function updateProfile(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  await db.update(profiles).set({ fullName }).where(eq(profiles.id, user.id));
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/team");
  return { success: true };
}

/** Requests an email address change through Supabase auth. */
export async function updateEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { error: error.message };
  return { success: "Check your email to confirm the new address." };
}

/** Changes the authenticated user's password. */
export async function changePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { success: true };
}

/** Deletes the user's profile data, signs out, and redirects to the landing page. */
export async function deleteAccount(): Promise<void> {
  const supabase = await createClient();
  const serviceSupabase = await createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  await db.delete(profiles).where(eq(profiles.id, user.id));
  const { error } = await serviceSupabase.auth.admin.deleteUser(user.id);
  if (error) throw new Error(error.message);
  await supabase.auth.signOut();
  redirect("/");
}
