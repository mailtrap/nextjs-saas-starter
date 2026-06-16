import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { emailEvents, sentEmails, suppressions } from "@/db/schema";
import { verifyMailtrapSignature } from "@/lib/mailtrap-verify";

export const runtime = "nodejs";

type MailtrapEvent = {
  event: string;
  event_id: string;
  email: string;
  message_id?: string;
  timestamp?: number;
  [key: string]: unknown;
};

/** Ingests Mailtrap email events, logs them, and syncs the suppression list. */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("mailtrap-signature");
  const secret = process.env.MAILTRAP_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  if (!verifyMailtrapSignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: { events?: MailtrapEvent[] };
  try {
    payload = JSON.parse(body) as { events?: MailtrapEvent[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = payload.events ?? [];

  for (const evt of events) {
    if (!evt.event_id) continue;

    let userId: string | null = null;
    if (evt.message_id) {
      const [sent] = await db
        .select()
        .from(sentEmails)
        .where(eq(sentEmails.mailtrapMessageId, evt.message_id))
        .limit(1);
      userId = sent?.userId ?? null;
    }

    try {
      await db.insert(emailEvents).values({
        mailtrapEventId: evt.event_id,
        eventType: evt.event,
        email: evt.email,
        messageId: evt.message_id ?? null,
        userId,
        payload: evt,
      });
    } catch {
      continue;
    }

    const normalized = evt.event.toLowerCase();
    if (normalized === "bounce" || normalized === "spam") {
      await db
        .insert(suppressions)
        .values({
          email: evt.email.toLowerCase(),
          reason: normalized === "spam" ? "complaint" : "bounce",
        })
        .onConflictDoUpdate({
          target: suppressions.email,
          set: { reason: normalized === "spam" ? "complaint" : "bounce" },
        });
    }
  }

  return NextResponse.json({ received: true });
}
