#!/usr/bin/env node
/**
 * Enforces pdf/STANDARD.md for advisory PDFs.
 * Run from repo root: node scripts/enforce-pdf-standard.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const WAIVER_LINE =
  "// STANDARD: TEMPORARY WAIVER — migrate to PdfLayout pipeline";

const REACT_PDF_PKG = /@react-pdf\/renderer/;
const REACT_PDF_TYPES = /@react-pdf\/types/;

/** Canonical HTML print report roots — must use PdfLayout + PdfSection. */
const HTML_REPORT_ROOTS = [
  "apps/forever/app/dashboard/report-document/[exportId]/ForeverReportDocumentClient.tsx",
  "apps/incomeengineering/legacy/components/PrintReportView.tsx",
  "apps/capitalstress/legacy/PrintReport.tsx",
];

/** New shared PDF UI must be deliberate — extend the list only with a STANDARD.md update. */
const PDF_SHARED_TSX_ALLOWLIST = new Set([
  "PdfAdvisoryCoverPage.tsx",
  "PdfAdvisorySectionLead.tsx",
  "PdfChartBlock.tsx",
  "PdfFooter.tsx",
  "PdfHeader.tsx",
  "PdfLayout.tsx",
  "PdfLionsVerdictBlock.tsx",
  "PdfSection.tsx",
]);

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function walkTsx(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === ".next") continue;
      walkTsx(full, out);
    } else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

function isUnderHtmlReportSurface(relPath) {
  const n = relPath.split(path.sep).join("/");
  if (n === "apps/incomeengineering/legacy/components/PrintReportView.tsx") return true;
  if (n === "apps/capitalstress/legacy/PrintReport.tsx") return true;
  if (n.startsWith("apps/forever/app/dashboard/report-document/")) return true;
  return false;
}

function fileHasWaiver(content) {
  return content.includes(WAIVER_LINE);
}

function extractPdfChartBlocks(source) {
  const blocks = [];
  const openTag = "<PdfChartBlock";
  const closeTag = "</PdfChartBlock>";
  let searchFrom = 0;
  while (true) {
    const start = source.indexOf(openTag, searchFrom);
    if (start === -1) break;
    let depth = 1;
    let i = start + openTag.length;
    while (i < source.length && depth > 0) {
      const nextOpen = source.indexOf(openTag, i);
      const nextClose = source.indexOf(closeTag, i);
      if (nextClose === -1) {
        throw new Error(`Unclosed ${openTag} starting around offset ${start}`);
      }
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + openTag.length;
      } else {
        depth -= 1;
        if (depth === 0) {
          blocks.push(source.slice(start, nextClose + closeTag.length));
          searchFrom = nextClose + closeTag.length;
          break;
        }
        i = nextClose + closeTag.length;
      }
    }
  }
  return blocks;
}

function chartBlockContract(block, fileLabel, index) {
  const props = ["title", "whatThisShows", "whyThisMatters", "interpretation"];
  const missing = props.filter((p) => !new RegExp(`\\b${p}[\\s\\n]*=`, "m").test(block));
  if (missing.length > 0) {
    return `${fileLabel}: PdfChartBlock #${index + 1} missing required prop(s): ${missing.join(", ")}`;
  }
  return null;
}

