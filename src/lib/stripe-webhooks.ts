import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { PLANS } from "@/config/plans";
import { db } from "@/db";
import { profiles, subscriptions } from "@/db/schema";
import { sendEmail } from "@/lib/mailtrap";
import { getAppUrl } from "@/lib/utils";

/** Resolves a plan key to its display name. */
function planName(key: string): string {
  if (key in PLANS) return PLANS[key as keyof typeof PLANS].name;
  return key;
}

/** Syncs subscription after checkout and sends a payment receipt email. */
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const planKey = session.metadata?.plan_key ?? "pro";
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
  const userId = sub.metadata?.user_id;
  if (!userId) return;

  const priceId = sub.items.data[0]?.price.id;
  let planKey = "pro";
  if (priceId === process.env.STRIPE_PRICE_TEAM) planKey = "team";
  if (priceId === process.env.STRIPE_PRICE_PRO) planKey = "pro";

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const oldPlan = existing?.planKey ?? "free";

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeSubscriptionId: sub.id,
      planKey,
      status: sub.status,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeSubscriptionId: sub.id,
        planKey,
        status: sub.status,
        updatedAt: new Date(),
      },
    });

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
  const userId = sub.metadata?.user_id;
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
