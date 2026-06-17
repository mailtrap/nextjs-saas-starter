#!/usr/bin/env node
import { spawn } from "node:child_process";
import { join } from "node:path";
import { readAppPort } from "./lib/app-url.mjs";

const root = join(import.meta.dirname, "..");
const port = readAppPort();

const child = spawn("pnpm", ["exec", "next", "start", "-H", "0.0.0.0", "-p", port], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
