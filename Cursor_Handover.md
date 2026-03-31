# Cursor handover

**Generated:** 2026-03-28  
**Updated:** 2026-03-28 (full conversation + PDF strategy)  
**Purpose:** Start a new chat from this file to avoid long, laggy threads. Paste or @-mention this file when opening a new session.

---

## Snapshot: where `main` should be (this session)

After the work below, `origin/main` included at least:

| Commit | Summary |
|--------|---------|
| `69b2529` | Capital Stress: **Monte Carlo path count** in CAPITAL DIAGNOSIS intro (`simulationCount`, gold bold serif). |
| `9d248c2` | Capital Stress: second **EXPAND ALL / COLLAPSE ALL** above **Structural Stability Map** (`toggleExpandAllSections` shared with lower control). |

**Verify current tip:**

```bash
git fetch origin && git log -1 --oneline origin/main
```

---

## Locked restore point (older — optional)

| | |
|---|---|
| **Tag** | `restore-point-2026-03-28` |
| **Commit** | `eee0b61` — *fix(ui): center ChromeSpinnerGlyph and restore reliable rotation* |

Return with `git checkout restore-point-2026-03-28` or `git checkout eee0b61` if you need the **pre-stress-copy** spinner/layout baseline. For latest product work, use **`origin/main`** instead.

---

## Context and background

### Monorepo

