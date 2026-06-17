import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT = "http://127.0.0.1:3000";

/** @param {string} [root] */
export function readAppUrl(root = join(import.meta.dirname, "../..")) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv;

  const envLocal = join(root, ".env.local");
  if (existsSync(envLocal)) {
    const match = readFileSync(envLocal, "utf8").match(/^NEXT_PUBLIC_APP_URL=(.+)$/m);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  return DEFAULT;
}

/** @param {string} [appUrl] */
export function readAppPort(appUrl = readAppUrl()) {
  try {
    const u = new URL(appUrl);
    return u.port || (u.protocol === "https:" ? "443" : "80");
  } catch {
    return "3000";
  }
}
