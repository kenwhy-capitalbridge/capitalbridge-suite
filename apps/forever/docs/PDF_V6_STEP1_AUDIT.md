# Forever Income PDF v6 — STEP 1 audit (locate pipeline)

**Status:** audit = pass for identification. **Gap:** Forever does not use Playwright today; v6 requires new wiring.

## A1) Where Forever Income PDF export is triggered

| Location | Role |
|----------|------|
| `apps/forever/legacy/App.tsx` | `handleDownloadPDF` (client). On success path: builds jsPDF, stamps audit, `doc.save(audit.filename)`. |
| `apps/forever/scripts/render-sample-pdf-for-docs.ts` | Node/docs sample: same `buildForeverStrategicWealthPdf` + `stampAllPdfPagesWithAudit`. |

There is **no** Next.js API route or server handler dedicated to Forever PDF in-repo; export is **in-browser**.

## A2) Where Playwright `page.pdf()` is invoked

| File | Function | Notes |
|------|----------|--------|
| `packages/pdf/src/renderPdf.ts` | `renderPdf()` | `await page.pdf({ path, format, printBackground, preferCSSPageSize, margin })` (~L73). **No** `displayHeaderFooter` / `footerTemplate` today. |

Callers:

- `scripts/generate-pdf.ts` — CLI: `renderPdf({ url, outputPath })`.
- `apps/capitalstress/scripts/render-sample-pdf-for-docs.ts` — sample URL → file.
- `apps/incomeengineering/scripts/render-sample-pdf-for-docs.ts` — sample URL → file.

**Forever Income is not a caller** of `renderPdf` in the current tree.

## A3) Where Forever report output is built (template)

| Path | Mechanism |
|------|-----------|
| `apps/forever/legacy/foreverPdfBuild.ts` | **`buildForeverStrategicWealthPdf(ctx)`** — programmatic **jsPDF** (text, rects, images). Not React/HTML. |
| `apps/forever/legacy/foreverPdfLogos.ts` | Loads PNG data URLs for full lockup (cover branding). |
| `appendLionsVerdictToForeverPdf` (same file) | Appends Lion block from **`LionVerdictClientReport`** (structured JSON from `@cb/advisory-graph/lionsVerdict`), not from `Lion Verdict dynamic copy.txt`. |

Related (not Forever-specific):

- `apps/platform/app/print/[model]/page.tsx` — SSR **BaseReport** from JSON query param (generic narrative PDF path).
- `packages/pdf/templates/BaseReport.tsx`, `CoverPage.tsx` — HTML/CSS print template (used by platform print + `buildPdfNarrative` data shape).

**v6 Playwright path** will need a **dedicated print URL** (or server HTML) that renders the 14-page layout and sets `window.__REPORT_READY__` (pattern in `packages/pdf/src/reportReady.ts`, used by Stress/IE print flows).

## A4) Trial vs paid determination (Forever)

| File | Logic |
|------|--------|
| `apps/forever/app/dashboard/page.tsx` | Loads `memberships` + `plans.slug`. `lionAccessUser.isPaid = normalizedSlug !== "trial"`. |
| `packages/lion-verdict/access.ts` | `canAccessLion(user)` → `isPaid \|\| hasActiveTrialUpgrade`. Forever dashboard sets `hasActiveTrialUpgrade: false`. |

In `App.tsx`:

- `lionAccessEnabled = canAccessLion(lionAccessUser)`.
- PDF: `includeLionsVerdict: lionAccessEnabled` passed into `buildForeverStrategicWealthPdf`.

**Trial:** Lion appendix omitted from jsPDF. **Paid:** included via `appendLionsVerdictToForeverPdf`.

## A5) Export record / persistence (report ID, lion selection, re-download)

| Mechanism | Location | What it stores |
|-----------|----------|----------------|
| `createReportAuditMeta` | `packages/shared/src/reportTraceability.ts` | `reportId`, `versionLabel`, `filename`, `generatedAt`, `modelDisplayName`. Filename via `buildCapitalBridgePdfFilename` (`CapitalBridge_ForeverIncome_…`). |
| `nextReportExportVersion` | same file | **sessionStorage / localStorage** only — bumps `v{major}.{minor}` per tab/session. **Not** server-side. |
| `stampAllPdfPagesWithAudit` | `packages/ui/src/stampPdfAuditMeta.ts` | Embeds report meta into **jsPDF** pages after build. |

**No** Supabase (or other) table was found for `report_export`, `download_log`, or lion headline/guidance indices. **v6 requirement** (re-download same export + anti-repeat across exports) implies **new persistence** (minimal table or reuse advisory session storage if product agrees).

---

## STEP 1 audit checklist (must pass)

1. **Playwright `page.pdf`:** `packages/pdf/src/renderPdf.ts` → `renderPdf()` (Forever does not use it yet).
2. **Forever template:** `apps/forever/legacy/foreverPdfBuild.ts` → `buildForeverStrategicWealthPdf` (+ optional `appendLionsVerdictToForeverPdf`). No HTML template for Forever PDF today.
3. **Filename:** `createReportAuditMeta` / `buildCapitalBridgePdfFilename` in `packages/shared/src/reportTraceability.ts`; applied in `App.tsx` as `doc.save(audit.filename)`. **Not** yet `Forever-Income-Model-…` / `Trial_…` / Asia/Kuala_Lumpur (v6 STEP 10).
4. **Trial vs paid:** `apps/forever/app/dashboard/page.tsx` plan slug + `canAccessLion` / `includeLionsVerdict` in PDF context.
5. **Lion line persistence:** **No** existing DB export row; only ephemeral audit object + client version keys. **New** store recommended for `selectedHeadlineIndex` / `selectedGuidanceIndex` (or text) keyed by `exportId` or `reportId` + user.

## Local assets (v6 STEP 2+)

Per spec, these exist in-repo:

- `Lion Verdict dynamic copy.txt` (repo root)
- `packages/ui/src/assets/CapitalBridgeLogo_Green.svg`
- `packages/ui/src/assets/Full_CapitalBridge_Green.svg`

---

## Clarifications useful before STEP 3+

1. **Delivery path:** Should v6 PDF be generated **only via Playwright** (new `/forever/.../print` route + optional API), or keep **jsPDF** for offline/simple path? Spec mandates Playwright `displayHeaderFooter`.
2. **Export persistence:** OK to add a **new** `public.report_exports` (or similar) migration for `user_id`, `report_id`, `lion_headline_key`, `lion_guidance_key`, `created_at`, `payload_hash`?
3. **“Re-download same export”:** Is the product key `reportId` from `createReportAuditMeta`, or a new server-issued `exportId` returned when user clicks Download?

When these are answered, proceed **STEP 2** (asset resolver) per runbook.

---

## STEP 2 — Asset resolver (implemented)

| Item | Location |
|------|----------|
| Resolver + helpers | `packages/pdf/src/foreverReportAssets.ts` — `resolveForeverReportAssetPath`, `readTextFile`, `readSvgFile`, `svgToDataUri`, loaders, `assertForeverReportAssetsResolvable` |
| Export | `@cb/pdf/forever-report-assets` in `packages/pdf/package.json` |
| Env override | `CB_CAPITALBRIDGE_SUITE_ROOT` — optional repo root when auto-discovery fails |
| Verification script | `npm run verify:forever-report-assets` (repo root) |
| DB | `supabase/migrations/20260421120000_report_exports.sql` — `report_exports` table (approved alongside STEP 2) |
