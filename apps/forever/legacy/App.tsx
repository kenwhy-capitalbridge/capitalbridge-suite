//Forever Income Model
"use client";

import React, { useEffect, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Download,
  Info,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Clock,
  Landmark,
  ArrowRight,
  CheckCircle2,
  Wallet,
  BarChart3,
  Home,
  Loader2,
  Coins,
  Users,
  Timer,
} from "lucide-react";
import SliderInput from "./components/SliderInput";
import { ExpenseType, CalculationResult } from "./types";
import { formatCurrency, formatPercent } from "./utils/formatters";
import { advisoryFrameworkPdfIntro } from "@cb/shared/advisoryFramework";
import { jsPDF } from "jspdf";
import type { LionVerdictClientReport } from "@cb/advisory-graph/lionsVerdict";
import {
  buildLionVerdictClientReportFromForever,
  formatLionPublicStatusLabel,
  parseForeverRunway,
} from "@cb/advisory-graph/lionsVerdict";
import { LionVerdictActive } from "../../../packages/lion-verdict/LionVerdictActive";
import { canAccessLion, type LionAccessUser } from "../../../packages/lion-verdict/access";
import type { Tier } from "../../../packages/lion-verdict/copy";
import type { GetLionVerdictOutput } from "../../../packages/lion-verdict/getLionVerdict";
import "./index.css";

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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...darkGreen);
  doc.text("Lion's Verdict", margin, y);
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

const DEFAULT_LION_ACCESS_USER: LionAccessUser = { isPaid: true, hasActiveTrialUpgrade: false };

type ForeverAppProps = {
  lionAccessUser?: LionAccessUser;
};

/** Imperative API for Supabase save/restore (AdvisoryShell). */
export type ForeverAppHandle = {
  getInputs: () => Record<string, unknown>;
  getResults: () => Record<string, unknown>;
  applyInputs: (inputs: Record<string, unknown>) => void;
};

// Updated currencies as per the latest request
const currencies = ["RM", "SGD", "USD", "THB", "AUD", "PHP", "RMB", "HKD"];

