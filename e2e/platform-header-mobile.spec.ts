import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

const STORAGE = path.join(process.cwd(), "e2e", ".auth", "storage.json");

function storageExists(): boolean {
  try {
    return fs.statSync(STORAGE).isFile();
  } catch {
    return false;
  }
}

function envOrigin(name: string, fallback: string): string {
  const v = process.env[name]?.trim();
  return (v && v.length > 0 ? v : fallback).replace(/\/+$/, "");
}

function platformOrigin(): string {
  return envOrigin("CB_E2E_PLATFORM_ORIGIN", "https://platform.thecapitalbridge.com");
}

/**
 * Sticky platform chrome at iPhone-class width (375 CSS px).
 * Catches layout regressions for BACK + TRIAL pill + avatar + LOGOUT.
 * Trial badge appears only when the signed-in account has `plans.slug === 'trial'`.
 */
test.describe("Platform header @375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(() => {
    test.skip(
      !storageExists(),
      `Missing ${STORAGE}. Run: npm run e2e:storage (see e2e/README.md).`,
    );
  });

  test("sticky header matches snapshot", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE });
    const page = await context.newPage();
    const base = platformOrigin();

    await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    const header = page.locator("header").first();
    await header.waitFor({ state: "visible", timeout: 30_000 });

    await expect(header).toHaveScreenshot("platform-header-375.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.04,
    });

    await context.close();
  });
});
