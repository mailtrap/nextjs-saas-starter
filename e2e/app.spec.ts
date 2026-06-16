import { expect, test } from "@playwright/test";

test("landing page has hero and pricing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /ship your saas/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /simple pricing/i })).toBeVisible();
  await expect(page.locator("#pricing")).toBeVisible();
});

test("auth pages load", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
});

test("pricing links to signup flow", async ({ page }) => {
  await page.goto("/#pricing");
  await expect(page.getByRole("button", { name: /get started free/i })).toBeVisible();
});