function main() {
  const errors = [];

  const allAppFiles = walkTsx(path.join(ROOT, "apps"));

  for (const abs of allAppFiles) {
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    const content = read(abs);

    if (REACT_PDF_PKG.test(content) || REACT_PDF_TYPES.test(content)) {
      if (!fileHasWaiver(content)) {
        errors.push(
          `${rel}: imports @react-pdf/* but is missing the waiver line:\n  ${WAIVER_LINE}`,
        );
      }
    }

    if (/<Document[\s/>]/.test(content) && !fileHasWaiver(content)) {
      errors.push(`${rel}: uses <Document (react-pdf) without STANDARD waiver`);
    }
  }

  for (const rel of HTML_REPORT_ROOTS) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      errors.push(`Expected HTML report root missing: ${rel}`);
      continue;
    }
    const c = read(abs);
    if (!/\bPdfLayout\b/.test(c)) {
      errors.push(`${rel}: must use PdfLayout`);
    }
    if (!/\bPdfSection\b/.test(c)) {
      errors.push(`${rel}: must use PdfSection`);
    }
  }

  // Income Engineering & Stress roots must reference PdfChartBlock (charts framed).
  for (const rel of [
    "apps/incomeengineering/legacy/components/PrintReportView.tsx",
    "apps/capitalstress/legacy/PrintReport.tsx",
  ]) {
    const abs = path.join(ROOT, rel);
    const c = read(abs);
    if (!/\bPdfChartBlock\b/.test(c)) {
      errors.push(`${rel}: must use PdfChartBlock for chart figures`);
    }
  }

  // Forever: module sections hold charts
  const foreverModules = path.join(
    ROOT,
    "apps/forever/app/dashboard/report-document/[exportId]/ForeverReportModuleSections.tsx",
  );
  if (fs.existsSync(foreverModules)) {
    const c = read(foreverModules);
    if (!/\bPdfChartBlock\b/.test(c)) {
      errors.push(
        "apps/forever/app/dashboard/report-document/[exportId]/ForeverReportModuleSections.tsx: must use PdfChartBlock",
      );
    }
  }

  const pdfSharedDir = path.join(ROOT, "packages/pdf/src/shared");
  if (fs.existsSync(pdfSharedDir)) {
    for (const name of fs.readdirSync(pdfSharedDir)) {
      if (!name.endsWith(".tsx")) continue;
      if (!PDF_SHARED_TSX_ALLOWLIST.has(name)) {
        errors.push(
          `packages/pdf/src/shared/${name}: unexpected file — add to PDF_SHARED_TSX_ALLOWLIST in scripts/enforce-pdf-standard.mjs after updating pdf/STANDARD.md`,
        );
      }
    }
  }

  // No direct AdvisoryReportPdfDocumentRoot in apps (use PdfLayout from @cb/pdf/shared).
  for (const abs of allAppFiles) {
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    const content = read(abs);
    if (/\bAdvisoryReportPdfDocumentRoot\b/.test(content)) {
      errors.push(
        `${rel}: do not import or reference AdvisoryReportPdfDocumentRoot in apps — use PdfLayout from @cb/pdf/shared`,
      );
    }
    if (isUnderHtmlReportSurface(rel)) {
      if (/\bPdfHeader\b/.test(content) || /\bPdfFooter\b/.test(content)) {
        errors.push(
          `${rel}: do not use PdfHeader/PdfFooter in app report code — header/footer are composed by PdfLayout only`,
        );
      }
    }
  }

  // Raw Recharts-style <Chart in HTML report surface (not ChartPlotFrame, not PdfChartBlock).
  const rawChartRe = /<Chart(?![\w])/g;
  for (const abs of allAppFiles) {
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    if (!isUnderHtmlReportSurface(rel)) continue;
    const content = read(abs);
    let m;
    while ((m = rawChartRe.exec(content)) !== null) {
      const slice = content.slice(Math.max(0, m.index - 40), m.index + 20);
      if (slice.includes("PdfChartBlock") || slice.includes("ChartPlotFrame")) continue;
      errors.push(
        `${rel}: disallowed raw <Chart — wrap charts in PdfChartBlock and use plot helpers (e.g. ChartPlotFrame).`,
      );
      break;
    }
    rawChartRe.lastIndex = 0;
  }

  // PdfChartBlock contract (apps only; skip component definition).
  const chartConsumers = [
    ...walkTsx(path.join(ROOT, "apps")).filter((f) => f.endsWith(".tsx")),
  ];
  for (const abs of chartConsumers) {
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    const source = read(abs);
    if (!source.includes("<PdfChartBlock")) continue;
    let blocks;
    try {
      blocks = extractPdfChartBlocks(source);
    } catch (e) {
      errors.push(`${rel}: ${e.message}`);
      continue;
    }
    blocks.forEach((block, i) => {
      const err = chartBlockContract(block, rel, i);
      if (err) errors.push(err);
    });
  }

  if (errors.length > 0) {
    console.error("PDF STANDARD enforcement failed:\n");
    for (const e of errors) console.error(`• ${e}\n`);
    console.error(`See ${path.relative(ROOT, path.join(ROOT, "pdf", "STANDARD.md")) || "pdf/STANDARD.md"}`);
    process.exit(1);
  }

  console.log("PDF STANDARD: all checks passed.");
}

main();
