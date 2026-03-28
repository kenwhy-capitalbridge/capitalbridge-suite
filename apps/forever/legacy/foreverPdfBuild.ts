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

function appendLionsVerdictPageToForeverPdf(
  doc: jsPDF,
  report: LionVerdictClientReport,
  opts: {
    pageWidth: number;
    margin: number;
    darkGreen: readonly [number, number, number];
    bodyGray: readonly [number, number, number];
    addFooter: (d: jsPDF) => void;
  },
) {
  const { pageWidth, margin, darkGreen, bodyGray, addFooter } = opts;
  const maxW = pageWidth - 2 * margin;
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 297, "F");
  let y = 22;

  const newPageIfNeeded = () => {
    if (y > 258) {
      addFooter(doc);
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, 297, "F");
      y = 22;
    }
  };

  const sectionTitle = (t: string) => {
    newPageIfNeeded();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...darkGreen);
    doc.text(t, margin, y);
    y += 8;
  };

  const bodyPara = (text: string, size = 9) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...bodyGray);
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      newPageIfNeeded();
      doc.text(line, margin, y);
      y += size * 0.45;
    }
    y += 3;
  };

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...bodyGray);
  doc.text("Advisory closing for Step 1 — Can your money last?", margin, y);
  y += 6;
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...darkGreen);
  doc.text("THE LION'S VERDICT", margin, y);
  y += 10;
  doc.setFontSize(20);
  doc.text(String(report.verdict.score), margin, y);
  doc.setFontSize(10);
  doc.text(formatLionPublicStatusLabel(report.verdict.status), margin + 28, y);
  y += 10;
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

  addFooter(doc);
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
  /** PNG data URL from fetch (browser) or file (Node), or null to skip logo image */
  logoDataUrl: string | null;
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
    logoDataUrl,
  } = ctx;

  const doc = new jsPDF("p", "mm", "a4");
  const darkGreen = [13, 58, 29] as const;
  const lightGreen = [134, 239, 172] as const;
  const bodyGray = [60, 60, 60] as const;

  const addReportFooter = (d: jsPDF) => {
    d.setFontSize(7);
    d.setTextColor(100, 100, 100);
    d.setFont("helvetica", "normal");
    d.text("Capital Bridge · Personal planning report — not investment advice", 105, 288, { align: "center" });
    d.text("Confidential · For discussion with your financial adviser", 105, 293, { align: "center" });
  };

  const pageWidth = 210;
  const margin = 20;
  const sectionGap = 6;
  let y = 18;

  const baseAnnualLifestyle = expenseType === ExpenseType.ANNUAL ? expense : expense * 12;

  const drawSectionDivider = () => {
    doc.setDrawColor(...lightGreen);
    doc.setLineWidth(0.15);
    doc.line(margin, y, pageWidth - margin, y);
    y += sectionGap;
  };

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 297, "F");

  const logoW = 35;
  const logoH = 14;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", margin, y, logoW, logoH);
      y += logoH + 4;
    } catch {
      y += 2;
    }
  } else {
    y += 2;
  }

  const headerLeft = margin;
  doc.setTextColor(...darkGreen);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("CAPITAL BRIDGE", headerLeft, y + 5);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Forever Income Model", headerLeft, y + 4);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...bodyGray);
  doc.text("Capital Sustainability Diagnostic", headerLeft, y + 3);
  doc.setFontSize(8);
  doc.setTextColor(...bodyGray);
  doc.text(
    `Report Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    pageWidth - margin,
    y - 4,
    { align: "right" },
  );
  y += 10;
  drawSectionDivider();

  const pdfIntro = advisoryFrameworkPdfIntro("sustainability_forever");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 120, 30);
  doc.text(pdfIntro.eyebrow.toUpperCase(), margin, y);
  y += 4;
  doc.setFontSize(10);
  doc.setTextColor(...darkGreen);
  doc.text(pdfIntro.title, margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.text(pdfIntro.youAreHere, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...bodyGray);
  for (const line of doc.splitTextToSize(pdfIntro.body, pageWidth - 2 * margin)) {
    doc.text(line, margin, y);
    y += 4.1;
  }
  y += sectionGap;
  drawSectionDivider();

  doc.setDrawColor(...lightGreen);
  doc.setLineWidth(0.3);
  doc.setFillColor(245, 252, 248);
  doc.rect(margin, y, pageWidth - 2 * margin, 36, "FD");
  doc.setTextColor(...darkGreen);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Client Financial Snapshot", margin + 4, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...bodyGray);
  doc.text(`Annual Lifestyle Spending: ${formatCurrency(baseAnnualLifestyle, currency)}`, margin + 4, y + 16);
  doc.text(`Loan Cost / Interest Rate: ${propertyLoanCost}%`, margin + 4, y + 22);
  doc.text(`Investment Return Assumption: ${expectedReturn}%`, margin + 105, y + 16);
  doc.text(`Inflation Assumption: ${inflationRate}%`, margin + 105, y + 22);
  doc.text(`Total Capital Available: ${formatCurrency(results.currentAssets, currency)}`, margin + 105, y + 28);
  y += 40;
  drawSectionDivider();

  doc.setFontSize(8);
  doc.setTextColor(...bodyGray);
  doc.text("Scenario Context", margin, y);
  doc.text(
    `Base Scenario Projection — Return Assumption: ${expectedReturn}% | Inflation: ${inflationRate}%`,
    margin,
    y + 5,
  );
  y += 12;
  drawSectionDivider();

  doc.setDrawColor(...lightGreen);
  doc.setLineWidth(0.2);
  doc.setFillColor(248, 252, 250);
  doc.rect(margin, y, pageWidth - 2 * margin, 48, "FD");
  doc.setTextColor(...darkGreen);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Executive Summary", margin + 4, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...bodyGray);
  const summaryX1 = margin + 4;
  const summaryX2 = margin + 105;
  doc.text("Net Strategic Withdrawal (Annual):", summaryX1, y + 18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGreen);
  doc.text(formatCurrency(results.annualExpense, currency), summaryX1, y + 24);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...bodyGray);
  doc.text("Capital Sustainability Horizon:", summaryX1, y + 34);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGreen);
  doc.text(results.runway, summaryX1, y + 40);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...bodyGray);
  doc.text("Total Capital Available:", summaryX2, y + 18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGreen);
  doc.text(formatCurrency(results.currentAssets, currency), summaryX2, y + 24);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...bodyGray);
  doc.text("Forever Capital Target:", summaryX2, y + 34);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGreen);
  doc.text(results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : "—", summaryX2, y + 40);
  y += 54;
  drawSectionDivider();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...darkGreen);
  doc.text("Model Assumptions", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...bodyGray);
  doc.text(`Strategic Return Assumption: ${expectedReturn}%`, margin, y + 7);
  doc.text(`Long-Term Inflation Assumption: ${inflationRate}%`, margin, y + 13);
  doc.text("Withdrawal Model: Inflation Adjusted", margin, y + 19);
  y += 26;
  drawSectionDivider();

  const metricsBoxW = pageWidth - 2 * margin;
  doc.setDrawColor(...lightGreen);
  doc.setLineWidth(0.2);
  doc.setFillColor(248, 252, 250);
  doc.rect(margin, y, metricsBoxW, 34, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...darkGreen);
  doc.text(
    "Capital Bridge Progress (Current Capital vs Forever Capital Target):",
    margin + 4,
    y + 8,
    { maxWidth: metricsBoxW - 28 },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${results.progressPercent.toFixed(1)}%`, margin + metricsBoxW - 8, y + 8, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    "Capital Efficiency Ratio (Current Capital ÷ Forever Capital Target):",
    margin + 4,
    y + 22,
    { maxWidth: metricsBoxW - 28 },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${results.progressPercent.toFixed(1)}%`, margin + metricsBoxW - 8, y + 22, { align: "right" });
  y += 40;

  addReportFooter(doc);
  doc.addPage();

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 297, "F");
  y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Annual Income Requirement", margin, y);
  doc.setDrawColor(...lightGreen);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 2, margin + 60, y + 2);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  doc.text(`Base Lifestyle Expense: ${formatCurrency(baseAnnualLifestyle, currency)}/year`, margin, y);
  y += 7;
  doc.text(`Property Debt Service: ${formatCurrency(results.propertyMonthlyRepayment * 12, currency)}/year`, margin, y);
  y += 7;
  doc.text(`Family Income Offset: -${formatCurrency(results.familyContribution * 12, currency)}/year`, margin, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGreen);
  doc.text(`Net Strategic Withdrawal: ${formatCurrency(results.annualExpense, currency)}/year`, margin, y);
  doc.setFont("helvetica", "normal");
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Current Capital Position", margin, y);
  doc.setDrawColor(...lightGreen);
  doc.line(margin, y + 2, margin + 65, y + 2);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  doc.text(`Cash Reserves: ${formatCurrency(cash, currency)}`, margin, y);
  y += 7;
  doc.text(`Investment Portfolio: ${formatCurrency(investments, currency)}`, margin, y);
  y += 7;
  doc.text(`Real Estate Unlockable Value: ${formatCurrency(realEstate, currency)}`, margin, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkGreen);
  doc.text(`Total Capital Available: ${formatCurrency(results.currentAssets, currency)}`, margin, y);
  doc.setFont("helvetica", "normal");
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Capital Gap to Sustainability", margin, y);
  doc.setDrawColor(...lightGreen);
  doc.line(margin, y + 2, margin + 75, y + 2);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  doc.text(
    `Forever Capital Target: ${results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : "—"}`,
    margin,
    y,
  );
  y += 7;
  doc.text(`Total Capital Available: ${formatCurrency(results.currentAssets, currency)}`, margin, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkGreen);
  doc.text(`Capital Gap: ${results.isSustainable ? formatCurrency(results.gap, currency) : "—"}`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Capital Sustainability Horizon", margin, y);
  doc.setDrawColor(...lightGreen);
  doc.line(margin, y + 2, margin + 85, y + 2);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  doc.text(`Estimated years current capital can sustain withdrawals: ${results.runway}`, margin, y);

  addReportFooter(doc);
  doc.addPage();

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 297, "F");
  y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Financial Interpretation", margin, y);
  doc.setDrawColor(...lightGreen);
  doc.line(margin, y + 2, margin + 55, y + 2);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  const runwayYears = results.runway === "Perpetual" ? "indefinitely" : `approximately ${results.runway} before depletion`;
  const capitalBase = results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : "—";
  doc.text(
    `Based on the current capital structure and withdrawal level, the portfolio is projected to sustain income for ${runwayYears}.`,
    margin,
    y,
    { maxWidth: pageWidth - 2 * margin },
  );
  y += 10;
  doc.text(
    `Achieving long-term financial sustainability would require an estimated capital base of ${capitalBase}.`,
    margin,
    y,
    { maxWidth: pageWidth - 2 * margin },
  );
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Discussion Topics with Your Financial Advisor", margin, y);
  doc.setDrawColor(...lightGreen);
  doc.line(margin, y + 2, margin + 95, y + 2);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...bodyGray);
  const topics = [
    "Capital growth strategy",
    "Income sustainability planning",
    "Property equity optimization",
    "Withdrawal efficiency",
  ];
  topics.forEach((t) => {
    doc.text(`• ${t}`, margin, y);
    y += 7;
  });
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text("Methodology Note", margin, y);
  doc.setDrawColor(...lightGreen);
  doc.line(margin, y + 2, margin + 45, y + 2);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...bodyGray);
  doc.text(
    "The Capital Bridge model evaluates the sustainability of capital reserves relative to lifestyle spending, expected investment returns, and inflation assumptions.",
    margin,
    y,
    { maxWidth: pageWidth - 2 * margin },
  );
  y += 8;
  doc.text(
    "The analysis estimates the capital required to support long-term income sustainability without depletion using long-term withdrawal modeling.",
    margin,
    y,
    { maxWidth: pageWidth - 2 * margin },
  );
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...bodyGray);
  doc.text(
    "This diagnostic is designed to support financial planning discussions with qualified financial professionals.",
    margin,
    y,
    { maxWidth: pageWidth - 2 * margin },
  );

  addReportFooter(doc);

  if (includeLionsVerdict) {
    appendLionsVerdictPageToForeverPdf(doc, foreverLionReport, {
      pageWidth,
      margin,
      darkGreen,
      bodyGray,
      addFooter: addReportFooter,
    });
  }

  return doc;
}
