#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker is required. Run: pnpm db:setup"
  exit 1
fi

mkdir -p "${HOME}/.supabase"

node scripts/sync-app-env.mjs

echo "Starting Supabase..."
npx supabase@latest start

echo "Applying migrations..."
npx supabase@latest db reset --local

node scripts/merge-supabase-env.mjs

echo "Supabase ready. Run: pnpm dev"
