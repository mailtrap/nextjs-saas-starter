-- App tables (Drizzle schema). profiles.id matches auth.users from Supabase Auth.

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "email" text NOT NULL,
  "full_name" text,
  "stripe_customer_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "owner_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "org_members" (
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "role" text DEFAULT 'member' NOT NULL,
  PRIMARY KEY ("org_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "org_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "stripe_subscription_id" text,
  "plan_key" text DEFAULT 'free' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "payment_failed_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sent_emails" (
  "idempotency_key" text PRIMARY KEY NOT NULL,
  "template_key" text NOT NULL,
  "recipient" text NOT NULL,
  "mailtrap_message_id" text,
  "user_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "mailtrap_event_id" text NOT NULL UNIQUE,
  "event_type" text NOT NULL,
  "email" text NOT NULL,
  "message_id" text,
  "user_id" uuid,
  "payload" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "suppressions" (
  "email" text PRIMARY KEY NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "processed_webhook_events" (
  "source" text NOT NULL,
  "external_id" text NOT NULL,
  "processed_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("source", "external_id")
);
