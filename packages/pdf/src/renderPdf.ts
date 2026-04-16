/**
 * Suite standard for server-side / CI PDF capture: Playwright Chromium only (`@cb/pdf/render`).
 *
 * **Local / self-hosted Node:** `npm run docs:playwright-browsers` or `npx playwright install chromium`
 * (cache `~/.cache/ms-playwright`). **GitHub Actions:** `npx playwright install --with-deps chromium`
 * (see `.github/workflows/e2e-model-platform.yml`, `.github/workflows/pdf-render-smoke.yml`).
 * **Vercel / AWS Lambda:** uses `@sparticuz/chromium`
 * when `VERCEL=1` or lambda env — no `playwright install` on the serverless image.
 * **Next.js** apps that call `renderPdf` from API routes must set
 * `serverExternalPackages: ["playwright", "@sparticuz/chromium"]` (Forever + model apps `next.config.mjs`).
 * **Prod diagnostics:** set `PDF_RENDER_TIMING_LOG=1` for JSON stage logs (`renderPdf` + `report-pdf-api` when wired in app routes).
 * Income / Capital Stress: pass `?pdfCapture=` (HMAC from `@cb/shared/pdfCaptureToken`) so headless Chromium
 * does not rely on replaying `Domain=.thecapitalbridge.com` session cookies.
 * Override: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
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
  /** @deprecated Prefer `budgetMs`. If `budgetMs` is omitted, used as total wall-clock budget (not per step). */
  timeoutMs?: number;
  /**
   * Total wall-clock budget (ms) for launch + navigation + PDF. Default 120_000.
   * Prevents stacking multiple 120s Playwright timeouts, which exceeds Vercel FUNCTION_INVOCATION_TIMEOUT.
   */
  budgetMs?: number;
  /**
   * Playwright `page.goto` waitUntil. Default `"load"`.
   * Avoid `"networkidle"` on production pages — analytics, chat widgets, and long-lived connections often prevent it from settling.
   */
  navigateWaitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
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
   * Chromium footer: canonical copyright (left) + page numbers (right). Report id / version / client come from the DOM header.
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
    await Promise.race([
      document.fonts.ready,
      new Promise(function (resolve) { setTimeout(resolve, 5000); }),
    ]);
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

/** Remove Elfsight / vendor widgets from the live DOM — `@media print` CSS alone is not enough for Playwright `page.pdf()`. */
const evalStripThirdPartyWidgets = new Function(`
  (function() {
    try {
      document.querySelectorAll(
        '[class*="elfsight-app-"], [class*="elfsight"], [class*="eapps-cdn"], [class*="eapps-widget"], [class*="eapps-"], [id^="eapps-"], [data-elfsight-app-lazy], [data-widget-id], a[href*="elfsight"]'
      ).forEach(function (el) { el.remove(); });
      document.querySelectorAll('iframe[src*="elfsight"], iframe[src*="eapps-"], iframe[src*="elfsightcdn"]').forEach(function (el) {
        el.remove();
      });
      document.querySelectorAll('script[src*="elfsightcdn"], script[src*="eapps-"]').forEach(function (el) {
        el.remove();
      });
    } catch (e) {}
  })();
`) as () => void;

/** After audit ids are copied for metadata, remove from DOM so nothing in the rasterized page can echo them. */
const evalRemoveDomAuditTraceAttrs = new Function(
  "tuple",
  `
  var idAttr = tuple[0];
  var verAttr = tuple[1];
  var root = document.querySelector(".cb-report-root") || document.querySelector("#print-report");
  if (!root) return;
  try {
    root.removeAttribute(idAttr);
    root.removeAttribute(verAttr);
  } catch (e) {}
`,
) as (tuple: [string, string]) => void;

async function waitForFonts(page: import("playwright").Page): Promise<void> {
  await page.evaluate(evalWaitFontsReady);
}

/**
 * STEP 1 pipeline (deterministic, UI-parity):
 * 1. `goto` — `waitUntil: "load"` (default; avoid `networkidle` in production)
 * 2. `emulateMedia({ media: "print" })` + `resize` — required before `__REPORT_READY__` for apps whose
 *    print report lives under `@media print` / `#print-report` (otherwise layout never stabilises).
 * 3. `document.fonts.ready`
 * 4. `window.__REPORT_READY__ === true` (optional; on by default)
 * 5. `document.fonts.ready` again after ready
 * 6. `page.pdf` — `printBackground`, `preferCSSPageSize` (honour `@page` from CSS), A4 fallback
 */
const evalForceReportReady = new Function(`
  window.__REPORT_READY__ = true;
`) as () => void;

function pdfRenderTimingEnabled(): boolean {
  const v = process.env.PDF_RENDER_TIMING_LOG?.trim();
  return v === "1" || v?.toLowerCase() === "true";
}

/** Log pathname only — `pdfCapture` tokens must not appear in production logs. */
function pdfRenderUrlForLog(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "(invalid-url)";
  }
}

function pdfRenderTimingEmit(
  stage: string,
  t0: number,
  extra?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (!pdfRenderTimingEnabled()) return;
  console.log(
    JSON.stringify({
      tag: "renderPdf",
      stage,
      elapsed_ms: Date.now() - t0,
      ...extra,
    }),
  );
}

