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
  PLAYWRIGHT_PDF_FOOTER_RESERVED_MM,
  PLAYWRIGHT_PDF_HEADER_RESERVED_MM,
  type PlaywrightPdfFooterContext,
} from "./playwrightPdfFooter";

export type PdfPageFormat = "A4" | "Letter";

export type PlaywrightCookieParam = { name: string; value: string; url: string };

export type RenderPdfOptions = {
  url: string;
  outputPath?: string;
  format?: PdfPageFormat;
  /** Forward session cookies for authenticated `page.goto` (same-origin PDF capture). */
  playwrightCookies?: PlaywrightCookieParam[];
  /** Navigation + readiness wait (ms). Default 120_000. */
  timeoutMs?: number;
  /**
   * When true (default), waits for `window.__REPORT_READY__ === true` after navigation.
   * Set false only for rare static pages that do not set the flag.
   */
  waitForReportReadySignal?: boolean;
  /**
   * After print emulation + fonts, wait this many ms before `page.pdf` (e.g. sample routes when
   * `__REPORT_READY__` is flaky). Only applied when `waitForReportReadySignal` is false.
   */
  settleMsBeforePdf?: number;
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

/**
 * Local / CI: Playwright downloads Chromium to `~/.cache/ms-playwright` (`npx playwright install chromium`).
 * Vercel & AWS Lambda: no cache — use `@sparticuz/chromium` (bundled brotli binary extracted to /tmp).
 * Override: set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to any Chrome/Chromium binary.
 */
async function chromiumLaunchOptions(): Promise<Parameters<typeof chromium.launch>[0]> {
  const fromEnv = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  if (fromEnv) {
    return { headless: true, executablePath: fromEnv };
  }

  const serverless =
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.env.PLAYWRIGHT_USE_BUNDLED_CHROMIUM === "1";

  if (serverless) {
    const ServerlessChromium = (await import("@sparticuz/chromium")).default;
    /** Skip SwiftShader unpack for smaller cold start; PDF print backgrounds still rasterise. */
    ServerlessChromium.setGraphicsMode = false;
    const executablePath = await ServerlessChromium.executablePath();
    return {
      headless: true,
      executablePath,
      args: ServerlessChromium.args,
    };
  }

  return { headless: true };
}

/**
 * Playwright serializes `page.evaluate` callbacks into the page. Bundlers (e.g. tsx/esbuild) can inject
 * `__name(...)` into transpiled functions, which throws in the browser. `new Function` bodies are plain
 * strings and serialize cleanly; string `evaluate("...")` is an expression, not an invoked callback.
 */
const evalResizeForPrint = new Function(`
  window.dispatchEvent(new Event("resize"));
`) as () => void;

const evalWaitFontsReady = new Function(`
  return (async () => {
    if (typeof document === "undefined" || !document.fonts) return;
    await document.fonts.ready;
  })();
`) as () => Promise<void>;

const evalReadFooterDomAttrs = new Function(
  "tuple",
  `
  const idAttr = tuple[0];
  const verAttr = tuple[1];
  const byRoot = document.querySelector(".cb-report-root[" + idAttr + "]");
  const el = byRoot || document.querySelector("[" + idAttr + "]");
  const rid = el && el.getAttribute(idAttr);
  const ver = el && el.getAttribute(verAttr);
  return {
    reportId: (rid && rid.trim()) || "",
    versionLabel: (ver && ver.trim()) || "",
  };
`,
) as (tuple: string[]) => { reportId: string; versionLabel: string };

const evalAddHtmlClass = new Function(
  "cls",
  `document.documentElement.classList.add(cls);`,
) as (cls: string) => void;

async function waitForFonts(page: import("playwright").Page): Promise<void> {
  await page.evaluate(evalWaitFontsReady);
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
  const settleMs = options.settleMsBeforePdf ?? 0;

  if (options.playwrightFooter && options.playwrightFooterFromDom) {
    throw new Error("renderPdf: pass only one of playwrightFooter or playwrightFooterFromDom");
  }

  const browser = await chromium.launch(await chromiumLaunchOptions());
  try {
    const context = await browser.newContext(
      options.storageStatePath ? { storageState: options.storageStatePath } : {},
    );
    const page = await context.newPage();
    if (options.playwrightCookies?.length) {
      await context.addCookies(options.playwrightCookies);
    }
    await page.goto(options.url, {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    });

    await page.emulateMedia({ media: "print" });
    await page.evaluate(evalResizeForPrint);

    await waitForFonts(page);

    if (waitReady) {
      // Playwright signature is (pageFunction, arg, options) — do not pass options as the second argument.
      await page.waitForFunction(() => window.__REPORT_READY__ === true, undefined, {
        timeout: timeoutMs,
      });
      await waitForFonts(page);
    } else if (settleMs > 0) {
      await page.waitForSelector("#print-report", { timeout: timeoutMs });
      await page.waitForTimeout(settleMs);
      await waitForFonts(page);
    }

    await waitForFonts(page);

    let footerCtx: PlaywrightPdfFooterContext | undefined = options.playwrightFooter;
    if (options.playwrightFooterFromDom) {
      const dom = await page.evaluate(evalReadFooterDomAttrs, [
        CB_PDF_FOOTER_DOM_REPORT_ID_ATTR,
        CB_PDF_FOOTER_DOM_VERSION_ATTR,
      ]);
      footerCtx = {
        reportId: dom.reportId.length > 0 ? dom.reportId : "CB-UNKNOWN",
        versionLabel: dom.versionLabel.length > 0 ? dom.versionLabel : "v0.0",
        logoDataUri: loadForeverReportLogoFooterDataUri(),
      };
    }

    const useFooter = Boolean(footerCtx);

    if (useFooter) {
      await page.evaluate(evalAddHtmlClass, CB_REPORT_PDF_PLAYWRIGHT_FOOTER_HTML_CLASS);
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
        top: useFooter ? `${PLAYWRIGHT_PDF_HEADER_RESERVED_MM}mm` : DEFAULT_MARGIN_MM,
        right: useFooter ? "13mm" : DEFAULT_MARGIN_MM,
        bottom: useFooter ? `${PLAYWRIGHT_PDF_FOOTER_RESERVED_MM}mm` : DEFAULT_MARGIN_MM,
        left: useFooter ? "13mm" : DEFAULT_MARGIN_MM,
      },
    });

    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

