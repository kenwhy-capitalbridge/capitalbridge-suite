/**
 * Suite standard for server-side / CI PDF capture: Playwright Chromium only (`@cb/pdf/render`).
 * One system with e2e — install once: `npx playwright install chromium`.
 *
 * Always use `page.goto(realAppUrl)` — never `setContent` — so output matches hydration, fonts, and real app state.
 * For Node/CI scripts only — do not import from client bundles.
 */

import { chromium } from "playwright";
import {
  CB_PDF_FOOTER_DOM_REPORT_ID_ATTR,
  CB_PDF_FOOTER_DOM_VERSION_ATTR,
  CB_REPORT_PDF_PLAYWRIGHT_FOOTER_HTML_CLASS,
} from "@cb/shared/reportPdfPlaywright";
import { loadForeverReportLogoFooterDataUri } from "./foreverReportAssets";
import {
  buildPlaywrightPdfFooterTemplate,
  PLAYWRIGHT_PDF_EMPTY_HEADER_TEMPLATE,
  PLAYWRIGHT_PDF_FOOTER_MARGIN_BOTTOM_PX,
  type PlaywrightPdfFooterContext,
} from "./playwrightPdfFooter";

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
  /**
   * Playwright `storageState` JSON path (saved auth). Same pattern as e2e `storageState` option.
   */
  storageStatePath?: string;
  /**
   * Forever v6 / Option B: Chromium footer with wordmark data URI, short legal only, report id + version + page numbers.
   * When omitted, `displayHeaderFooter` is off (legacy sample PDFs unchanged).
   * Mutually exclusive with `playwrightFooterFromDom`.
   */
  playwrightFooter?: PlaywrightPdfFooterContext;
  /**
   * When true (and `playwrightFooter` is omitted), footer uses Report ID + version from DOM
   * (`CB_PDF_FOOTER_DOM_*` on `.cb-report-root` or first matching element) and the Forever green wordmark from
   * `@cb/pdf/forever-report-assets`.
   */
  playwrightFooterFromDom?: boolean;
};

export type { PlaywrightPdfFooterContext };

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

  if (options.playwrightFooter && options.playwrightFooterFromDom) {
    throw new Error("renderPdf: pass only one of playwrightFooter or playwrightFooterFromDom");
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(
      options.storageStatePath ? { storageState: options.storageStatePath } : {},
    );
    const page = await context.newPage();
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

    let footerCtx: PlaywrightPdfFooterContext | undefined = options.playwrightFooter;
    if (options.playwrightFooterFromDom) {
      const dom = await page.evaluate(
        ([idAttr, verAttr]) => {
          const pick = () => {
            const byRoot = document.querySelector(
              `.cb-report-root[${idAttr}]`,
            ) as HTMLElement | null;
            if (byRoot) return byRoot;
            return document.querySelector(`[${idAttr}]`) as HTMLElement | null;
          };
          const el = pick();
          return {
            reportId: el?.getAttribute(idAttr)?.trim() ?? "",
            versionLabel: el?.getAttribute(verAttr)?.trim() ?? "",
          };
        },
        [CB_PDF_FOOTER_DOM_REPORT_ID_ATTR, CB_PDF_FOOTER_DOM_VERSION_ATTR],
      );
      footerCtx = {
        reportId: dom.reportId.length > 0 ? dom.reportId : "CB-UNKNOWN",
        versionLabel: dom.versionLabel.length > 0 ? dom.versionLabel : "v0.0",
        logoDataUri: loadForeverReportLogoFooterDataUri(),
      };
    }

    const useFooter = Boolean(footerCtx);

    if (useFooter) {
      await page.evaluate((cls) => {
        document.documentElement.classList.add(cls);
      }, CB_REPORT_PDF_PLAYWRIGHT_FOOTER_HTML_CLASS);
    }

    const pdf = await page.pdf({
      path: options.outputPath,
      format: options.format ?? "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: useFooter,
      headerTemplate: useFooter ? PLAYWRIGHT_PDF_EMPTY_HEADER_TEMPLATE : undefined,
      footerTemplate: useFooter && footerCtx ? buildPlaywrightPdfFooterTemplate(footerCtx) : undefined,
      margin: {
        top: DEFAULT_MARGIN_MM,
        right: DEFAULT_MARGIN_MM,
        bottom: useFooter ? `${PLAYWRIGHT_PDF_FOOTER_MARGIN_BOTTOM_PX}px` : DEFAULT_MARGIN_MM,
        left: DEFAULT_MARGIN_MM,
      },
    });

    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

