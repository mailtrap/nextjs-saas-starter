#!/usr/bin/env node
/**
 * Writes the four Supabase local vars into .env.local (creates from .env.example if missing).
 */
import { execSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const envPath = join(root, ".env.local");
const examplePath = join(root, ".env.example");

if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
}

let raw;
try {
  raw = execSync("npx supabase@latest status -o json", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch {
  console.error("Supabase is not running. Run: pnpm db:setup");
  process.exit(1);
}

const start = raw.indexOf("{");
if (start === -1) {
  console.error("Could not read Supabase status.");
  process.exit(1);
}

const { API_URL, ANON_KEY, SERVICE_ROLE_KEY, DB_URL } = JSON.parse(raw.slice(start));

const updates = {
  NEXT_PUBLIC_SUPABASE_URL: API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
  DATABASE_URL: DB_URL,
};

let env = readFileSync(envPath, "utf8");

for (const [key, value] of Object.entries(updates)) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  env = pattern.test(env) ? env.replace(pattern, line) : `${env.trimEnd()}\n${line}\n`;
}

const hookSecret = "v1,whsec_bG9jYWxkZXZob29rc2VjcmV0Zm9ybG9jYWxkZXZvbmx5";
const hookPattern = /^SEND_EMAIL_HOOK_SECRET=.*$/m;
const hookLine = `SEND_EMAIL_HOOK_SECRET=${hookSecret}`;
env = hookPattern.test(env)
  ? env.replace(hookPattern, hookLine)
  : `${env.trimEnd()}\n${hookLine}\n`;

writeFileSync(envPath, env);
console.log("Updated .env.local with local Supabase credentials.");

spawnSync("node", ["scripts/sync-app-env.mjs"], { cwd: root, stdio: "inherit" });
