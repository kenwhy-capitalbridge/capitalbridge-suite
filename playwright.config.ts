import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright is the standard for both e2e and PDF capture: one Chromium, one toolchain, predictable output.
 *
 * PDF scripts (`npm run generate:pdf`, `@cb/pdf/render`) use this same install — run `npx playwright install chromium` once per machine/CI.
 *
 * E2E targets real deployed origins (recommended) so auth cookies can use
 * suite-wide `.thecapitalbridge.com` domain (see `packages/supabase/src/authCookieOptions.ts`).
 * Local multi-port localhost does not share cookies across apps.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "chromium", use: {} }],
});