const ForeverApp = forwardRef<ForeverAppHandle, ForeverAppProps>(function ForeverApp(props, ref) {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";

  const lionAccessUser = props.lionAccessUser ?? DEFAULT_LION_ACCESS_USER;
  const lionAccessEnabled = canAccessLion(lionAccessUser);

  const isAllowed =
    hostname === "" ||
    hostname === "localhost" ||
    hostname.endsWith(".vercel.app") ||
    hostname.endsWith(".thecapitalbridge.com");

  if (!isAllowed) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        Unauthorised domain
      </div>
    );
  }

  // Global Currency State
  const [currency, setCurrency] = useState<string>('RM');
  
  // Expense & Market States
  const [expense, setExpense] = useState<number>(10000);
  const [expenseType, setExpenseType] = useState<ExpenseType>(ExpenseType.MONTHLY);
  const [familyContribution, setFamilyContribution] = useState<number>(0);
  const [expectedReturn, setExpectedReturn] = useState<number>(7);
  const [inflationRate, setInflationRate] = useState<number>(2);
  const [isGenerating, setIsGenerating] = useState(false);

  // Granular Asset States
  const [cash, setCash] = useState<number>(20000);
  const [investments, setInvestments] = useState<number>(250000);
  const [realEstate, setRealEstate] = useState<number>(500000);
  
  // Property Specific Sub-states
  const [propertyLoanCost, setPropertyLoanCost] = useState<number>(3.55);
  const [propertyTimeHorizon, setPropertyTimeHorizon] = useState<number>(20);

  // Dynamic Slider Configs based on Currency Groups
  const sliderConfigs = useMemo(() => {
    const isGroup1 = ['RM', 'SGD', 'USD', 'AUD'].includes(currency);
    const isAnnual = expenseType === ExpenseType.ANNUAL;
    const mult = isAnnual ? 12 : 1;
    
    if (isGroup1) {
      return {
        lifestyle: { max: 200000 * mult, step: 5000 * mult },
        cash: { max: 5000000, step: 25000 },
        investments: { max: 5000000, step: 25000 },
        property: { max: 5000000, step: 25000 },
        contribution: { max: 100000 * mult, step: 1000 * mult }
      };
    } else {
      return {
        lifestyle: { max: 500000 * mult, step: 10000 * mult },
        cash: { max: 30000000, step: 50000 },
        investments: { max: 30000000, step: 30000 },
        property: { max: 30000000, step: 50000 },
        contribution: { max: 500000 * mult, step: 5000 * mult }
      };
    }
  }, [currency, expenseType]);

  const results = useMemo((): CalculationResult & { runway: string } => {
    const baseAnnualExpense = expenseType === ExpenseType.MONTHLY ? expense * 12 : expense;
    
    let propertyMonthlyRepayment = 0;
    if (realEstate > 0 && propertyTimeHorizon > 0) {
      const annualRate = propertyLoanCost / 100;
      const monthlyRate = annualRate / 12;
      const totalMonths = propertyTimeHorizon * 12;
      
      if (monthlyRate === 0) {
        propertyMonthlyRepayment = realEstate / totalMonths;
      } else {
        propertyMonthlyRepayment = (realEstate * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths));
      }
    }

    const annualContribution = expenseType === ExpenseType.MONTHLY ? familyContribution * 12 : familyContribution;
    const totalGrossAnnualExpense = baseAnnualExpense + (propertyMonthlyRepayment * 12);
    const netAnnualExpense = Math.max(0, totalGrossAnnualExpense - annualContribution);
    const netMonthlyExpense = netAnnualExpense / 12;

    const realReturnRateDecimal = (expectedReturn - inflationRate) / 100;
    const isSustainable = realReturnRateDecimal > 0;
    const capitalNeeded = isSustainable ? netAnnualExpense / realReturnRateDecimal : (netAnnualExpense > 0 ? Infinity : 0);
    
    const totalAssets = cash + investments + realEstate;
    const gap = isSustainable ? Math.max(0, capitalNeeded - totalAssets) : 0;
    const progressPercent = isSustainable ? (capitalNeeded === 0 ? 100 : Math.min(100, (totalAssets / capitalNeeded) * 100)) : 0;

    // Calculate Time Horizon / Runway (Standard financial engineering formula for capital depletion)
    let runway = "0 years";
    if (netAnnualExpense <= 0) {
      runway = "Perpetual";
    } else {
      const C = totalAssets;
      const W = netAnnualExpense;
      const r = realReturnRateDecimal;

      if (r > 0) {
        if (C * r >= W) {
          runway = "Perpetual";
        } else {
          // n = ln( W / (W - C*r) ) / ln( 1 + r )
          const years = Math.log(W / (W - C * r)) / Math.log(1 + r);
          runway = years.toFixed(1) + " years";
        }
      } else if (r === 0) {
        runway = (C / W).toFixed(1) + " years";
      } else {
        // Handle negative real return rate
        const years = Math.log(W / (W - C * r)) / Math.log(1 + r);
        runway = !isNaN(years) ? years.toFixed(1) + " years" : "0 years";
      }
    }

    return {
      monthlyExpense: netMonthlyExpense,
      annualExpense: netAnnualExpense,
      propertyMonthlyRepayment,
      familyContribution: annualContribution / 12,
      expectedReturn,
      inflationRate,
      realReturnRate: realReturnRateDecimal * 100,
      capitalNeeded,
      currentAssets: totalAssets,
      assetBreakdown: { cash, investments, realEstate },
      gap,
      progressPercent,
      isSustainable,
      runway
    };
  }, [expense, expenseType, familyContribution, expectedReturn, inflationRate, cash, investments, realEstate, propertyLoanCost, propertyTimeHorizon]);

  const foreverLionInput = useMemo(() => {
    const runwayInfo = parseForeverRunway(results.runway);
    return {
      isSustainable: results.isSustainable,
      progressPercent: results.progressPercent,
      gap: results.gap,
      currentAssets: results.currentAssets,
      capitalNeeded: Number.isFinite(results.capitalNeeded) ? results.capitalNeeded : 0,
      annualExpense: results.annualExpense,
      runwayLabel: results.runway,
      realReturnRate: results.realReturnRate,
      runwayYears: runwayInfo.perpetual ? null : runwayInfo.years,
      perpetualRunway: runwayInfo.perpetual,
      nominalExpectedReturnPct: expectedReturn,
    };
  }, [results, expectedReturn]);

  const foreverLionReport = useMemo(
    () =>
      buildLionVerdictClientReportFromForever(foreverLionInput, {
        formatCurrency: (n) => formatCurrency(n, currency),
      }),
    [foreverLionInput, currency],
  );
  const foreverLionScore = foreverLionReport.verdict.score;
  const foreverLionTargetCapital = foreverLionInput.capitalNeeded;
  const foreverLionGap = foreverLionInput.gap;
  const foreverLionProgressPercent = results.progressPercent;
  const foreverLionHorizonYears = foreverLionInput.runwayYears ?? undefined;
  const foreverLionHorizonLabel = foreverLionInput.runwayLabel;
  const surplusRatio = useMemo(() => {
    if (Number.isFinite(results.capitalNeeded) && results.capitalNeeded > 0) {
      return Math.max(0, results.currentAssets / results.capitalNeeded);
    }
    return results.isSustainable ? 1.05 : 0.85;
  }, [results.capitalNeeded, results.currentAssets, results.isSustainable]);
  const foreverLionConfidenceScore = useMemo(
    () => Math.min(1, Math.max(0, results.progressPercent / 100)),
    [results.progressPercent],
  );
  const lionSeedUserId = useMemo(
    () => (typeof window !== "undefined" ? window.location.hostname : "forever-server"),
    [],
  );
  const foreverLionTier = foreverLionReport.verdict.status as Tier;
  const foreverLionRiskTolerance = useMemo(() => results.progressPercent / 100, [results.progressPercent]);
  const [lionCopyPayload, setLionCopyPayload] = useState<GetLionVerdictOutput | null>(null);
  useEffect(() => {
    if (!lionAccessEnabled) {
      setLionCopyPayload(null);
    }
  }, [lionAccessEnabled]);

  useImperativeHandle(ref, () => ({
    getInputs: () => ({
      currency,
      expense,
      expenseType,
      familyContribution,
      expectedReturn,
      inflationRate,
      cash,
      investments,
      realEstate,
      propertyLoanCost,
      propertyTimeHorizon,
    }),
    getResults: () => {
      const r = results;
      return {
        monthlyExpense: r.monthlyExpense,
        annualExpense: r.annualExpense,
        propertyMonthlyRepayment: r.propertyMonthlyRepayment,
        familyContribution: r.familyContribution,
        expectedReturn: r.expectedReturn,
        inflationRate: r.inflationRate,
        realReturnRate: r.realReturnRate,
        capitalNeeded: Number.isFinite(r.capitalNeeded) ? r.capitalNeeded : null,
        currentAssets: r.currentAssets,
        assetBreakdown: r.assetBreakdown,
        gap: r.gap,
        progressPercent: r.progressPercent,
        isSustainable: r.isSustainable,
        runway: r.runway,
        ...(lionAccessEnabled && lionCopyPayload
          ? {
              lionCopy: {
                tier: foreverLionTier,
                headline: lionCopyPayload.headline,
                guidance: lionCopyPayload.guidance,
                headlineIndex: lionCopyPayload.headlineIndex,
                guidanceIndex: lionCopyPayload.guidanceIndex,
                confidenceBand: lionCopyPayload.confidenceBand,
                emphasis: lionCopyPayload.emphasis,
                persona: lionCopyPayload.persona,
                history: lionCopyPayload.history,
              },
            }
          : {}),
      };
    },
    applyInputs: (raw: Record<string, unknown>) => {
      const num = (k: string) => (typeof raw[k] === "number" && !Number.isNaN(raw[k] as number) ? (raw[k] as number) : undefined);
      const str = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : undefined);
      const et = raw["expenseType"];
      if (et === ExpenseType.MONTHLY || et === ExpenseType.ANNUAL) setExpenseType(et);
      const cur = str("currency");
      if (cur && currencies.includes(cur)) setCurrency(cur);
      const ex = num("expense");
      if (ex !== undefined) setExpense(ex);
      const fc = num("familyContribution");
      if (fc !== undefined) setFamilyContribution(fc);
      const er = num("expectedReturn");
      if (er !== undefined) setExpectedReturn(er);
      const inf = num("inflationRate");
      if (inf !== undefined) setInflationRate(inf);
      const c = num("cash");
      if (c !== undefined) setCash(c);
      const inv = num("investments");
      if (inv !== undefined) setInvestments(inv);
      const re = num("realEstate");
      if (re !== undefined) setRealEstate(re);
      const plc = num("propertyLoanCost");
      if (plc !== undefined) setPropertyLoanCost(plc);
      const pth = num("propertyTimeHorizon");
      if (pth !== undefined) setPropertyTimeHorizon(pth);
    },
  }), [
    currency,
    expense,
    expenseType,
    familyContribution,
    expectedReturn,
    inflationRate,
    cash,
    investments,
    realEstate,
    propertyLoanCost,
    propertyTimeHorizon,
    results,
    foreverLionTier,
    lionCopyPayload,
    foreverLionConfidenceScore,
    lionAccessEnabled,
  ]);

  const handleExpenseTypeChange = (newType: ExpenseType) => {
    if (newType === expenseType) return;
    if (newType === ExpenseType.ANNUAL) {
      setExpense(expense * 12);
      setFamilyContribution(familyContribution * 12);
    } else {
      setExpense(Math.round(expense / 12));
      setFamilyContribution(Math.round(familyContribution / 12));
    }
    setExpenseType(newType);
  };

  const chartData = [
    { name: 'Cash', value: results.assetBreakdown.cash },
    { name: 'Investments', value: results.assetBreakdown.investments },
    { name: 'Property Equity/Value', value: results.assetBreakdown.realEstate },
    { name: 'Remaining Gap', value: results.gap > 0 ? results.gap : 0 },
  ];

  const COLORS = ['#FFCC6A', '#F97316', '#22C55E', '#164d2a'];

  const isSurplusState = results.currentAssets >= results.capitalNeeded;
  const capitalDiff = results.isSustainable ? Math.abs(results.currentAssets - results.capitalNeeded) : 0;
  
  // Explicit "Annum" or "Monthly" toggle for income impact text
  const displayImpactLabel = expenseType === ExpenseType.MONTHLY ? 'Monthly' : 'Annum';
  const displayIncomeImpact = expenseType === ExpenseType.MONTHLY 
    ? (capitalDiff * (results.realReturnRate / 100)) / 12 
    : (capitalDiff * (results.realReturnRate / 100));

  const addReportFooter = (doc: any) => {
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Capital Bridge · Personal planning report — not investment advice", 105, 288, { align: "center" });
    doc.text("Confidential · For discussion with your financial adviser", 105, 293, { align: "center" });
  };

  const handleDownloadPDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const darkGreen = [13, 58, 29] as const;
      const lightGreen = [134, 239, 172] as const; // section accents
      const bodyGray = [60, 60, 60] as const;

      // Load logo: try SVG first (if renderer supports it), fall back to transparent PNG
      let logoBase64: string | null = null;
      let logoFormat: 'PNG' | 'SVG' = 'PNG';
      try {
        const pngRes = await fetch('/capital-bridge-logo.png');
        if (pngRes.ok) {
          const blob = await pngRes.blob();
          logoBase64 = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.onerror = rej;
            r.readAsDataURL(blob);
          });
          logoFormat = 'PNG';
        }
      } catch (_) {}

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

      // ========== PAGE 1 — Executive Financial Overview ==========
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, 297, 'F');

      // --- 1. Logo (top left, inline image, ~35mm ≈ 120–140px equivalent) ---
      const logoW = 35;
      const logoH = 14;
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', margin, y, logoW, logoH);
          y += logoH + 4;
        } catch (_) {
          y += 2;
        }
      } else {
        y += 2;
      }

      // --- 2. Report Title Header (clear hierarchy: CAPITAL BRIDGE > Forever Income Model > subtitle) ---
      const headerLeft = margin;
      doc.setTextColor(...darkGreen);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('CAPITAL BRIDGE', headerLeft, y + 5);
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Forever Income Model', headerLeft, y + 4);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...bodyGray);
      doc.text('Capital Sustainability Diagnostic', headerLeft, y + 3);
      doc.setFontSize(8);
      doc.setTextColor(...bodyGray);
      doc.text(`Report Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - margin, y - 4, { align: 'right' });
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

      // --- 3. Client Financial Snapshot ---
      doc.setDrawColor(...lightGreen);
      doc.setLineWidth(0.3);
      doc.setFillColor(245, 252, 248);
      doc.rect(margin, y, pageWidth - 2 * margin, 36, 'FD');
      doc.setTextColor(...darkGreen);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Client Financial Snapshot', margin + 4, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...bodyGray);
      doc.text(`Annual Lifestyle Spending: ${formatCurrency(baseAnnualLifestyle, currency)}`, margin + 4, y + 16);
      doc.text(`Loan Cost / Interest Rate: ${propertyLoanCost}%`, margin + 4, y + 22);
      doc.text(`Investment Return Assumption: ${expectedReturn}%`, margin + 105, y + 16);
      doc.text(`Inflation Assumption: ${inflationRate}%`, margin + 105, y + 22);
      doc.text(`Total Capital Available: ${formatCurrency(results.currentAssets, currency)}`, margin + 105, y + 28);
      y += 40;
      drawSectionDivider();

      // --- 4. Scenario Context ---
      doc.setFontSize(8);
      doc.setTextColor(...bodyGray);
      doc.text('Scenario Context', margin, y);
      doc.text(`Base Scenario Projection — Return Assumption: ${expectedReturn}% | Inflation: ${inflationRate}%`, margin, y + 5);
      y += 12;
      drawSectionDivider();

      // --- 5. Executive Summary ---
      doc.setDrawColor(...lightGreen);
      doc.setLineWidth(0.2);
      doc.setFillColor(248, 252, 250);
      doc.rect(margin, y, pageWidth - 2 * margin, 48, 'FD');
      doc.setTextColor(...darkGreen);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Executive Summary', margin + 4, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...bodyGray);
      const summaryX1 = margin + 4;
      const summaryX2 = margin + 105;
      doc.text('Net Strategic Withdrawal (Annual):', summaryX1, y + 18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGreen);
      doc.text(formatCurrency(results.annualExpense, currency), summaryX1, y + 24);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...bodyGray);
      doc.text('Capital Sustainability Horizon:', summaryX1, y + 34);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGreen);
      doc.text(results.runway, summaryX1, y + 40);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...bodyGray);
      doc.text('Total Capital Available:', summaryX2, y + 18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGreen);
      doc.text(formatCurrency(results.currentAssets, currency), summaryX2, y + 24);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...bodyGray);
      doc.text('Forever Capital Target:', summaryX2, y + 34);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGreen);
      doc.text(results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : '—', summaryX2, y + 40);
      y += 54;
      drawSectionDivider();

      // --- 6. Model Assumptions ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...darkGreen);
      doc.text('Model Assumptions', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...bodyGray);
      doc.text(`Strategic Return Assumption: ${expectedReturn}%`, margin, y + 7);
      doc.text(`Long-Term Inflation Assumption: ${inflationRate}%`, margin, y + 13);
      doc.text('Withdrawal Model: Inflation Adjusted', margin, y + 19);
      y += 26;
      drawSectionDivider();

      // --- 7. Capital Efficiency Metrics (stacked rows to prevent label overlap) ---
      const metricsBoxW = pageWidth - 2 * margin;
      doc.setDrawColor(...lightGreen);
      doc.setLineWidth(0.2);
      doc.setFillColor(248, 252, 250);
      doc.rect(margin, y, metricsBoxW, 34, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...darkGreen);
      doc.text('Capital Bridge Progress (Current Capital vs Forever Capital Target):', margin + 4, y + 8, { maxWidth: metricsBoxW - 28 });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`${results.progressPercent.toFixed(1)}%`, margin + metricsBoxW - 8, y + 8, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Capital Efficiency Ratio (Current Capital ÷ Forever Capital Target):', margin + 4, y + 22, { maxWidth: metricsBoxW - 28 });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`${results.progressPercent.toFixed(1)}%`, margin + metricsBoxW - 8, y + 22, { align: 'right' });
      y += 40;

      addReportFooter(doc);
      doc.addPage();

      // ========== PAGE 2 — Capital Sustainability Analysis ==========
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, 297, 'F');
      y = 20;

      // --- Annual Income Requirement ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...darkGreen);
      doc.text('Annual Income Requirement', margin, y);
      doc.setDrawColor(...lightGreen);
      doc.setLineWidth(0.2);
      doc.line(margin, y + 2, margin + 60, y + 2);
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...bodyGray);
      doc.text(`Base Lifestyle Expense: ${formatCurrency(baseAnnualLifestyle, currency)}/year`, margin, y);
      y += 7;
      doc.text(`Property Debt Service: ${formatCurrency(results.propertyMonthlyRepayment * 12, currency)}/year`, margin, y);
      y += 7;
      doc.text(`Family Income Offset: -${formatCurrency(results.familyContribution * 12, currency)}/year`, margin, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGreen);
      doc.text(`Net Strategic Withdrawal: ${formatCurrency(results.annualExpense, currency)}/year`, margin, y);
      doc.setFont('helvetica', 'normal');
      y += 20;

      // --- Current Capital Position ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...darkGreen);
      doc.text('Current Capital Position', margin, y);
      doc.setDrawColor(...lightGreen);
      doc.line(margin, y + 2, margin + 65, y + 2);
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...bodyGray);
      doc.text(`Cash Reserves: ${formatCurrency(cash, currency)}`, margin, y);
      y += 7;
      doc.text(`Investment Portfolio: ${formatCurrency(investments, currency)}`, margin, y);
      y += 7;
      doc.text(`Real Estate Unlockable Value: ${formatCurrency(realEstate, currency)}`, margin, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...darkGreen);
      doc.text(`Total Capital Available: ${formatCurrency(results.currentAssets, currency)}`, margin, y);
      doc.setFont('helvetica', 'normal');
      y += 22;

      // --- Capital Gap to Sustainability ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...darkGreen);
      doc.text('Capital Gap to Sustainability', margin, y);
      doc.setDrawColor(...lightGreen);
      doc.line(margin, y + 2, margin + 75, y + 2);
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...bodyGray);
      doc.text(`Forever Capital Target: ${results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : '—'}`, margin, y);
      y += 7;
      doc.text(`Total Capital Available: ${formatCurrency(results.currentAssets, currency)}`, margin, y);
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...darkGreen);
      doc.text(`Capital Gap: ${results.isSustainable ? formatCurrency(results.gap, currency) : '—'}`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...bodyGray);
      y += 22;

      // --- Capital Sustainability Horizon ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...darkGreen);
      doc.text('Capital Sustainability Horizon', margin, y);
      doc.setDrawColor(...lightGreen);
      doc.line(margin, y + 2, margin + 85, y + 2);
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...bodyGray);
      doc.text(`Estimated years current capital can sustain withdrawals: ${results.runway}`, margin, y);

      addReportFooter(doc);
      doc.addPage();

      // ========== PAGE 3 — Strategic Interpretation & Advisory Context ==========
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, 297, 'F');
      y = 20;

      // --- Financial Interpretation ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...darkGreen);
      doc.text('Financial Interpretation', margin, y);
      doc.setDrawColor(...lightGreen);
      doc.line(margin, y + 2, margin + 55, y + 2);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...bodyGray);
      const runwayYears = results.runway === 'Perpetual' ? 'indefinitely' : `approximately ${results.runway} before depletion`;
      const capitalBase = results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : '—';
      doc.text(`Based on the current capital structure and withdrawal level, the portfolio is projected to sustain income for ${runwayYears}.`, margin, y, { maxWidth: pageWidth - 2 * margin });
      y += 10;
      doc.text(`Achieving long-term financial sustainability would require an estimated capital base of ${capitalBase}.`, margin, y, { maxWidth: pageWidth - 2 * margin });
      y += 22;

      // --- Discussion Topics with Your Financial Advisor ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...darkGreen);
      doc.text('Discussion Topics with Your Financial Advisor', margin, y);
      doc.setDrawColor(...lightGreen);
      doc.line(margin, y + 2, margin + 95, y + 2);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...bodyGray);
      const topics = ['Capital growth strategy', 'Income sustainability planning', 'Property equity optimization', 'Withdrawal efficiency'];
      topics.forEach((t) => { doc.text(`• ${t}`, margin, y); y += 7; });
      y += 14;

      // --- Methodology Note ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...darkGreen);
      doc.text('Methodology Note', margin, y);
      doc.setDrawColor(...lightGreen);
      doc.line(margin, y + 2, margin + 45, y + 2);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...bodyGray);
      doc.text('The Capital Bridge model evaluates the sustainability of capital reserves relative to lifestyle spending, expected investment returns, and inflation assumptions.', margin, y, { maxWidth: pageWidth - 2 * margin });
      y += 8;
      doc.text('The analysis estimates the capital required to support long-term income sustainability without depletion using long-term withdrawal modeling.', margin, y, { maxWidth: pageWidth - 2 * margin });
      y += 22;

      // --- Strategic Partner Conversion Line ---
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...bodyGray);
      doc.text('This diagnostic is designed to support financial planning discussions with qualified financial professionals.', margin, y, { maxWidth: pageWidth - 2 * margin });

      addReportFooter(doc);

      appendLionsVerdictPageToForeverPdf(doc, foreverLionReport, {
        pageWidth,
        margin,
        darkGreen,
        bodyGray,
        addFooter: addReportFooter,
      });

      doc.save(`Capital-Bridge-Strategic-Wealth-Diagnostic-${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const status = useMemo(() => {
    if (!results.isSustainable) {
      return { label: 'NEGATIVE YIELD', bgColor: 'bg-red-900/40', textColor: 'text-red-400', borderColor: 'border-red-500/30', icon: <AlertTriangle className="w-3.5 h-3.5" /> };
    }
    if (results.progressPercent < 50) return { label: 'CRITICAL GAP', bgColor: 'bg-red-900/40', textColor: 'text-red-400', borderColor: 'border-red-500/30', icon: <AlertTriangle className="w-3.5 h-3.5" /> };
    if (results.progressPercent < 90) return { label: 'GROWTH PHASE', bgColor: 'bg-amber-900/40', textColor: 'text-amber-400', borderColor: 'border-amber-500/30', icon: <TrendingUp className="w-3.5 h-3.5" /> };
    return { label: 'STRATEGY SECURED', bgColor: 'bg-emerald-900/40', textColor: 'text-emerald-400', borderColor: 'border-emerald-500/30', icon: <ShieldCheck className="w-3.5 h-3.5" /> };
  }, [results.isSustainable, results.progressPercent]);

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <main className="w-full max-w-[900px] bg-[#0D3A1D] rounded-3xl border-2 border-[#FFCC6A] shadow-[0_0_50px_rgba(255,204,106,0.1)] overflow-hidden">
        <div className="flex flex-col">
          <div className="p-6 md:p-10 bg-black/10 border-b border-[#FFCC6A]/20">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8">
              <h2 className="text-xl font-semibold text-[#FFCC6A] flex items-center gap-2 flex-shrink-0">
                <Landmark className="w-5 h-5" /> Forever Income Model
              </h2>
              <div className="flex flex-wrap bg-emerald-950/50 rounded-lg p-0.5 border border-[#FFCC6A]/20 gap-0.5 max-w-full">
                {currencies.map((curr) => (
                  <button key={curr} onClick={() => setCurrency(curr)} className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all flex-shrink-0 ${currency === curr ? 'bg-[#FFCC6A] text-[#0D3A1D] shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8 space-y-6">
              <div className="relative flex p-1 bg-emerald-950/50 rounded-xl border border-white/5">
                <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#FFCC6A] rounded-lg transition-all duration-300 ease-in-out shadow-sm ${expenseType === ExpenseType.ANNUAL ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`} />
                <button onClick={() => handleExpenseTypeChange(ExpenseType.MONTHLY)} className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-colors ${expenseType === ExpenseType.MONTHLY ? 'text-[#0D3A1D]' : 'text-gray-400'}`}>
                  <Clock className="w-4 h-4" /> Monthly Expense
                </button>
                <button onClick={() => handleExpenseTypeChange(ExpenseType.ANNUAL)} className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-colors ${expenseType === ExpenseType.ANNUAL ? 'text-[#0D3A1D]' : 'text-gray-400'}`}>
                  <Calendar className="w-4 h-4" /> Annual Expense
                </button>
              </div>

              <div className="space-y-4">
                <SliderInput 
                  label={expenseType === ExpenseType.MONTHLY ? "Monthly Expenses" : "Base Annual Lifestyle Spend"} 
                  value={expense} 
                  min={0} 
                  max={sliderConfigs.lifestyle.max} 
                  step={sliderConfigs.lifestyle.step} 
                  unit="" 
                  prefix={currency} 
                  onChange={setExpense} 
                />
                <div className="pt-2">
                   <SliderInput label={expenseType === ExpenseType.MONTHLY ? "MONTHLY FAMILY CONTRIBUTION/INCOME/SALARY (Monthly Offset)" : "MONTHLY FAMILY CONTRIBUTION/INCOME/SALARY (Annual Offset)"} value={familyContribution} min={0} max={sliderConfigs.contribution.max} step={sliderConfigs.contribution.step} unit="" prefix={currency} onChange={setFamilyContribution} />
                  <p className="text-[10px] text-[#FFCC6A]/70 leading-relaxed italic px-1 opacity-80 flex items-center gap-1">
                    <Users className="w-3 h-3" /> External support reduces your net withdrawal from capital reserves.
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-5 rounded-2xl bg-[#FFCC6A]/5 border border-[#FFCC6A]/20 mt-6">
                <h3 className="text-[10px] font-black uppercase text-[#FFCC6A]/60 tracking-[0.2em] mb-4">Capital Allocation</h3>
                <SliderInput label={"CASH:\nSALARY/SAVINGS/FD"} value={cash} min={0} max={sliderConfigs.cash.max} step={sliderConfigs.cash.step} unit="" prefix={currency} onChange={setCash} />
                <SliderInput label={"INVESTMENTS/SAVINGS:\nEquities, ETFs, Unit Trusts, Retirement Savings"} value={investments} min={0} max={sliderConfigs.investments.max} step={sliderConfigs.investments.step} unit="" prefix={currency} onChange={setInvestments} />
                <div className="pt-4 border-t border-[#FFCC6A]/10 mt-4 space-y-4">
                  <SliderInput label={"Real Estate to be unlocked:\nHouse/land/shop/business)"} value={realEstate} min={0} max={sliderConfigs.property.max} step={sliderConfigs.property.step} unit="" prefix={currency} onChange={setRealEstate} />
                  {realEstate > 0 && (
                    <div className="pl-4 border-l-2 border-[#FFCC6A]/20 transition-all duration-300 animate-in fade-in slide-in-from-left-2 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold text-[#FFCC6A] uppercase tracking-wider">Loan Amortization</span>
                        <div className="px-3 py-1 bg-[#FFCC6A] rounded-md text-[#0D3A1D] text-[10px] font-black shadow-lg">Repayment: {formatCurrency(results.propertyMonthlyRepayment, currency)}/mo</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <SliderInput label="Loan Cost / EIR %" value={propertyLoanCost} min={0} max={10} step={0.05} unit="%" onChange={setPropertyLoanCost} />
                        <SliderInput label="Time Horizon" value={propertyTimeHorizon} min={0} max={30} step={0.5} unit=" Years" onChange={setPropertyTimeHorizon} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput label="Expected ROI %" value={expectedReturn} min={0.1} max={20} step={0.1} unit="%" onChange={setExpectedReturn} />
                <SliderInput label="Inflation Rate %" value={inflationRate} min={0} max={15} step={0.1} unit="%" onChange={setInflationRate} />
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10 flex flex-col relative overflow-hidden">
            <div className="absolute right-[-10%] bottom-[-5%] opacity-[0.03] pointer-events-none transform rotate-[-15deg]">
              <img src="https://raw.githubusercontent.com/ai-studio-assets/lion-logo/main/lion-gold.png" alt="" className="w-96 h-96 grayscale invert" />
            </div>

            <div className="flex justify-between items-start mb-10 relative z-10">
              <h2 className="text-xl font-semibold text-[#FFCC6A]">Strategic Gap Analysis</h2>
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${status.bgColor} ${status.textColor} text-[10px] font-bold border ${status.borderColor}`}>
                {status.icon} {status.label}
              </span>
            </div>

            <div className="flex-1 flex flex-col relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Target Capital</p>
                  <p className="text-xl font-black text-[#FFCC6A]">{results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : '∞'}</p>
                </div>
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Assets</p>
                  <p className="text-xl font-black text-white">{formatCurrency(results.currentAssets, currency)}</p>
                </div>
                <div className={`p-4 rounded-xl transition-colors duration-500 ${isSurplusState ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-[#164d2a]/30 border-[#FFCC6A]/20'} text-center relative overflow-hidden border flex flex-col justify-center min-h-[135px]`}>
                  <p className={`text-[10px] uppercase tracking-widest mb-0.5 font-bold ${isSurplusState ? 'text-emerald-400/70' : 'text-[#FFCC6A]/60'}`}>
                    {isSurplusState ? 'Wealth Surplus' : 'Capital Depletion'}
                  </p>
                  <p className={`text-lg font-black leading-tight ${isSurplusState ? 'text-emerald-400' : 'text-[#FFCC6A]'}`}>
                    {results.isSustainable ? formatCurrency(capitalDiff, currency) : 'UNSUSTAINABLE'}
                  </p>
                  <div className={`mt-2 border-t pt-2 ${isSurplusState ? 'border-emerald-500/20' : 'border-[#FFCC6A]/20'} flex flex-col gap-1`}>
                    <p className={`text-[9px] font-bold uppercase tracking-tight ${isSurplusState ? 'text-emerald-500/80' : 'text-amber-500/80'}`}>
                      {displayImpactLabel} Impact: {formatCurrency(displayIncomeImpact, currency)}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                       <Timer className={`w-3.5 h-3.5 ${isSurplusState ? 'text-emerald-400' : 'text-[#FFCC6A]'}`} />
                       <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isSurplusState ? 'text-emerald-400' : 'text-[#FFCC6A]'}`}>
                        Horizon: {results.runway}
                       </p>
                    </div>
                  </div>
                  {isSurplusState && <CheckCircle2 className="absolute -right-2 -bottom-2 w-10 h-10 text-emerald-400 opacity-20 rotate-12" />}
                </div>
              </div>

              <div className="mb-10">
                <div className="flex justify-between items-end mb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Forever Capital Bridge</p>
                  <p className="text-3xl font-black text-[#FFCC6A]">{results.progressPercent.toFixed(1)}%</p>
                </div>
                <div className="h-5 w-full bg-emerald-950/80 rounded-full overflow-hidden border border-white/5 p-1">
                  <div className={`h-full bg-gradient-to-r from-[#FFCC6A] to-[#F97316] shadow-[0_0_20px_rgba(255,204,106,0.4)] transition-all duration-1000 ease-out rounded-full`} style={{ width: `${results.progressPercent}%` }} />
                </div>
              </div>

              <div className="flex-1 min-h-[350px] relative flex items-center justify-center">
                <div className="w-full h-full absolute inset-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={100} outerRadius={130} paddingAngle={8} dataKey="value" stroke="none" animationDuration={1200}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0D3A1D', borderRadius: '16px', border: '1px solid #FFCC6A', color: 'white' }} itemStyle={{ color: '#FFCC6A' }} formatter={(value: any) => formatCurrency(value, currency)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Net Withdrawal</span>
                  <span className="text-3xl font-black text-[#FFCC6A] leading-none mb-1">{formatCurrency(results.monthlyExpense, currency)}</span>
                  <span className="text-[10px] text-gray-500 uppercase font-medium leading-none">Monthly Dependency</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 text-[10px] uppercase font-bold tracking-tighter">
                {chartData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-black/10 rounded-lg min-h-[50px] border border-white/5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }}></div>
                    <span className="text-gray-400 leading-tight break-words">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 relative z-10">
              <div className="flex justify-center">
                <button onClick={handleDownloadPDF} disabled={!results.isSustainable || isGenerating} className={`py-3 px-6 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${results.isSustainable && !isGenerating ? 'bg-[#FFCC6A] text-[#0D3A1D] hover:bg-white hover:scale-105 hover:-translate-y-0.5 shadow-lg shadow-[#FFCC6A]/30 animate-download-cta' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>
                  {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Download className="w-4 h-4" /> Download Report</>}
                </button>
              </div>
              <p className="mt-3 text-center text-[10px] text-white font-medium italic px-4 leading-normal">
                *Please save or print a copy for your records. Capital Bridge does not save or store your personal information.
              </p>
            </div>
          </div>
          <div className="mt-10">
            <div className="mx-auto max-w-3xl">
              <div className="bg-[#00160f] border border-[#FFCC6A]/20 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-sm text-gray-200">
                <LionVerdictActive
                  user={lionAccessUser}
                  userId={lionSeedUserId}
                  reportType="forever_income"
                  tier={foreverLionTier}
                  confidenceScore={foreverLionConfidenceScore}
                  surplusRatio={surplusRatio}
                  riskTolerance={foreverLionRiskTolerance}
                  score={foreverLionScore}
                  horizon={foreverLionHorizonYears}
                  horizonLabel={foreverLionHorizonLabel}
                  gap={foreverLionGap}
                  target={foreverLionTargetCapital}
                  progress={foreverLionProgressPercent}
                  onCopyComputed={setLionCopyPayload}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
});

export default ForeverApp;
