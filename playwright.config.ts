import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

function readAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim();
  }
  if (process.env.PLAYWRIGHT_BASE_URL?.trim()) {
    return process.env.PLAYWRIGHT_BASE_URL.trim();
  }
  const envLocal = join(process.cwd(), ".env.local");
  if (existsSync(envLocal)) {
    const match = readFileSync(envLocal, "utf8").match(/^NEXT_PUBLIC_APP_URL=(.+)$/m);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return "http://127.0.0.1:3000";
}

const baseURL = readAppUrl();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
