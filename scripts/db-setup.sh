#!/usr/bin/env bash
# One-command local setup for beginners.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Install Docker Desktop first: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Start Docker Desktop, then run: pnpm db:setup"
  exit 1
fi

mkdir -p "${HOME}/.supabase"

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  echo "Created .env.local from .env.example"
fi

node scripts/sync-app-env.mjs

echo "Starting Supabase (Auth + Postgres)..."
npx supabase@latest stop 2>/dev/null || true
npx supabase@latest start

echo "Applying database schema..."
npx supabase@latest db reset --local

node scripts/merge-supabase-env.mjs

cat <<'EOF'

Done. Local Supabase is running.

Next steps:
  1. Set NEXT_PUBLIC_APP_URL in .env.local if the default port is taken, then: pnpm sync:env && pnpm db:stop && pnpm db:start
  2. Add Stripe + Mailtrap keys to .env.local
  3. pnpm dev
  4. Open the URL shown by pnpm sync:env (NEXT_PUBLIC_APP_URL)

Stop Supabase: pnpm db:stop
EOF
