# Capital Bridge Report Standard

**Status:** Locked system contract for advisory PDFs.  
**Applies to:** Forever Income, Income Engineering, Capital Stress (HTML print / Playwright pipeline), and Capital Health (react-pdf) until migrated.

This document is the **non-negotiable** reference for report work. Do not introduce alternate layout systems, ad hoc page chrome, or chart framing outside these rules.

---

## Compliance matrix

| Model | Layout engine | `PdfLayout` / `PdfSection` / `PdfChartBlock` | Cover (`PdfAdvisoryCoverPage` parity) | Journey CTA |
| ----- | ------------- | -------------------------------------------- | ------------------------------------- | ----------- |
| Forever Income | HTML print (`@cb/pdf/shared`) | Required | Required (shared component) | → Income Engineering |
| Income Engineering | HTML print | Required | Required | → Capital Health |
| Capital Stress | HTML print | Required | Required | → Forever Income (optional loop-back copy) |
| Capital Health | react-pdf (`CapitalGrowthReport.tsx`) | **Structural parity only** — full component migration required | Required (same TOC presets + cover fields) | → Capital Stress |

**Capital Health** must not gain new bespoke PDF patterns. Any material change should plan migration to the HTML print stack (`PdfLayout`) so this matrix becomes “Required” across the row.

---

## 1. Layout rules

- **Canonical stack (Forever, Income Engineering, Capital Stress):** Root every export document in **`PdfLayout`** only. Do not add parallel document roots, duplicate header/footer bands, or app-specific page wrappers that bypass `@cb/advisory-graph/reports` print frame.
- **Fixed header/footer:** Use the shared advisory print CSS and Playwright margin/footer templates already wired for each app. Do not hard-code footers inside section bodies except the short legal string passed into `PdfLayout`.
- **Max width:** Content lives inside the advisory PDF document root (`.cb-advisory-pdf-doc` / `.cb-page`). No full-bleed arbitrary HTML that breaks the column.

---

## 2. Structure rules

Every report **must** follow this narrative order:

1. **Section A — Opening** (framework context, trial/paid Lion placement policy per model)
2. **Section B — Advisor Read** (headline diagnosis, charts, working numbers)
3. **Section C — Deeper analysis** (assumptions, sensitivity, methodology as applicable)
4. **Appendix & closing** (disclosures, how to use, journey CTA)

Do not use live-dashboard UI section titles as PDF headings. Map content into A/B/C/Appendix.

---

## 3. Component rules

- **`PdfSection`:** Every top-level section (cover, opening, B, C, appendix) is a `PdfSection` with the standard classes (`cb-advisory-doc-cover`, `cb-page-break`, `cb-appendix`, etc.) as used in Forever.
- **`PdfChartBlock`:** Every chart in the HTML pipeline is wrapped in **`PdfChartBlock`** with **What this shows**, **Why this matters**, and **Interpretation** (see §4). The figure body is the only place for SVG/plot markup.
- **Lion block:** Use **`PdfLionsVerdictBlock`** from `@cb/pdf/shared` for HTML reports. Capital Health must keep the **same field order and labels**: title → score/status line → narrative quote → Summary → Why this is happening → System state → What you should do next (bullets).

---

## 4. Chart rules

For each chart:

1. **What this shows** — Plain-language description of axes/series/bands.
2. **Why this matters** — Advisory “so what” for the meeting.
3. **Interpretation** — How to read this specific output (what to notice, caveats, link to headline metrics).

The shared **`PdfChartBlock`** renders the **Interpretation** heading explicitly when `interpretation` is provided. **Do not omit interpretation** on new charts.

**Capital Health (react-pdf):** Until `PdfChartBlock` is adopted, mirror the same three-part narrative in `Text` blocks (see Capital Projection chart pattern: What / Why / Interpretation label + body).

---

## 5. Writing rules

Tone:

- Advisory, calm, structured, non-technical.

Avoid:

