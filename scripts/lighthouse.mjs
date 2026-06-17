#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { readAppUrl } from "./lib/app-url.mjs";

const root = join(import.meta.dirname, "..");
const url = `${readAppUrl(root).replace(/\/$/, "")}/`;

const result = spawnSync(
  "pnpm",
  ["exec", "lhci", "autorun", `--collect.url=${url}`],
  { cwd: root, stdio: "inherit", env: process.env },
);

process.exit(result.status ?? 1);