export async function renderPdf(options: RenderPdfOptions): Promise<Buffer> {
  const t0 = Date.now();
  const budgetMs = options.budgetMs ?? options.timeoutMs ?? 120_000;
  const deadline = Date.now() + budgetMs;
  const remaining = (): number => {
    const ms = deadline - Date.now();
    if (ms <= 0) {
      throw new Error(
        "renderPdf: time budget exceeded — increase budgetMs / PDF_RENDER_BUDGET_MS or Vercel maxDuration (Pro: up to 300s)",
      );
    }
    return Math.max(500, ms);
  };

  const waitReady = options.waitForReportReadySignal !== false;
  const settleMs = options.settleMsBeforePdf ?? 0;
  const navigateWaitUntil = options.navigateWaitUntil ?? "load";

  if (options.playwrightFooter && options.playwrightFooterFromDom) {
    throw new Error("renderPdf: pass only one of playwrightFooter or playwrightFooterFromDom");
  }

  pdfRenderTimingEmit("start", t0, {
    budget_ms: budgetMs,
    url: pdfRenderUrlForLog(options.url),
    wait_ready: waitReady,
    footer_from_dom: Boolean(options.playwrightFooterFromDom),
    cookies: options.playwrightCookies?.length ?? 0,
  });

  const browser = await chromium.launch(await chromiumLaunchOptions());
  pdfRenderTimingEmit("chromium_launched", t0);
  try {
    const context = await browser.newContext(
      options.storageStatePath ? { storageState: options.storageStatePath } : {},
    );
    const page = await context.newPage();
    if (options.playwrightCookies?.length) {
      await context.addCookies(options.playwrightCookies);
    }
    await page.goto(options.url, {
      waitUntil: navigateWaitUntil,
      timeout: remaining(),
    });
    pdfRenderTimingEmit("goto_done", t0);

    // Client report roots mount after hydration; do not rely on networkidle (often never settles in prod).
    await page.waitForSelector(".cb-report-root, #print-report", {
      state: "attached",
      timeout: remaining(),
    });
    pdfRenderTimingEmit("report_root_visible", t0);

    await page.emulateMedia({ media: "print" });
    await page.evaluate(evalResizeForPrint);

    await waitForFonts(page);
    pdfRenderTimingEmit("fonts_after_print_emulate", t0);

    if (waitReady) {
      // Playwright signature is (pageFunction, arg, options) — do not pass options as the second argument.
      try {
        // Cap separately from total `remaining()` so a hung client cannot burn the entire serverless budget.
        const reportReadyWaitMs = Math.min(remaining(), 45_000);
        await page.waitForFunction(() => window.__REPORT_READY__ === true, undefined, {
          timeout: reportReadyWaitMs,
        });
        pdfRenderTimingEmit("report_ready_true", t0);
      } catch (readyErr) {
        const hasRoot = await page.$("#print-report, .cb-report-root");
        if (hasRoot) {
          console.warn(
            "[renderPdf] __REPORT_READY__ timed out; forcing ready after #print-report / .cb-report-root found",
          );
          pdfRenderTimingEmit("report_ready_forced_after_timeout", t0);
          await page.evaluate(evalForceReportReady);
        } else {
          throw readyErr;
        }
      }
      await waitForFonts(page);
    } else if (settleMs > 0) {
      await page.waitForSelector("#print-report", { timeout: remaining() });
      await page.waitForTimeout(Math.min(settleMs, remaining()));
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
      pdfRenderTimingEmit("footer_dom_read", t0);
    }

    const useFooter = Boolean(footerCtx);

    if (useFooter) {
      await page.evaluate(evalAddHtmlClass, CB_REPORT_PDF_PLAYWRIGHT_FOOTER_HTML_CLASS);
    }

    if (options.playwrightFooterFromDom && footerCtx) {
      await page.evaluate(evalRemoveDomAuditTraceAttrs, [
        CB_PDF_FOOTER_DOM_REPORT_ID_ATTR,
        CB_PDF_FOOTER_DOM_VERSION_ATTR,
      ] as [string, string]);
    }

    await page.evaluate(evalStripThirdPartyWidgets);
    await page.evaluate(evalStripThirdPartyWidgets);

    pdfRenderTimingEmit("before_page_pdf", t0);
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

    let out = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
    pdfRenderTimingEmit("page_pdf_done", t0, { pdf_bytes: out.length });

    if (useFooter && footerCtx) {
      out = await embedTraceabilityPdfMetadata(out, {
        reportId: footerCtx.reportId,
        versionLabel: footerCtx.versionLabel,
      });
      pdfRenderTimingEmit("metadata_embedded", t0);
    }

    pdfRenderTimingEmit("complete", t0, { out_bytes: out.length });
    return out;
  } finally {
    await browser.close();
  }
}

/** Embeds Report ID / version into PDF document info (not visible layout). */
async function embedTraceabilityPdfMetadata(
  pdfBuffer: Buffer,
  meta: { reportId: string; versionLabel: string },
): Promise<Buffer> {
  try {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(pdfBuffer);
    doc.setTitle(`Capital Bridge report — ${meta.reportId}`);
    doc.setSubject(`Report ID: ${meta.reportId}; Version: ${meta.versionLabel}`);
    doc.setKeywords([meta.reportId, meta.versionLabel]);
    return Buffer.from(await doc.save());
  } catch {
    return pdfBuffer;
  }
}

