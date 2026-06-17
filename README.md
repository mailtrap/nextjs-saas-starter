# nextjs-saas-starter

Blank-slate Next.js SaaS scaffolding with **Mailtrap** as the email layer, **Supabase** auth, and **Stripe** billing.

For learners, indie hackers, and juniors — not production-grade multi-tenant SaaS.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmailtrap%2Fnextjs-saas-starter&env=NEXT_PUBLIC_APP_URL,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,DATABASE_URL,SEND_EMAIL_HOOK_SECRET,STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,STRIPE_PRICE_PRO,STRIPE_PRICE_TEAM,MAILTRAP_API_TOKEN,MAILTRAP_WEBHOOK_SECRET,MAILTRAP_FROM_EMAIL,MAILTRAP_FROM_NAME,MAILTRAP_TPL_WELCOME,MAILTRAP_TPL_MAGIC_LINK,MAILTRAP_TPL_RESET_PASSWORD,MAILTRAP_TPL_TEAM_INVITE,MAILTRAP_TPL_PAYMENT_RECEIPT,MAILTRAP_TPL_DUNNING,MAILTRAP_TPL_CANCELLATION,MAILTRAP_TPL_PLAN_CHANGE,ADMIN_EMAILS&project-name=nextjs-saas-starter)

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) 10+
- [Docker Desktop](https://docs.docker.com/get-docker/) (for local Supabase)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (for local billing webhooks)
- [Mailtrap](https://mailtrap.io) account (API token + Email Testing inbox + hosted templates)

## Quick start (local)

```bash
git clone https://github.com/mailtrap/nextjs-saas-starter.git
cd nextjs-saas-starter
pnpm install
pnpm db:setup          # Docker: Supabase Auth + Postgres + schema → writes .env.local
```

Copy remaining values from [`.env.example`](.env.example) into `.env.local`:

1. **Mailtrap** — API token, sandbox inbox ID, from address, 8 template UUIDs
2. **Stripe** — secret key, webhook secret (from Stripe CLI below), Pro + Team price IDs
3. **Admin** — your email in `ADMIN_EMAILS` (for `/admin/emails`)

Optional Stripe test products/prices:

```bash
stripe fixtures stripe-fixtures.json --api-key "$STRIPE_SECRET_KEY"
```

Start the app (port comes from `NEXT_PUBLIC_APP_URL`):

```bash
pnpm dev
```

Open the URL in `.env.local` (default `http://127.0.0.1:3000`).

### Port / URL configuration

`NEXT_PUBLIC_APP_URL` is the single source of truth for:

- Next.js dev port (`pnpm dev`)
- Supabase `site_url` and auth redirects
- Send Email Hook URI (Docker → host app)

If port 3000 is taken, set e.g. `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3001`, then:

```bash
pnpm sync:env
pnpm db:stop && pnpm db:start
pnpm dev
```

### What `pnpm db:setup` does

1. Starts **only** Supabase Auth + Postgres (not Storage, Studio, Realtime, etc.)
2. Applies [`supabase/migrations/`](supabase/migrations/) (source of truth for schema)
3. Writes Supabase credentials into `.env.local`
4. Syncs auth hook URL and redirect URLs from `NEXT_PUBLIC_APP_URL`

**Stop Docker:** `pnpm db:stop` · **Reset database:** `pnpm db:reset` · **Restart:** `pnpm db:start`

### Cloud Supabase instead of Docker

Create a project at [supabase.com](https://supabase.com), run SQL from `supabase/migrations/`, copy API keys into `.env.local`, and configure:

- Auth → URL → your `NEXT_PUBLIC_APP_URL`
- Auth → Hooks → Send Email → `https://YOUR_APP/api/auth/send-email`

## Local webhooks

### Stripe (required for billing sync)

In a second terminal (use the port from `NEXT_PUBLIC_APP_URL`):

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe --api-key "$STRIPE_SECRET_KEY"
```

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### Mailtrap (optional locally — no ngrok needed)

Set `MAILTRAP_WEBHOOK_SECRET` in `.env.local`, then simulate an event:

```bash
pnpm webhook:test:mailtrap
```

Refresh `/admin/emails` to see the test event. In production, point Mailtrap webhooks at `https://YOUR_APP/api/webhooks/mailtrap`.

## Env vars

| Group | What you need |
|-------|----------------|
| **App** | `NEXT_PUBLIC_APP_URL` — dev port, redirects, Supabase hook (`pnpm sync:env` after changes) |
| **Supabase** | 4 vars — auto-filled by `pnpm db:setup` locally |
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM` |
| **Mailtrap** | API token, sandbox flag + inbox ID, from address, 8 template UUIDs, webhook secret |
| **Auth hook** | `SEND_EMAIL_HOOK_SECRET` — auto-filled locally |
| **Admin** | `ADMIN_EMAILS` — comma-separated emails for `/admin/emails` |

Full list: [`.env.example`](.env.example)

### Mailtrap sandbox (recommended for local dev)

```bash
MAILTRAP_SANDBOX=true
MAILTRAP_ACCOUNT_ID=12345           # optional, silences SDK warning
MAILTRAP_TEST_INBOX_ID=123456       # Email Testing → inbox settings
MAILTRAP_WEBHOOK_SECRET=your-secret # local: any string; match in Mailtrap dashboard for prod
```

Emails appear in your **Mailtrap Email Testing inbox**, not the recipient's real mailbox. Set `MAILTRAP_SANDBOX=false` before production deploy.

## Architecture

```
src/app/          → routes (marketing, auth, dashboard, API webhooks)
src/actions/      → Server Actions (auth, billing, org, settings)
src/lib/mailtrap  → sendEmail(), webhook signature verify
src/config/emails → typed template UUID map
src/db/           → Drizzle schema (profiles, orgs, subscriptions, email events)
```

**Email flows:** Supabase Send Email Hook → Mailtrap (magic link, password reset, email change). App events → `sendEmail()` (welcome, invites, billing).

**Billing:** Stripe Checkout for upgrades; downgrades cancel or update the existing subscription via `changePlan()`.

## Where to add your product logic

1. Create `src/features/your-feature/` — see [`src/features/README.md`](src/features/README.md)
2. Add a route under `src/app/dashboard/your-feature/page.tsx` (or another app route)
3. Call `sendEmail()` from `@/lib/mailtrap` for new transactional emails

## Scripts

```bash
pnpm db:setup              # first-time local setup (Docker + migrations + .env.local)
pnpm db:start              # start Supabase + reset + sync env
pnpm db:stop               # stop Docker Supabase
pnpm db:reset              # re-apply supabase/migrations
pnpm sync:env              # sync Supabase auth URLs from NEXT_PUBLIC_APP_URL
pnpm dev                   # Next.js dev server (port from NEXT_PUBLIC_APP_URL)
pnpm build && pnpm start   # production build
pnpm lint
pnpm typecheck
pnpm test                  # unit tests (vitest)
pnpm test:e2e              # Playwright
pnpm webhook:test:mailtrap # local Mailtrap webhook test (no ngrok)
pnpm lighthouse            # Lighthouse CI
```

Schema changes: edit `supabase/migrations/`, then `pnpm db:reset`. The `drizzle/` folder mirrors schema for Drizzle ORM queries; `db:generate` / `db:push` are optional and not used by default setup.

## Post-deploy checklist

1. Run `supabase/migrations/` SQL on production Postgres (or link hosted Supabase)
2. Set all env vars from `.env.example`
3. Stripe → Webhooks → `https://YOUR_APP/api/webhooks/stripe`
4. Mailtrap → Webhooks → `https://YOUR_APP/api/webhooks/mailtrap`
5. Supabase → Auth → Hooks → Send Email → `https://YOUR_APP/api/auth/send-email`
6. Paste Mailtrap template UUIDs and verify sending domain
7. Set `ADMIN_EMAILS` for admin access

## License

MIT
