# AGENTS.md — nextjs-saas-starter

## Purpose

Open-source Next.js SaaS **scaffold** (not a product). Mailtrap is the email layer. Audience: learners and indie hackers.

## Stack

Next.js 15 App Router · Server Actions · TypeScript strict · Supabase · Drizzle · Stripe · Mailtrap · Tailwind · shadcn/ui

## Conventions

- **Mutations** → `src/actions/` (Server Actions)
- **Reads in RSC** → query Drizzle in page components
- **Webhooks** → `src/app/api/webhooks/`
- **New product code** → `src/features/<name>/`

## Adding a transactional email

1. Create hosted Handlebars template in [Mailtrap](https://mailtrap.io/email-templates)
2. Add UUID to `.env` and `EmailTemplateKey` in `src/config/emails.ts`
3. Call `sendEmail({ templateKey, to, variables, idempotencyKey, userId })` from the triggering action or webhook handler

## Mailtrap

- Local dev: `MAILTRAP_SANDBOX=true` + `MAILTRAP_TEST_INBOX_ID` → `sendEmail()` uses Email Testing API
- Production: unset sandbox flag → real Sending API delivery

## Mailtrap MCP

Configured in `.mcp.json`. Tools: send email, list/create templates, sandbox messages.

## Local dev

- `pnpm db:setup` — Docker Supabase (Auth + Postgres only), migrations, `.env.local` Supabase vars
- `NEXT_PUBLIC_APP_URL` in `.env.local` drives dev port (`pnpm dev`), Supabase auth redirects, and the Send Email Hook URI (`pnpm sync:env`)
- Migrations: `supabase/migrations/` only; `pnpm db:reset` to re-apply
- Stripe/Mailtrap webhooks need ngrok in local dev

## Do not

- Add job queues unless the brief changes
- Replace hosted templates with React Email
- Build production-grade RBAC — use `ADMIN_EMAILS` for admin routes
