#!/usr/bin/env node
/**
 * Posts a signed test event to /api/webhooks/mailtrap (no ngrok needed).
 */
import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readAppUrl } from "./lib/app-url.mjs";

const root = join(import.meta.dirname, "..");
const envLocal = join(root, ".env.local");

if (!existsSync(envLocal)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const raw = readFileSync(envLocal, "utf8");
const secret = raw.match(/^MAILTRAP_WEBHOOK_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) {
  console.error("Set MAILTRAP_WEBHOOK_SECRET in .env.local first.");
  process.exit(1);
}

const body = JSON.stringify({
  events: [
    {
      event: "delivered",
      event_id: `evt_local_${Date.now()}`,
      email: "test@example.com",
      message_id: `msg_local_${Date.now()}`,
      timestamp: Math.floor(Date.now() / 1000),
    },
  ],
});

const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
const url = `${readAppUrl(root).replace(/\/$/, "")}/api/webhooks/mailtrap`;

const res = await fetch(url, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "mailtrap-signature": signature,
  },
  body,
});

const text = await res.text();
console.log(`${res.status} ${text}`);

if (!res.ok) process.exit(1);
console.log("Open /admin/emails to see the test event.");
