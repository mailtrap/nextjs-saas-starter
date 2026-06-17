#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readAppPort } from "./lib/app-url.mjs";
import { loadEnvLocal } from "./lib/load-env-local.mjs";

const root = join(import.meta.dirname, "..");
loadEnvLocal(root);

if (!existsSync(join(root, ".env.local"))) {
  console.error("Missing .env.local — run pnpm db:setup first.");
  process.exit(1);
}

const port = readAppPort();

const child = spawn(
  "pnpm",
  ["exec", "next", "dev", "--turbopack", "-H", "0.0.0.0", "-p", port],
  { cwd: root, stdio: "inherit", env: process.env },
);

child.on("exit", (code) => process.exit(code ?? 0));
