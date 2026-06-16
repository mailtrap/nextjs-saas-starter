"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PLANS, type PlanKey } from "@/config/plans";
import { db } from "@/db";
import { profiles, subscriptions } from "@/db/schema";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/utils";

/** Assigns the free plan to the current user without Stripe Checkout. */
export async function selectFreePlan() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await db
    .insert(subscriptions)
    .values({ userId: user.id, planKey: "free", status: "active" })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: { planKey: "free", status: "active", updatedAt: new Date() },
    });

  redirect("/dashboard");
}

/** Starts a Stripe Checkout session for a paid plan or delegates to selectFreePlan for free. */
export async function createCheckout(planKey: PlanKey) {
  if (planKey === "free") {
    return selectFreePlan();
  }

  const plan = PLANS[planKey];
  if (!plan.priceId) throw new Error("Stripe price not configured");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const stripe = getStripe();
  let customerId = profile?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await db
      .update(profiles)
      .set({ stripeCustomerId: customerId })
      .where(eq(profiles.id, user.id));
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${getAppUrl()}/dashboard?checkout=success`,
    cancel_url: `${getAppUrl()}/#pricing`,
    metadata: { user_id: user.id, plan_key: planKey },
    subscription_data: {
      metadata: { user_id: user.id, plan_key: planKey },
    },
  });

  if (!session.url) throw new Error("Could not create checkout session");
  redirect(session.url);
}

/** Opens the Stripe Customer Portal for the current user's billing account. */
export async function openBillingPortal(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile?.stripeCustomerId) {
    throw new Error("No billing account yet. Subscribe to a paid plan first.");
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: `${getAppUrl()}/dashboard`,
  });

  redirect(session.url);
}
