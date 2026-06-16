import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

/** User profile, email, password, and account deletion settings. */
export default async function SettingsPage() {
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
      <SettingsForm email={user.email ?? ""} fullName={profile?.fullName ?? ""} />
    </div>
  );
}
