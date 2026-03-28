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

function foreverOrigin(): string {
  return envOrigin("CB_E2E_FOREVER_ORIGIN", "https://forever.thecapitalbridge.com");
}

function platformOrigin(): string {
  return envOrigin("CB_E2E_PLATFORM_ORIGIN", "https://platform.thecapitalbridge.com");
}

test.describe("Forever model (signed-in)", () => {
  test.beforeEach(() => {
    test.skip(
      !storageExists(),
      `Missing ${STORAGE}. Run: npm run e2e:storage (see e2e/README.md).`
    );
  });

  test("BACK link reaches platform hostname", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE });
    const page = await context.newPage();
    const forever = foreverOrigin();
    const wantHost = new URL(platformOrigin()).hostname;

    await page.goto(`${forever}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    const back = page.getByRole("link", { name: /back to capital bridge platform/i });
    await back.waitFor({ state: "visible", timeout: 30_000 });
    await back.click();

    await expect
      .poll(() => new URL(page.url()).hostname, { timeout: 45_000 })
      .toBe(wantHost);

    await context.close();
  });

  test("Save posts advisory snapshot (paid + USE_V2)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE });
    const page = await context.newPage();
    const forever = foreverOrigin();

    await page.goto(`${forever}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    const saveOff = page.getByText("Save off", { exact: true });
    if (await saveOff.isVisible().catch(() => false)) {
      await context.close();
      test.skip(true, "Deployment has NEXT_PUBLIC_USE_V2 off — Save UI not available.");
    }

    const saveBtn = page.getByRole("button", { name: /^Save$/ });
    await saveBtn.waitFor({ state: "visible", timeout: 60_000 });

    if (await saveBtn.isDisabled()) {
      await context.close();
      test.skip(true, "Save is disabled (e.g. trial) — use a paid test account in storage state.");
    }

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/advisory-report") && res.request().method() === "POST",
      { timeout: 60_000 }
    );

    await saveBtn.click();
    const response = await responsePromise;
    expect(response.status(), await response.text()).toBe(200);

    await context.close();
  });
});
