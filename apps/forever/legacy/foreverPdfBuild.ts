/**
 * jsPDF builder for the Forever Income “Strategic Wealth Diagnostic” export.
 * Shared by the app download handler and docs sample PDF script.
 */

import type { LionVerdictClientReport } from "@cb/advisory-graph/lionsVerdict";
import { formatLionPublicStatusLabel } from "@cb/advisory-graph/lionsVerdict";
import { advisoryFrameworkPdfIntro } from "@cb/shared/advisoryFramework";
import { jsPDF } from "jspdf";
import type { CalculationResult } from "./types";
import { ExpenseType } from "./types";
import { formatCurrency } from "./utils/formatters";

export type ForeverPdfCalculation = CalculationResult & { runway: string };

/** Shown once at the end of the PDF (no per-page footers). */
export const FOREVER_PDF_FINAL_DISCLAIMER =
  "This report is a structural projection tool for advisory discussions. Results depend entirely on the assumptions provided and do not guarantee future performance.";

const PAGE_H_MM = 297;
const PAGE_TOP_MM = 16;
/** Stop body content before this Y (mm) so text is not clipped at the page edge. */
const CONTENT_BOTTOM_MM = 274;

function appendLionsVerdictToForeverPdf(
  doc: jsPDF,
  report: LionVerdictClientReport,
  opts: {
    pageWidth: number;
    margin: number;
    maxW: number;
    darkGreen: readonly [number, number, number];
    bodyGray: readonly [number, number, number];
    pos: { y: number };
    newPage: () => void;
  },
) {
  const { pageWidth, margin, maxW, darkGreen, bodyGray, pos, newPage } = opts;

  const ensureSpace = (h: number) => {
    if (pos.y + h > CONTENT_BOTTOM_MM) {
      newPage();
    }
  };

  /** U+2212 minus makes jsPDF emit UTF-16-style strings → huge per-glyph spacing in standard fonts. */
  const pdfWinAnsiSafe = (s: string) => s.replace(/\u2212/g, "-");

  const bodyPara = (text: string, size = 9) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...bodyGray);
    const lines = doc.splitTextToSize(pdfWinAnsiSafe(text), maxW);
    const lineStep = size * 0.48;
    for (const line of lines) {
      ensureSpace(lineStep);
      doc.text(line, margin, pos.y, { align: "left" });
      pos.y += lineStep;
    }
    pos.y += 2;
  };

  const sectionTitle = (t: string) => {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...darkGreen);
    doc.text(t, margin, pos.y);
    pos.y += 8;
  };

  // Lion section always starts on a fresh page
  newPage();

  ensureSpace(10);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...bodyGray);
  doc.text("Advisory closing for Step 1 — Can your money last?", margin, pos.y);
  pos.y += 6;

  ensureSpace(12);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...darkGreen);
  doc.text("THE LION'S VERDICT", margin, pos.y);
  pos.y += 10;

  ensureSpace(12);
  const scoreBaseline = pos.y;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkGreen);
  const wLabel = doc.getTextWidth("Verdict's Score: ");
  doc.text("Verdict's Score:", margin, scoreBaseline);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(String(report.verdict.score), margin + wLabel, scoreBaseline);
  const wScore = doc.getTextWidth(String(report.verdict.score));
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(" out of 100", margin + wLabel + wScore, scoreBaseline);
  pos.y = scoreBaseline + 9;

  ensureSpace(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...darkGreen);
  doc.text(formatLionPublicStatusLabel(report.verdict.status), margin, pos.y);
  pos.y += 10;

  bodyPara(report.verdict.summary, 10);

  sectionTitle("Strengths");
  report.strengths.forEach((s) => bodyPara(`• ${s}`, 9));
  sectionTitle("Risks");
  report.risks.forEach((s) => bodyPara(`• ${s}`, 9));

  sectionTitle("Income & capital gap");
  bodyPara(report.goal_gap.summary, 9);
  sectionTitle("Progress to forever capital");
  bodyPara(report.progress.summary, 9);

  sectionTitle("Strategic options");
  report.strategic_options.forEach((o) =>
    bodyPara(`${o.type}: ${o.action}. ${o.impact} Trade-off: ${o.trade_off}.`, 9),
  );

  sectionTitle("Capital unlock");
  bodyPara(`${report.capital_unlock.decision}. ${report.capital_unlock.summary}`, 9);

  sectionTitle("Scenario actions");
  bodyPara(`Strong markets: ${report.scenario_actions.bull}`, 9);
  bodyPara(`Base case: ${report.scenario_actions.base}`, 9);
  bodyPara(`Weak markets: ${report.scenario_actions.bear}`, 9);

  sectionTitle("Priority actions");
  report.priority_actions.forEach((p) => bodyPara(`• ${p}`, 9));
  bodyPara(`If you do nothing: ${report.do_nothing_outcome}`, 9);
  bodyPara(report.closing_line, 9);
}

