#!/usr/bin/env node
/**
 * Derives Supabase auth URLs from NEXT_PUBLIC_APP_URL in .env.local.
 * Writes SUPABASE_* vars to .env.local and a root .env for the Supabase CLI.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const envLocalPath = join(root, ".env.local");
const envPath = join(root, ".env");
const examplePath = join(root, ".env.example");

if (!existsSync(envLocalPath)) {
  if (existsSync(examplePath)) {
    writeFileSync(envLocalPath, readFileSync(examplePath, "utf8"));
  } else {
    console.error("Missing .env.local — copy .env.example first.");
    process.exit(1);
  }
}

/** @param {string} raw */
function parseEnv(raw) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    out[trimmed.slice(0, i)] = trimmed.slice(i + 1);
  }
  return out;
}

/** @param {Record<string, string>} env */
function serializeEnv(env) {
  return `${Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")}\n`;
}

/** @param {string} content @param {string} key @param {string} value */
function upsertLine(content, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  return pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
}

const appUrl = parseEnv(readFileSync(envLocalPath, "utf8")).NEXT_PUBLIC_APP_URL?.trim();
if (!appUrl) {
  console.error("NEXT_PUBLIC_APP_URL is required in .env.local");
  process.exit(1);
}

let base;
try {
  base = new URL(appUrl);
} catch {
  console.error(`Invalid NEXT_PUBLIC_APP_URL: ${appUrl}`);
  process.exit(1);
}

/** Docker Supabase reaches the host app via host.docker.internal */
function hookUri(url) {
  const u = new URL(url.href);
  u.hostname = "host.docker.internal";
  u.pathname = "/api/auth/send-email";
  u.search = "";
  u.hash = "";
  return u.toString();
}

/** Allow same port on localhost / 127.0.0.1 and the configured host */
function redirectUrls(url) {
  const hosts = new Set([url.hostname, "127.0.0.1", "localhost"]);
  return [...hosts]
    .map((host) => {
      const u = new URL(url.href);
      u.hostname = host;
      return `${u.origin}/**`;
    })
    .join(",");
}

const hook = hookUri(base);
const redirects = redirectUrls(base);

let envLocal = readFileSync(envLocalPath, "utf8");
envLocal = upsertLine(envLocal, "SUPABASE_SEND_EMAIL_HOOK_URI", hook);
envLocal = upsertLine(envLocal, "SUPABASE_AUTH_REDIRECT_URLS", redirects);
writeFileSync(envLocalPath, envLocal);

const supabaseEnv = {
  NEXT_PUBLIC_APP_URL: base.origin,
  SUPABASE_SEND_EMAIL_HOOK_URI: hook,
  SUPABASE_AUTH_REDIRECT_URLS: redirects,
};
writeFileSync(envPath, serializeEnv(supabaseEnv));

console.log(`App URL: ${base.origin}`);
console.log(`Send email hook: ${hook}`);
