#!/usr/bin/env node
/**
 * Headless login for CI — writes Playwright storage state to e2e/.auth/storage.json.
 *
 * Usage:
 *   CB_E2E_EMAIL=bot@example.com CB_E2E_PASSWORD=secret npm run e2e:storage:login
 */
const { chromium } = require("@playwright/test");
const {
  outFile,
  loginOrigin,
  ensureAuthDir,
  waitForSuiteAuthCookie,
} = require("./storage-state-utils.cjs");

const waitMs = Number(process.env.CB_E2E_STORAGE_WAIT_MS || "120000");

async function dismissSessionConflictIfPresent(page) {
  const replace = page.getByRole("button", { name: /log out other session and continue/i });
  if (await replace.isVisible().catch(() => false)) {
    await replace.click();
  }
}

async function main() {
  const email = process.env.CB_E2E_EMAIL?.trim();
  const password = process.env.CB_E2E_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error("Set CB_E2E_EMAIL and CB_E2E_PASSWORD for automated login");
  }

  ensureAuthDir();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const origin = loginOrigin();
  await page.goto(`${origin}/access`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("heading", { name: /welcome back/i }).waitFor({ timeout: 30_000 });

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: /^Login$/i }).click();

  await dismissSessionConflictIfPresent(page);
  await waitForSuiteAuthCookie(context, waitMs);

  await context.storageState({ path: outFile });
  await browser.close();
  console.error(`[e2e] Storage state saved via login to ${outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
