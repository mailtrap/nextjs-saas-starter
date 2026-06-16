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

echo "Starting Supabase (Auth + Postgres)..."
npx supabase@latest stop 2>/dev/null || true
npx supabase@latest start

echo "Applying database schema..."
npx supabase@latest db reset --local

node scripts/merge-supabase-env.mjs

cat <<'EOF'

Done. Local Supabase is running.

Next steps:
  1. Add Stripe + Mailtrap keys to .env.local
  2. pnpm dev
  3. Open http://127.0.0.1:3000

Stop Supabase: pnpm db:stop
EOF