export interface ForeverStrategicWealthPdfContext {
  currency: string;
  expenseType: ExpenseType;
  expense: number;
  familyContribution: number;
  expectedReturn: number;
  inflationRate: number;
  cash: number;
  investments: number;
  realEstate: number;
  propertyLoanCost: number;
  propertyTimeHorizon: number;
  results: ForeverPdfCalculation;
  foreverLionReport: LionVerdictClientReport;
  includeLionsVerdict: boolean;
  /** Rasterized PNG data URLs from green brand SVGs (lion + wordmark). */
  logoLionPngDataUrl: string | null;
  logoWordmarkPngDataUrl: string | null;
}

/**
 * Builds the multi-page Forever diagnostic PDF. Caller may `doc.save()` or `doc.output("arraybuffer")`.
 */
export function buildForeverStrategicWealthPdf(ctx: ForeverStrategicWealthPdfContext): jsPDF {
  const {
    currency,
    expenseType,
    expense,
    familyContribution,
    expectedReturn,
    inflationRate,
    cash,
    investments,
    realEstate,
    propertyLoanCost,
    propertyTimeHorizon,
    results,
    foreverLionReport,
    includeLionsVerdict,
    logoLionPngDataUrl,
    logoWordmarkPngDataUrl,
  } = ctx;

  const doc = new jsPDF("p", "mm", "a4");
  const darkGreen = [13, 58, 29] as const;
  const lightGreen = [134, 239, 172] as const;
  const bodyGray = [60, 60, 60] as const;

  const pageWidth = 210;
  const margin = 20;
  const sectionGap = 6;
  const maxW = pageWidth - 2 * margin;

  const pos = { y: PAGE_TOP_MM };

  const newPage = () => {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, PAGE_H_MM, "F");
    pos.y = PAGE_TOP_MM;
  };

  const ensureSpace = (h: number) => {
    if (pos.y + h > CONTENT_BOTTOM_MM) {
      newPage();
    }
  };

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, PAGE_H_MM, "F");

  /** Matches `CapitalBridgeLogo_Green.svg` viewBox width / height so the raster is not cropped when scaled. */
  const WORDMARK_VIEWBOX_RATIO = 568.703125 / 114.5;
  const lionMm = 11;
  const wordH = 14;
  const wordW = wordH * WORDMARK_VIEWBOX_RATIO;
  const logoRowTop = pos.y;
  if (logoLionPngDataUrl) {
    try {
      doc.addImage(logoLionPngDataUrl, "PNG", margin, logoRowTop, lionMm, lionMm);
    } catch {
      /* optional */
    }
  }
  if (logoWordmarkPngDataUrl) {
    try {
      doc.addImage(logoWordmarkPngDataUrl, "PNG", margin + lionMm + 3, logoRowTop, wordW, wordH);
    } catch {
      /* optional */
    }
  }
  const hadBrandRow = !!(logoLionPngDataUrl || logoWordmarkPngDataUrl);
  pos.y = logoRowTop + (hadBrandRow ? Math.max(lionMm, wordH) : 2) + 5;

  const baseAnnualLifestyle = expenseType === ExpenseType.ANNUAL ? expense : expense * 12;

  const drawSectionDivider = () => {
    ensureSpace(sectionGap + 1);
    doc.setDrawColor(...lightGreen);
    doc.setLineWidth(0.15);
    doc.line(margin, pos.y, pageWidth - margin, pos.y);
    pos.y += sectionGap;
  };

  const headerLeft = margin;
  ensureSpace(22);
  doc.setTextColor(...darkGreen);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Forever Income Model", headerLeft, pos.y);
  pos.y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...bodyGray);
  doc.text("Capital Sustainability Diagnostic", headerLeft, pos.y);
  doc.setFontSize(8);
  doc.text(
    `Report Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    pageWidth - margin,
    pos.y - 4,
    { align: "right" },
  );
  pos.y += 10;
  drawSectionDivider();

  const pdfIntro = advisoryFrameworkPdfIntro("sustainability_forever");
  ensureSpace(28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 120, 30);
  doc.text(pdfIntro.eyebrow.toUpperCase(), margin, pos.y);
  pos.y += 4;
  doc.setFontSize(10);
  doc.setTextColor(...darkGreen);
  doc.text(pdfIntro.title, margin, pos.y);
  pos.y += 5;
  doc.setFontSize(9);
  doc.text(pdfIntro.youAreHere, margin, pos.y);
  pos.y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...bodyGray);
  for (const line of doc.splitTextToSize(pdfIntro.body, maxW)) {
    ensureSpace(4.2);
    doc.text(line, margin, pos.y);
    pos.y += 4.2;
  }
  pos.y += sectionGap;
  drawSectionDivider();

  const snapshotH = 36;
  ensureSpace(snapshotH + sectionGap);
  const snapTop = pos.y;
  doc.setDrawColor(...lightGreen);
  doc.setLineWidth(0.3);
  doc.setFillColor(245, 252, 248);
  doc.rect(margin, snapTop, pageWidth - 2 * margin, snapshotH, "FD");
  doc.setTextColor(...darkGreen);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Client Financial Snapshot", margin + 4, snapTop + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...bodyGray);
  doc.text(`Annual Lifestyle Spending: ${formatCurrency(baseAnnualLifestyle, currency)}`, margin + 4, snapTop + 16);
  doc.text(`Loan Cost / Interest Rate: ${propertyLoanCost}%`, margin + 4, snapTop + 22);
  doc.text(`Investment Return Assumption: ${expectedReturn}%`, margin + 105, snapTop + 16);
  doc.text(`Inflation Assumption: ${inflationRate}%`, margin + 105, snapTop + 22);
  doc.text(`Total Capital Available: ${formatCurrency(results.currentAssets, currency)}`, margin + 105, snapTop + 28);
  pos.y = snapTop + snapshotH + sectionGap;
  drawSectionDivider();

  ensureSpace(14);
  doc.setFontSize(8);
  doc.setTextColor(...bodyGray);
  doc.text("Scenario Context", margin, pos.y);
  doc.text(
    `Base Scenario Projection — Return Assumption: ${expectedReturn}% | Inflation: ${inflationRate}%`,
    margin,
    pos.y + 5,
  );
  pos.y += 12;
  drawSectionDivider();

  const execH = 48;
  ensureSpace(execH + sectionGap);
  const execTop = pos.y;
  doc.setDrawColor(...lightGreen);
  doc.setLineWidth(0.2);
  doc.setFillColor(248, 252, 250);
  doc.rect(margin, execTop, pageWidth - 2 * margin, execH, "FD");
  doc.setTextColor(...darkGreen);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Executive Summary", margin + 4, execTop + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...bodyGray);
  const summaryX1 = margin + 4;
  const summaryX2 = margin + 105;
  doc.text("Net Strategic Withdrawal (Annual):", summaryX1, execTop + 18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGreen);
  doc.text(formatCurrency(results.annualExpense, currency), summaryX1, execTop + 24);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...bodyGray);
  doc.text("Capital Sustainability Horizon:", summaryX1, execTop + 34);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGreen);
  doc.text(results.runway, summaryX1, execTop + 40);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...bodyGray);
  doc.text("Total Capital Available:", summaryX2, execTop + 18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGreen);
  doc.text(formatCurrency(results.currentAssets, currency), summaryX2, execTop + 24);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...bodyGray);
  doc.text("Forever Capital Target:", summaryX2, execTop + 34);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGreen);
  doc.text(results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : "—", summaryX2, execTop + 40);
  pos.y = execTop + execH + sectionGap;
  drawSectionDivider();

  ensureSpace(28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...darkGreen);
  doc.text("Model Assumptions", margin, pos.y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...bodyGray);
  doc.text(`Strategic Return Assumption: ${expectedReturn}%`, margin, pos.y + 7);
  doc.text(`Long-Term Inflation Assumption: ${inflationRate}%`, margin, pos.y + 13);
  doc.text("Withdrawal Model: Inflation Adjusted", margin, pos.y + 19);
  pos.y += 26;
  drawSectionDivider();

  const metricsBoxW = pageWidth - 2 * margin;
  const metricsH = 34;
  ensureSpace(metricsH + sectionGap);
  const metTop = pos.y;
  doc.setDrawColor(...lightGreen);
  doc.setLineWidth(0.2);
  doc.setFillColor(248, 252, 250);
  doc.rect(margin, metTop, metricsBoxW, metricsH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...darkGreen);
  doc.text(
    "Capital Bridge Progress (Current Capital vs Forever Capital Target):",
    margin + 4,
    metTop + 8,
    { maxWidth: metricsBoxW - 28 },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${results.progressPercent.toFixed(1)}%`, margin + metricsBoxW - 8, metTop + 8, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    "Capital Efficiency Ratio (Current Capital ÷ Forever Capital Target):",
    margin + 4,
    metTop + 22,
    { maxWidth: metricsBoxW - 28, align: "left" },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${results.progressPercent.toFixed(1)}%`, margin + metricsBoxW - 8, metTop + 22, { align: "right" });
  pos.y = metTop + metricsH + sectionGap;

  // —— Page flow: Annual Income Requirement (no forced page break) ——
  ensureSpace(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Annual Income Requirement", margin, pos.y);
  doc.setDrawColor(...lightGreen);
  doc.setLineWidth(0.2);
  doc.line(margin, pos.y + 2, margin + 60, pos.y + 2);
  pos.y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  doc.text(`Base Lifestyle Expense: ${formatCurrency(baseAnnualLifestyle, currency)}/year`, margin, pos.y);
  pos.y += 7;
  doc.text(`Property Debt Service: ${formatCurrency(results.propertyMonthlyRepayment * 12, currency)}/year`, margin, pos.y);
  pos.y += 7;
  doc.text(`Family Income Offset: -${formatCurrency(results.familyContribution * 12, currency)}/year`, margin, pos.y);
  pos.y += 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGreen);
  doc.text(`Net Strategic Withdrawal: ${formatCurrency(results.annualExpense, currency)}/year`, margin, pos.y);
  doc.setFont("helvetica", "normal");
  pos.y += 20;

  ensureSpace(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Current Capital Position", margin, pos.y);
  doc.setDrawColor(...lightGreen);
  doc.line(margin, pos.y + 2, margin + 65, pos.y + 2);
  pos.y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  doc.text(`Cash Reserves: ${formatCurrency(cash, currency)}`, margin, pos.y);
  pos.y += 7;
  doc.text(`Investment Portfolio: ${formatCurrency(investments, currency)}`, margin, pos.y);
  pos.y += 7;
  doc.text(`Real Estate Unlockable Value: ${formatCurrency(realEstate, currency)}`, margin, pos.y);
  pos.y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkGreen);
  doc.text(`Total Capital Available: ${formatCurrency(results.currentAssets, currency)}`, margin, pos.y);
  doc.setFont("helvetica", "normal");
  pos.y += 22;

  ensureSpace(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Capital Gap to Sustainability", margin, pos.y);
  doc.setDrawColor(...lightGreen);
  doc.line(margin, pos.y + 2, margin + 75, pos.y + 2);
  pos.y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  doc.text(
    `Forever Capital Target: ${results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : "—"}`,
    margin,
    pos.y,
  );
  pos.y += 7;
  doc.text(`Total Capital Available: ${formatCurrency(results.currentAssets, currency)}`, margin, pos.y);
  pos.y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkGreen);
  doc.text(`Capital Gap: ${results.isSustainable ? formatCurrency(results.gap, currency) : "—"}`, margin, pos.y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  pos.y += 22;

  ensureSpace(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Capital Sustainability Horizon", margin, pos.y);
  doc.setDrawColor(...lightGreen);
  doc.line(margin, pos.y + 2, margin + 85, pos.y + 2);
  pos.y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  doc.text(`Estimated years current capital can sustain withdrawals: ${results.runway}`, margin, pos.y);
  pos.y += 16;

  ensureSpace(16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Financial Interpretation", margin, pos.y);
  doc.setDrawColor(...lightGreen);
  doc.line(margin, pos.y + 2, margin + 55, pos.y + 2);
  pos.y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  const runwayYears = results.runway === "Perpetual" ? "indefinitely" : `approximately ${results.runway} before depletion`;
  const capitalBase = results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : "—";
  const interp1 = `Based on the current capital structure and withdrawal level, the portfolio is projected to sustain income for ${runwayYears}.`;
  const interp2 = `Achieving long-term financial sustainability would require an estimated capital base of ${capitalBase}.`;
  for (const line of doc.splitTextToSize(interp1, maxW)) {
    ensureSpace(5);
    doc.text(line, margin, pos.y);
    pos.y += 5;
  }
  pos.y += 2;
  for (const line of doc.splitTextToSize(interp2, maxW)) {
    ensureSpace(5);
    doc.text(line, margin, pos.y);
    pos.y += 5;
  }
  pos.y += 10;

  ensureSpace(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Discussion Topics with Your Financial Advisor", margin, pos.y);
  doc.setDrawColor(...lightGreen);
  doc.line(margin, pos.y + 2, margin + 95, pos.y + 2);
  pos.y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  for (const t of [
    "Capital growth strategy",
    "Income sustainability planning",
    "Property equity optimization",
    "Withdrawal efficiency",
  ]) {
    ensureSpace(7);
    doc.text(`• ${t}`, margin, pos.y);
    pos.y += 7;
  }
  pos.y += 8;

  ensureSpace(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Methodology Note", margin, pos.y);
  doc.setDrawColor(...lightGreen);
  doc.line(margin, pos.y + 2, margin + 45, pos.y + 2);
  pos.y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...bodyGray);
  const meth1 =
    "The Capital Bridge model evaluates the sustainability of capital reserves relative to lifestyle spending, expected investment returns, and inflation assumptions.";
  const meth2 =
    "The analysis estimates the capital required to support long-term income sustainability without depletion using long-term withdrawal modeling.";
  for (const line of doc.splitTextToSize(meth1, maxW)) {
    ensureSpace(4.5);
    doc.text(line, margin, pos.y);
    pos.y += 4.5;
  }
  pos.y += 2;
  for (const line of doc.splitTextToSize(meth2, maxW)) {
    ensureSpace(4.5);
    doc.text(line, margin, pos.y);
    pos.y += 4.5;
  }
  pos.y += 10;

  ensureSpace(10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...bodyGray);
  for (const line of doc.splitTextToSize(
    "This diagnostic is designed to support financial planning discussions with qualified financial professionals.",
    maxW,
  )) {
    ensureSpace(4.5);
    doc.text(line, margin, pos.y);
    pos.y += 4.5;
  }
  pos.y += 6;

  if (includeLionsVerdict) {
    appendLionsVerdictToForeverPdf(doc, foreverLionReport, {
      pageWidth,
      margin,
      maxW,
      darkGreen,
      bodyGray,
      pos,
      newPage,
    });
  }

  pos.y += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  const discLines = doc.splitTextToSize(FOREVER_PDF_FINAL_DISCLAIMER, maxW);
  const discBlock = discLines.length * 4 + 4;
  if (pos.y + discBlock > CONTENT_BOTTOM_MM) {
    newPage();
  }
  for (const line of discLines) {
    ensureSpace(4.2);
    doc.text(line, margin, pos.y);
    pos.y += 4.2;
  }

  return doc;
}
