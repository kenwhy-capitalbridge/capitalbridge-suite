/**
 * Suite standard for server-side / CI PDF capture: Playwright Chromium only (`@cb/pdf/render`).
 * One system with e2e — install once: `npx playwright install chromium`.
 *
 * Always use `page.goto(realAppUrl)` — never `setContent` — so output matches hydration, fonts, and real app state.
 * For Node/CI scripts only — do not import from client bundles.
 */

import { chromium } from "playwright";

export type PdfPageFormat = "A4" | "Letter";

export type RenderPdfOptions = {
  url: string;
  outputPath?: string;
  format?: PdfPageFormat;
  /** Navigation + readiness wait (ms). Default 120_000. */
  timeoutMs?: number;
  /**
   * When true (default), waits for `window.__REPORT_READY__ === true` after navigation.
   * Set false only for rare static pages that do not set the flag.
   */
  waitForReportReadySignal?: boolean;
};

const DEFAULT_MARGIN_MM = "12mm";

async function waitForFonts(page: import("playwright").Page): Promise<void> {
  await page.evaluate(async () => {
    if (typeof document === "undefined" || !document.fonts) return;
    await document.fonts.ready;
  });
}

/**
 * STEP 1 pipeline (deterministic, UI-parity):
 * 1. `goto` — `waitUntil: "networkidle"`
 * 2. `emulateMedia({ media: "print" })` + `resize` — required before `__REPORT_READY__` for apps whose
 *    print report lives under `@media print` / `#print-report` (otherwise layout never stabilises).
 * 3. `document.fonts.ready`
 * 4. `window.__REPORT_READY__ === true` (optional; on by default)
 * 5. `document.fonts.ready` again after ready
 * 6. `page.pdf` — `printBackground`, `preferCSSPageSize` (honour `@page` from CSS), A4 fallback
 */
export async function renderPdf(options: RenderPdfOptions): Promise<Buffer> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const waitReady = options.waitForReportReadySignal !== false;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(options.url, {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    });

    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => {
      window.dispatchEvent(new Event("resize"));
    });

    await waitForFonts(page);

    if (waitReady) {
      await page.waitForFunction(() => window.__REPORT_READY__ === true, {
        timeout: timeoutMs,
      });
      await waitForFonts(page);
    }

    await waitForFonts(page);

    const pdf = await page.pdf({
      path: options.outputPath,
      format: options.format ?? "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: DEFAULT_MARGIN_MM,
        right: DEFAULT_MARGIN_MM,
        bottom: DEFAULT_MARGIN_MM,
        left: DEFAULT_MARGIN_MM,
      },
    });

    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
