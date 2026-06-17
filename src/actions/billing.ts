"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isPlanDowngrade, PLANS, type PlanKey } from "@/config/plans";
import { db } from "@/db";
import { profiles, subscriptions } from "@/db/schema";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/utils";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

async function getCurrentPlan(userId: string): Promise<PlanKey> {
  const [sub] = await db
    .select({ planKey: subscriptions.planKey })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return (sub?.planKey ?? "free") as PlanKey;
}

async function getProfile(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return profile ?? null;
}

async function findActiveStripeSubscription(customerId: string) {
  const stripe = getStripe();
  const { data } = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });
  return data[0] ?? null;
}

async function cancelActiveStripeSubscription(userId: string) {
  const profile = await getProfile(userId);
  if (!profile?.stripeCustomerId) return;

  const stripe = getStripe();
  const [sub] = await db
    .select({ stripeSubscriptionId: subscriptions.stripeSubscriptionId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const subscriptionId =
    sub?.stripeSubscriptionId ??
    (await findActiveStripeSubscription(profile.stripeCustomerId))?.id;

  if (subscriptionId) {
    await stripe.subscriptions.cancel(subscriptionId);
  }
}

async function setFreePlan(userId: string) {
  await db
    .insert(subscriptions)
    .values({ userId, planKey: "free", status: "active", stripeSubscriptionId: null })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        planKey: "free",
        status: "active",
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      },
    });
}

/** Assigns the free plan and cancels any active Stripe subscription. */
export async function selectFreePlan() {
  const user = await requireUser();
  await cancelActiveStripeSubscription(user.id);
  await setFreePlan(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect("/dashboard?billing=updated");
}

async function downgradePaidPlan(userId: string, planKey: PlanKey) {
  const plan = PLANS[planKey];
  if (!plan.priceId) throw new Error("Stripe price not configured");

  const profile = await getProfile(userId);
  if (!profile?.stripeCustomerId) {
    throw new Error("No billing account yet. Subscribe to a paid plan first.");
  }

  const stripe = getStripe();
  const active =
    (profile.stripeCustomerId
      ? await findActiveStripeSubscription(profile.stripeCustomerId)
      : null) ?? null;

  if (!active) {
    throw new Error("No active subscription to change.");
  }

  const itemId = active.items.data[0]?.id;
  if (!itemId) throw new Error("Subscription has no items.");

  const updated = await stripe.subscriptions.update(active.id, {
    items: [{ id: itemId, price: plan.priceId }],
    metadata: { user_id: userId, plan_key: planKey },
  });

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeSubscriptionId: updated.id,
      planKey,
      status: updated.status,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeSubscriptionId: updated.id,
        planKey,
        status: updated.status,
        updatedAt: new Date(),
      },
    });
}

/** Changes plan: cancels or updates Stripe subscription on downgrade, checkout on upgrade. */
export async function changePlan(planKey: PlanKey) {
  const user = await requireUser();
  const currentPlan = await getCurrentPlan(user.id);

  if (planKey === "free") {
    return selectFreePlan();
  }

  if (isPlanDowngrade(currentPlan, planKey)) {
    await downgradePaidPlan(user.id, planKey);
    revalidatePath("/dashboard");
    revalidatePath("/");
    redirect("/dashboard?billing=updated");
  }

  return createCheckout(planKey);
}

/** Starts a Stripe Checkout session for a paid plan upgrade or new subscription. */
export async function createCheckout(planKey: PlanKey) {
  if (planKey === "free") {
    return selectFreePlan();
  }

  const plan = PLANS[planKey];
  if (!plan.priceId) throw new Error("Stripe price not configured");

  const user = await requireUser();
  if (!user.email) redirect("/login");

  const profile = await getProfile(user.id);

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
    return_url: `${getAppUrl()}/dashboard?billing=updated`,
  });

  redirect(session.url);
}
