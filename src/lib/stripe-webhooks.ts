import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { PLANS, type PlanKey } from "@/config/plans";
import { db } from "@/db";
import { profiles, subscriptions } from "@/db/schema";
import { sendEmail } from "@/lib/mailtrap";
import { getStripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/utils";

/** Resolves a plan key to its display name. */
function planName(key: string): string {
  if (key in PLANS) return PLANS[key as keyof typeof PLANS].name;
  return key;
}

/** Maps a Stripe price to a local plan key (env IDs + price metadata fallback). */
function planKeyFromStripePrice(price: Stripe.Price | undefined): PlanKey {
  const id = price?.id;
  if (id === process.env.STRIPE_PRICE_TEAM) return "team";
  if (id === process.env.STRIPE_PRICE_PRO) return "pro";
  if (id === process.env.STRIPE_PRICE_FREE) return "free";
  const meta = price?.metadata?.plan_key;
  if (meta === "team" || meta === "pro" || meta === "free") return meta;
  return "pro";
}

async function resolveUserIdForCustomer(customerId: string): Promise<string | null> {
  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.stripeCustomerId, customerId))
    .limit(1);
  return profile?.id ?? null;
}

async function resolveUserIdFromSubscription(sub: Stripe.Subscription): Promise<string | null> {
  if (sub.metadata?.user_id) return sub.metadata.user_id;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;
  return resolveUserIdForCustomer(customerId);
}

async function upsertSubscriptionRow(
  userId: string,
  sub: Stripe.Subscription,
  planKey?: PlanKey,
) {
  const price = sub.items.data[0]?.price;
  const resolvedPlan = planKey ?? planKeyFromStripePrice(price);

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeSubscriptionId: sub.id,
      planKey: resolvedPlan,
      status: sub.status,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeSubscriptionId: sub.id,
        planKey: resolvedPlan,
        status: sub.status,
        updatedAt: new Date(),
      },
    });
}

/** Pulls the active Stripe subscription into the local DB (fallback when webhooks are missed). */
export async function syncSubscriptionFromStripe(userId: string): Promise<void> {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (!profile?.stripeCustomerId) return;

  const stripe = getStripe();
  const { data } = await stripe.subscriptions.list({
    customer: profile.stripeCustomerId,
    status: "all",
    limit: 10,
  });

  const active = data.find((s) => s.status === "active" || s.status === "trialing");

  if (!active) {
    await db
      .update(subscriptions)
      .set({ planKey: "free", status: "canceled", updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId));
    return;
  }

  await upsertSubscriptionRow(userId, active);
}

/** Syncs subscription after checkout and sends a payment receipt email. */
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  let userId = session.metadata?.user_id;
  if (!userId) {
    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (customerId) userId = (await resolveUserIdForCustomer(customerId)) ?? undefined;
  }
  const planKey = (session.metadata?.plan_key ?? "pro") as PlanKey;
  if (!userId) return;

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeSubscriptionId:
        typeof session.subscription === "string" ? session.subscription : null,
      planKey,
      status: "active",
      paymentFailedCount: 0,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeSubscriptionId:
          typeof session.subscription === "string" ? session.subscription : null,
        planKey,
        status: "active",
        paymentFailedCount: 0,
        updatedAt: new Date(),
      },
    });

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (profile?.email) {
    await sendEmail({
      templateKey: "payment_receipt",
      to: profile.email,
      variables: { plan_name: planName(planKey), amount: "See invoice" },
      idempotencyKey: `receipt:checkout:${session.id}`,
      userId,
    }).catch(() => undefined);
  }
}

/** Updates subscription state and sends a plan-change email when the price changes. */
export async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const userId = await resolveUserIdFromSubscription(sub);
  if (!userId) return;

  const priceId = sub.items.data[0]?.price.id;
  const planKey = planKeyFromStripePrice(sub.items.data[0]?.price);

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const oldPlan = existing?.planKey ?? "free";

  await upsertSubscriptionRow(userId, sub, planKey);

  if (oldPlan !== planKey) {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    if (profile?.email) {
      await sendEmail({
        templateKey: "plan_change",
        to: profile.email,
        variables: { old_plan: planName(oldPlan), new_plan: planName(planKey) },
        idempotencyKey: `plan:${sub.id}:${priceId}`,
        userId,
      }).catch(() => undefined);
    }
  }
}

/** Downgrades the user to free and sends a cancellation email. */
export async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const userId = await resolveUserIdFromSubscription(sub);
  if (!userId) return;

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  await db
    .update(subscriptions)
    .set({ planKey: "free", status: "canceled", updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId));

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (profile?.email) {
    await sendEmail({
      templateKey: "cancellation",
      to: profile.email,
      variables: { plan_name: planName(existing?.planKey ?? "paid") },
      idempotencyKey: `cancel:${sub.id}`,
      userId,
    }).catch(() => undefined);
  }
}

/** Increments failure count and sends up to two dunning emails. */
export async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.stripeCustomerId, customerId))
    .limit(1);

  if (!profile) return;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, profile.id))
    .limit(1);

  const count = (sub?.paymentFailedCount ?? 0) + 1;

  await db
    .update(subscriptions)
    .set({
      paymentFailedCount: count,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, profile.id));

  if (count <= 2) {
    await sendEmail({
      templateKey: "dunning",
      to: profile.email,
      variables: { billing_portal_url: `${getAppUrl()}/dashboard` },
      idempotencyKey: `dunning:${invoice.id}:${count}`,
      userId: profile.id,
    }).catch(() => undefined);
  }
}

/** Returns whether a webhook event has already been processed. */
export async function isWebhookProcessed(source: string, id: string): Promise<boolean> {
  const { processedWebhookEvents } = await import("@/db/schema");
  const rows = await db
    .select()
    .from(processedWebhookEvents)
    .where(
      sql`${processedWebhookEvents.source} = ${source} AND ${processedWebhookEvents.externalId} = ${id}`,
    )
    .limit(1);
  return rows.length > 0;
}

/** Records a webhook event as processed for idempotency. */
export async function markWebhookProcessed(source: string, id: string) {
  const { processedWebhookEvents } = await import("@/db/schema");
  await db
    .insert(processedWebhookEvents)
    .values({ source, externalId: id })
    .onConflictDoNothing();
}
