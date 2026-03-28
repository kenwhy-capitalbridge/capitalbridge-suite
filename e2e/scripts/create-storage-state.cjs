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

async function main() {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${loginOrigin}/access`, { waitUntil: "domcontentloaded" });
  console.error(
    `[e2e] Sign in in the browser window. Waiting ${waitMs / 1000}s, then saving to ${outFile}`
  );
  await sleep(waitMs);
  await context.storageState({ path: outFile });
  await browser.close();
  console.error("[e2e] Storage state saved.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
