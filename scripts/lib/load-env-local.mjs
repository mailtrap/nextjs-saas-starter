import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Loads `.env.local` into `process.env` (for dev scripts that spawn Next). */
export function loadEnvLocal(root = join(import.meta.dirname, "../..")) {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    process.env[trimmed.slice(0, i)] = trimmed.slice(i + 1);
  }
}
