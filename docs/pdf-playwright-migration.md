# Playwright PDF migration (fast + safe)

## Bottom line

**Playwright is the suite standard for PDF capture** — one Chromium stack (shared with e2e), one pipeline (`@cb/pdf/render` → real URL → print media → fonts → `page.pdf`). Same engine as users see; no alternate browser automation and no HTML-injection shortcuts for product reports.

Legacy programmatic PDFs (e.g. some sample scripts) are exceptions until migrated; new report PDFs should use Playwright.

## STEP A — Shared util + pilot (done)

| Item | Status |
|------|--------|
| Shared module `@cb/pdf` | `renderPdf` in `@cb/pdf/render`: `page.goto` (`networkidle`), print media, `document.fonts.ready`, `__REPORT_READY__`, `page.pdf` with `printBackground: true`, **`preferCSSPageSize: true`** (honours `@page` in CSS), URL-only (no `setContent`) |
| Client signal | `@cb/pdf` → `beginReportReadyCycle` / `completeReportReadyCycle` / print `resize` hooks |
| **Pilot: Income Engineering** | `/docs/sample-report` + `apps/incomeengineering/scripts/render-sample-pdf-for-docs.ts` → `renderPdf({ url })` |
| Capital Stress | Same pattern: `/docs/sample-report` + URL script |

**No** `page.setContent` / HTML injection for IE or Stress samples.

## STEP B — Validate before widening

Run with dev servers up (`npm run dev -w @cb/incomeengineering`, `npm run dev -w @cb/capitalstress`), then:

1. **Pagination** — multi-page PDFs; no clipped charts; breaks sane vs `@media print` + `.lion-section` / `.lion-verdict`.
2. **Lion Verdict** — full block (incl. “If you do nothing”), no half-rendered copy; compare to browser print preview at same URL.
3. **Fonts + spacing** — `waitForFonts` runs before `page.pdf`; spot-check vs UI (webfont metrics).

Smoke: `npm run generate:pdf -- http://127.0.0.1:3005/docs/sample-report ./tmp-ie.pdf` (ports: IE **3005**, Stress **3003**).

## STEP C — Remaining + Puppeteer

| Track | Status |
|-------|--------|
| **Puppeteer** | **Removed** — not in `package.json`; no imports. |
| **IE + Stress sample PDFs** | **Playwright + URL** |
| **Capital Health + Forever sample PDFs** | Still **programmatic** (`jsPDF` / report builders, no browser). Migrating them means adding print-target Next routes + `renderPdf` — separate effort. |

Aggregate: `npx tsx scripts/render-all-sample-pdfs.ts` — IE/Stress need dev servers; CH/Forever do not.
