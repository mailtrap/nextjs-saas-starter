import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingPortalButton } from "@/components/billing-portal-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS } from "@/config/plans";
import { db } from "@/db";
import { profiles, subscriptions } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { syncSubscriptionFromStripe } from "@/lib/stripe-webhooks";

export const dynamic = "force-dynamic";

/** Shows account status, current plan, and link to Stripe billing portal. */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; billing?: string }>;
}) {
  const { checkout, billing } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/dashboard");

  if (checkout === "success" || billing === "updated") {
    await syncSubscriptionFromStripe(user.id);
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  const planKey = (sub?.planKey ?? "free") as keyof typeof PLANS;
  const plan = PLANS[planKey] ?? PLANS.free;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {checkout === "success" && (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          Payment received. Your plan has been synced from Stripe.
        </p>
      )}

      {billing === "updated" && (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          Billing updated. Your current plan is shown below.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span> {user.email}
          </p>
          <p>
            <span className="text-muted-foreground">Name:</span> {profile?.fullName ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Status:</span> {sub?.status ?? "active"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg font-medium">
            {plan.name} — ${plan.price}/mo
          </p>
          <p className="text-sm text-muted-foreground">
            Add your product features here. This is intentionally blank scaffolding.
          </p>
          {profile?.stripeCustomerId ? (
            <BillingPortalButton />
          ) : (
            <p className="text-sm text-muted-foreground">
              Subscribe to a paid plan from the{" "}
              <Link href="/#pricing" className="underline">
                pricing page
              </Link>{" "}
              to access the customer portal.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