- **Workspace:** `capitalbridge-suite` — apps: `capitalstress`, `capitalhealth`, `incomeengineering`, `forever`, `login`, `platform`, `api`.
- **Shared packages:** `@cb/ui`, `@cb/shared`, `@cb/advisory-graph`, `@cb/lion-verdict`, `@cb/pdf`.
- **Login / pricing (public):** [login.thecapitalbridge.com/pricing](https://login.thecapitalbridge.com/pricing) — SELECT PLANS, auth chrome.
- **Capital Stress (prod example):** `capitalstress.thecapitalbridge.com` — dashboard after login.

### Prior arc (before this conversation’s UI tweaks)

- Pending-button UX: spinner-only-in-control, `ChromeSpinnerGlyph` CSS rotation, `.cb-pending-btn-inner`, header grid fixes.
- Lion trial vs paid: `packages/lion-verdict/access.ts` → `LionVerdictLocked` vs `LionVerdictActive`.
- Optional follow-up: real pricing link on locked Lion control.

---

## What we did in this conversation (completed)

### 1. Capital Stress — CAPITAL DIAGNOSIS + path count

- **File:** `apps/capitalstress/legacy/App.tsx` (inside `{mcResult && …}`).
- **Behaviour:** After **Run Simulation**, the intro paragraph appends **gold, bold, serif, uppercase, tracking-wide** text: **“Based on {n} DATA POINTS ANALYSED”**.
- **Metric:** `{n}` = **`mcResult.simulationCount`** — **number of Monte Carlo paths** from `runMonteCarlo` (via `getSimulationCount(years)`), **not** total daily steps. Example: 10 years → `3,650` paths; formatted with **`toLocaleString()`**.
- **Product wording:** User asked for “DATA POINTS ANALYSED” while confirming the **number** is path count.

### 2. Capital Stress — EXPAND ALL above Structural Stability Map

- **Placement:** Immediately **below** the gold `border-t` divider, **above** the Structural Stability Map card; **right-aligned** ghost gold button; `no-print`.
- **Visibility:** Only when `mcResult && depletionBarOutput != null` (same as map).
- **Logic:** **`toggleExpandAllSections`** (`useCallback` + functional `setCollapsedSections`) toggles all collapsible sections (`structuralStabilityMap`, `capitalOutcomeDist`, `capitalStressRadar`, `furtherStressTest`, `capitalAdjustmentSimulator`). Lower **EXPAND ALL** under Further Structural Stress Test uses the **same** handler.

### 3. Report format strategy (decision — not fully migrated)

- **Agreed standard:** **DOM print route + Playwright** for PDFs across all four model apps (replace divergent **jsPDF** / **@react-pdf/renderer** as the canonical pipeline over time).
- **Existing infra to use:**
  - `scripts/generate-pdf.ts` → `@cb/pdf/render` **`renderPdf({ url, outputPath })`**.
  - Playwright: **`page.goto(realUrl)`**, **`emulateMedia({ media: "print" })`**, wait **`window.__REPORT_READY__ === true`** (default), **`printBackground`**, **`preferCSSPageSize`** — see `packages/pdf/src/renderPdf.ts`.
  - Client helpers: `packages/pdf/src/reportReady.ts` — `beginReportReadyCycle`, `completeReportReadyCycle`, optional `subscribeReportReadyOnPrint`.
- **Shared tokens:** `packages/shared/src/cbReportTemplate.ts` (margins, brand paths, firm lines); `packages/advisory-graph/src/reports/tokens.ts` (print typography/colours). *Update the comment in `cbReportTemplate.ts` when react-pdf is no longer primary.*
- **Per app:** dedicated **print-only route** + `@media print` / shared `print.css`; Capital Stress already has patterns: `PrintReport.tsx`, `@cb/advisory-graph/reports/print.css`, `apps/capitalstress/app/docs/sample-report/page.tsx`.

---

## Action items for the next session (suggested)

1. **PDF migration (large):**  
   - **Income Engineering:** move off `jsPDF` in `App.tsx` / `PrintReportView` toward a print URL + Playwright.  
   - **Forever:** same vs `foreverPdfBuild.ts`.  
   - **Capital Health:** add DOM print route mirroring `CapitalGrowthReport` sections; deprecate or secondary **@react-pdf/renderer** for “official” PDF.  
   - **Capital Stress:** ensure **download** path can target print URL + Playwright where server/CI PDF is needed; keep `window.print()` if product wants browser print too.

2. **Shared report shell:** Extract repeated DOM (cover, section headers, legal block) into `@cb/ui` or `@cb/advisory-graph` so all four print routes stay aligned.

3. **Optional copy tweak:** If “DATA POINTS ANALYSED” should say **paths** for accuracy, rename while keeping `simulationCount`.

4. **Handover hygiene:** After large milestones, bump **Snapshot** table at top of this file + `git log -1`.

---

## Useful paths (quick reference)

| Area | Path |
|------|------|
| Capital Stress dashboard UI | `apps/capitalstress/legacy/App.tsx` |
| Capital Stress print layout | `apps/capitalstress/legacy/PrintReport.tsx` |
| Monte Carlo / `simulationCount` | `apps/capitalstress/legacy/services/mathUtils.ts` (`getSimulationCount`, `runMonteCarlo`) |
| Playwright PDF | `packages/pdf/src/renderPdf.ts`, `scripts/generate-pdf.ts` |
| Report ready flag | `packages/pdf/src/reportReady.ts` |
| Model footer / download CTA | `packages/ui/src/ModelReportDownloadFooter.tsx` |
| Shared print CSS tokens (apps) | `packages/ui/src/cb-model-base.css`, `packages/advisory-graph/src/reports/` |
| IE print | `apps/incomeengineering/legacy/components/PrintReportView.tsx` |
| Health PDF (react-pdf today) | `apps/capitalhealth/legacy/CapitalGrowthReport.tsx` |
| Forever PDF (jsPDF today) | `apps/forever/legacy/foreverPdfBuild.ts` |
| Lion | `packages/lion-verdict/` |

Other notes in repo: `gpthandover.md`, `Cursor-handover.txt`, `lapsap.txt` (if present).

---

## Your role (next assistant)

- Read this file first; use **Snapshot** + **Action items** to pick up work.
- **Be concise**; confirm scope before megarefactors (especially PDF migration).
- Prefer **focused diffs**; match existing patterns in each app until shared shell exists.
