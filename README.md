# nextjs-saas-starter

Blank-slate Next.js SaaS scaffolding with **Mailtrap** as the email layer, **Supabase** auth, and **Stripe** billing.

For learners, indie hackers, and juniors — not production-grade multi-tenant SaaS.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmailtrap%2Fnextjs-saas-starter&env=NEXT_PUBLIC_APP_URL,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,DATABASE_URL,SEND_EMAIL_HOOK_SECRET,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,STRIPE_PRICE_FREE,STRIPE_PRICE_PRO,STRIPE_PRICE_TEAM,MAILTRAP_API_TOKEN,MAILTRAP_WEBHOOK_SECRET,MAILTRAP_FROM_EMAIL,MAILTRAP_FROM_NAME,MAILTRAP_TPL_WELCOME,MAILTRAP_TPL_MAGIC_LINK,MAILTRAP_TPL_RESET_PASSWORD,MAILTRAP_TPL_TEAM_INVITE,MAILTRAP_TPL_PAYMENT_RECEIPT,MAILTRAP_TPL_DUNNING,MAILTRAP_TPL_CANCELLATION,MAILTRAP_TPL_PLAN_CHANGE,ADMIN_EMAILS&project-name=nextjs-saas-starter)

## Quick start (local)

**Prerequisites:** [Node.js](https://nodejs.org) 20+, [pnpm](https://pnpm.io), [Docker Desktop](https://docs.docker.com/get-docker/)

```bash
git clone https://github.com/mailtrap/nextjs-saas-starter.git
cd nextjs-saas-starter
pnpm install
pnpm db:setup          # Docker: Supabase Auth + Postgres + schema → writes .env.local
```

Add your **Stripe** and **Mailtrap** keys to `.env.local` (see [`.env.example`](.env.example)), then:

```bash
stripe fixtures stripe-fixtures.json --api-key $STRIPE_SECRET_KEY   # optional: test prices
pnpm dev
```

Open http://127.0.0.1:3000

### What `pnpm db:setup` does

1. Starts **only** what this app needs: Supabase Auth + Postgres (not Storage, GraphQL, Mailpit, etc.)
2. Applies [`supabase/migrations/`](supabase/migrations/)
3. Writes four Supabase values into `.env.local` (URL, anon key, service role, `DATABASE_URL`)
4. Configures the Send Email Hook so auth emails go through Mailtrap (requires `pnpm dev` on port 3000)

**Stop Docker:** `pnpm db:stop` · **Reset database:** `pnpm db:reset`

### Cloud Supabase instead of Docker

Create a project at [supabase.com](https://supabase.com), run the SQL in `supabase/migrations/`, copy API keys into `.env.local`, and set Auth → Hooks → Send Email → `https://YOUR_APP/api/auth/send-email`.

## Env vars

| Group | What you need |
|-------|----------------|
| **Supabase** | 4 vars — auto-filled locally; from dashboard when hosted |
| **Stripe** | Test keys + 3 price IDs |
| **Mailtrap** | API token, sandbox flag + inbox ID (local), from address, 8 template UUIDs |
| **Auth hook** | `SEND_EMAIL_HOOK_SECRET` — auto-filled locally |

Full list: [`.env.example`](.env.example)

### Mailtrap sandbox (recommended for local dev)

```bash
MAILTRAP_SANDBOX=true
MAILTRAP_TEST_INBOX_ID=123456   # Email Testing → inbox → ID in settings
```

Emails appear in your **Mailtrap Email Testing inbox** (same inbox as `MAILTRAP_TEST_INBOX_ID`), not the recipient’s real mailbox. Set `MAILTRAP_SANDBOX=false` (or remove it) before production deploy.

If signup “works” but no email appears, check the terminal running `pnpm dev` for `[signup] welcome email failed` — then verify token, inbox ID, and template UUIDs.

## Architecture

```
src/app/          → routes (marketing, auth, dashboard, API webhooks)
src/actions/      → Server Actions (auth, billing, org, settings)
src/lib/mailtrap  → sendEmail(), webhook signature verify
src/config/emails → typed template UUID map
src/db/           → Drizzle schema (profiles, orgs, subscriptions, email events)
```

**Email flows:** Supabase Send Email Hook → Mailtrap (magic link, reset). App events → `sendEmail()` (welcome, invites, billing).

**Webhooks:** Stripe syncs subscriptions; Mailtrap logs delivery events and suppressions. Use [ngrok](https://ngrok.com) to test webhooks locally.

## Where to add your product logic

1. Create `src/features/your-feature/` — see [`src/features/README.md`](src/features/README.md)
2. Add a dashboard route under `src/app/(dashboard)/`
3. Call `sendEmail()` from `@/lib/mailtrap` for new transactional emails

## Post-deploy checklist

1. Run `supabase/migrations/` SQL on production Postgres (or link hosted Supabase)
2. Stripe → Webhooks → `https://YOUR_APP/api/webhooks/stripe`
3. Mailtrap → Webhooks → `https://YOUR_APP/api/webhooks/mailtrap`
4. Supabase → Auth → Hooks → Send Email → `https://YOUR_APP/api/auth/send-email`
5. Paste template UUIDs and verify sending domain in Mailtrap

## Scripts

```bash
pnpm db:setup      # first-time local setup (Docker)
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

## License

MIT