- UI language (“click”, “dashboard tile”, “modal”)
- Internal code names or implementation jargon in client-facing prose
- Overly academic or legalistic phrasing in body copy (legal notice stays in footer/appendix)

---

## 6. Design rules

- **Spacing:** Use the shared spacing scale in `advisoryReportPdfTemplate.css` and module classes (`.cb-module`). Do not one-off large margins except inside approved chart wrappers.
- **Typography:** Report body and headings use the shared advisory report tokens (`ReportHeading`, `ReportProse`, report font constants).
- **Charts:** Use `CB_REPORT_CHART_WRAP` / chart frame classes so size and padding match Forever.
- **No uncontrolled full-width content** that ignores the document column or breaks pagination.

---

## 7. Cover page rules (Forever parity)

All covers must align with **`PdfAdvisoryCoverPage`**:

- Logo block (standard green lockup path)
- **Title** in ALL CAPS
- **Subtitle** (one short advisory line)
- **Prepared for:** name
- **Generated:** timestamp (audit label)
- Divider / rule
- **Contents** with Section A, B, C, and Appendix entries

**Do not** put on the cover:

- Postal addresses
- Contact details
- Phrases like “client advisory report” as a cover title

Model-specific copy is fine; **structure and visual hierarchy must match** Forever.

TOC entries for each model are defined in `packages/pdf/src/shared/pdfAdvisoryCoverPresets.ts` (`PDF_TOC_*`).

---

## 8. Journey rules

End every report with a clear **next step** in this chain:

- **Forever Income** → *Next: Run Income Engineering to continue your advisory journey.*
- **Income Engineering** → *Next: Run Capital Health to continue your advisory journey.*
- **Capital Health** → *Next: Run Capital Stress to continue your advisory journey.*
- **Capital Stress** → *Next: Run Forever Income to continue your advisory journey* (may mention returning after refreshing the base case — **one** CTA block, no duplicate lines).

Reports must **not** end abruptly after disclosures without this handoff.

---

## 9. Prohibitions

Do **not**:

- Create a new layout or document root pattern for strategic PDFs
- Duplicate header/footer logic in app code
- Wrap charts only in ad hoc divs without the standard what/why/interpretation framing
- Introduce new colour/spacing systems for reports
- Bypass `@cb/pdf/shared` components on the HTML pipeline without an explicit migration plan approved against this standard

---

## 10. Final principle

All reports must read as **one continuous Capital Bridge advisory system**, not four unrelated PDF templates.

---

## 11. Verification (CI / local)

- **Automated standard gate:** `npm run verify:pdf-standard` (runs in GitHub Actions workflow `pdf-standard.yml`).
  - HTML pipeline apps must use `PdfLayout`, `PdfSection`, and `PdfChartBlock` (see script for exact paths).
  - Every `<PdfChartBlock>` must set `title`, `whatThisShows`, `whyThisMatters`, and `interpretation`.
  - Apps must not reference `AdvisoryReportPdfDocumentRoot` directly (use `PdfLayout` from `@cb/pdf/shared`).
  - HTML report surface must not import `PdfHeader` / `PdfFooter` (those are internal to `PdfLayout`).
  - `packages/pdf/src/shared/*.tsx` is allowlisted; adding a new component file requires updating `scripts/enforce-pdf-standard.mjs` and this document.
  - `@react-pdf/renderer` (or `@react-pdf/types`) is **only** allowed in a file that contains this exact first-line waiver (Capital Health until migration):

    `// STANDARD: TEMPORARY WAIVER — migrate to PdfLayout pipeline`

- TypeScript: `npm run typecheck:all` from repo root.
- **Optional PDF smoke:** `npm run docs:sample-pdfs` (requires app dev servers / URLs reachable — not part of the default CI gate).

Any PR that touches report layout, covers, charts, or journey copy should be checked against this document.

---

## 12. Change control

Updates to this standard are **intentional product decisions**, not drive-by refactors. If the standard changes, update this file in the same PR as the implementation.
