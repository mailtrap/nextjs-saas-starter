import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

/** User profile, email, password, and account deletion settings. */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ emailChanged?: string }>;
}) {
  const { emailChanged } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/settings");

  const [profile] = await db
    .select({ fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account preferences.</p>
      </div>
      {emailChanged === "1" ? (
        <p className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
          Email confirmed successfully.
        </p>
      ) : null}
      <SettingsForm email={user.email ?? ""} fullName={profile?.fullName ?? ""} />
    </div>
  );
}
