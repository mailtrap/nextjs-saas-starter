import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  handleCheckoutCompleted,
  handlePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
  isWebhookProcessed,
  markWebhookProcessed,
} from "@/lib/stripe-webhooks";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/** Handles verified Stripe webhook events with idempotent subscription side effects. */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (await isWebhookProcessed("stripe", event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      break;
  }

  await markWebhookProcessed("stripe", event.id);
  return NextResponse.json({ received: true });
}
