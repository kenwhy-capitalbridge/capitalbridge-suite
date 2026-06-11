#!/usr/bin/env node
/**
 * Opens a real browser on the login app so you can sign in manually; then writes
 * Playwright storage state (cookies + localStorage) to e2e/.auth/storage.json.
 *
 * Usage:
 *   CB_E2E_LOGIN_ORIGIN=https://login.thecapitalbridge.com npm run e2e:storage
 *
 * Optional:
 *   CB_E2E_STORAGE_WAIT_MS=180000   (default 120000)
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const outFile = path.join(__dirname, "..", ".auth", "storage.json");
const loginOrigin = (process.env.CB_E2E_LOGIN_ORIGIN || "https://login.thecapitalbridge.com").replace(
  /\/+$/,
  ""
);
const waitMs = Number(process.env.CB_E2E_STORAGE_WAIT_MS || "120000");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hasSuiteAuthCookie(cookies) {
  return cookies.some(
    (c) =>
      c.domain === ".thecapitalbridge.com" &&
      /^sb-.+-auth-token$/.test(c.name) &&
      c.value &&
      c.value.length > 0,
  );
}

async function waitForSuiteAuthCookie(context, deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    if (hasSuiteAuthCookie(await context.cookies())) {
      await sleep(1500);
      return;
    }
    await sleep(500);
  }
  throw new Error(
    `[e2e] Timed out after ${deadlineMs / 1000}s waiting for suite auth cookie on .thecapitalbridge.com`,
  );
}

async function main() {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${loginOrigin}/access`, { waitUntil: "domcontentloaded" });
  console.error(
    `[e2e] Sign in in the browser window. Saving to ${outFile} once auth cookies appear (max ${waitMs / 1000}s).`,
  );
  await waitForSuiteAuthCookie(context, waitMs);
  await context.storageState({ path: outFile });
  await browser.close();
  console.error("[e2e] Storage state saved.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
