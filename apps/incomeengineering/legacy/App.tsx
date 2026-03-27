"use client";

import React, { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import './index.css';
import { CalculatorStoreProvider, useCalculatorStoreInternals } from './store/useCalculatorStore';
import { runSimulation } from './lib/simulation';
import { PersistentSummaryHeader } from './components/PersistentSummaryHeader';
import { CurrencySelectorEmbedded } from './components/CurrencySelector';
import { ExpensesInput } from './components/ExpensesInput';
import { IncomeInputs } from './components/IncomeInputs';
import { AssetsUnlockPanel } from './components/AssetsUnlockPanel';
import { assetUnlocksToLoans } from './lib/assetUnlockToLoans';
import { InvestmentBucketsPanel } from './components/InvestmentBucketsPanel';
import { WhatThisMeansBox } from './components/WhatThisMeansBox';
import { FooterDisclaimer } from './components/FooterDisclaimer';
import { PrintReportView } from './components/PrintReportView';
import { Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { buildLionVerdictClientReportFromIncomeEngineering } from '@cb/advisory-graph/lionsVerdict';
import { LionVerdictActive } from "../../../packages/lion-verdict/LionVerdictActive";
import { LionVerdictLocked } from "../../../packages/lion-verdict/LionVerdictLocked";
import { canAccessLion, type LionAccessUser } from "../../../packages/lion-verdict/access";
import type { Tier } from "../../../packages/lion-verdict/copy";
import type { SustainabilityStatus } from './types/calculator';
import { formatCurrency } from './utils/format';

export type IncomeEngineeringAppHandle = {
  getInputs: () => Record<string, unknown>;
  getResults: () => Record<string, unknown>;
  applyInputs: (inputs: Record<string, unknown>) => void;
};

const DEFAULT_LION_ACCESS_USER: LionAccessUser = { isPaid: true, hasActiveTrialUpgrade: false };

const deriveTierFromStatus = (status: SustainabilityStatus | undefined): Tier => {
  switch (status) {
    case 'green':
      return 'STABLE';
    case 'amber':
      return 'AT_RISK';
    case 'red':
      return 'NOT_SUSTAINABLE';
    default:
      return 'FRAGILE';
  }
};

const AppInner = forwardRef<IncomeEngineeringAppHandle, { lionAccessUser: LionAccessUser }>(
  function AppInner(props, ref) {
  const { state, dispatch } = useCalculatorStoreInternals();
  const { currency, monthlyExpenses, incomeRows, assetUnlocks, investmentBuckets } = state;

  const loansFromAssets = useMemo(() => assetUnlocksToLoans(assetUnlocks), [assetUnlocks]);

  const result = useMemo(
    () =>
      runSimulation({
        currency,
        monthlyExpenses,
        incomeRows,
        loans: loansFromAssets,
        investmentBuckets,
        assetUnlocks,
      }),
    [currency, monthlyExpenses, incomeRows, loansFromAssets, investmentBuckets, assetUnlocks]
  );
  const lionAccessEnabled = canAccessLion(props.lionAccessUser);
  const lionTier = deriveTierFromStatus(result.summary.sustainabilityStatus);
  const lionConfidenceScore = 0.5;
  const lionSurplusRatio = 1;
  const lionRiskTolerance = 0.5;
  const lionSeedUserId =
    typeof window !== 'undefined' ? window.location.hostname : 'income-engineering';

  useImperativeHandle(
    ref,
    () => ({
      getInputs: () => JSON.parse(JSON.stringify(state)) as Record<string, unknown>,
      getResults: () => {
        const totalCapital =
          (result.summary.totalUnlockedLiquidity ?? 0) +
          investmentBuckets.reduce((s, b) => s + (b.allocation ?? 0), 0);
        const totalIncome = result.summary.monthlyIncome + result.summary.estimatedMonthlyInvestmentIncome;
        const totalExpenses = result.summary.monthlyExpenses + result.summary.monthlyLoanRepayments;
        const net = totalIncome - totalExpenses;
        if (!lionAccessEnabled) {
          return JSON.parse(
            JSON.stringify({
              summary: result.summary,
              medianCoverage: result.medianCoverage,
              worstMonthCoverage: result.worstMonthCoverage,
            }),
          ) as Record<string, unknown>;
        }
        const lionVerdictClient = buildLionVerdictClientReportFromIncomeEngineering(
          {
            medianCoveragePct: result.medianCoverage,
            worstMonthCoveragePct: result.worstMonthCoverage,
            sustainabilityStatus: result.summary.sustainabilityStatus,
            totalMonthlyIncome: totalIncome,
            totalMonthlyExpenses: totalExpenses,
            monthlyNetCashflow: net,
            totalCapital,
          },
          { formatCurrency: (n) => formatCurrency(n, currency) },
        );
        return JSON.parse(
          JSON.stringify({
            summary: result.summary,
            medianCoverage: result.medianCoverage,
            worstMonthCoverage: result.worstMonthCoverage,
            lionVerdictClient,
          }),
        ) as Record<string, unknown>;
      },
      applyInputs: (raw) => dispatch({ type: 'HYDRATE', payload: raw }),
    }),
    [state, result, dispatch, currency, investmentBuckets, lionAccessEnabled]
  );

  const totalCapital =
    (result.summary.totalUnlockedLiquidity ?? 0) +
    investmentBuckets.reduce((s, b) => s + (b.allocation ?? 0), 0);
  const totalExpenses = result.summary.monthlyExpenses + result.summary.monthlyLoanRepayments;
  const totalIncome = result.summary.monthlyIncome + result.summary.estimatedMonthlyInvestmentIncome;
  const monthlyShortfall = Math.max(0, totalExpenses - totalIncome);
  const horizonYears =
    monthlyShortfall > 0 ? totalCapital / (monthlyShortfall * 12) : undefined;
  const horizonLabel = horizonYears ? horizonYears.toFixed(1) : 'Perpetual';
  const targetCapital = totalExpenses * 12;
  const gapAmount = Math.max(0, targetCapital - totalCapital);
  const progressPercent = targetCapital > 0 ? Math.min(100, (totalCapital / targetCapital) * 100) : 0;
  const lionScore = lionConfidenceScore * 100;

  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrintReport = async () => {
    const el = reportRef.current;
    if (!el) return;
    const margin = 12; // mm white space around content
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = pageHeight - 2 * margin;

    const addPartToPdf = async (
      doc: jsPDF,
      partEl: HTMLElement
    ): Promise<void> => {
      const canvas = await html2canvas(partEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgWidthMm = contentWidth;
      const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
      const sliceHeightPx = (contentHeight / imgHeightMm) * canvas.height;
      const numPages = Math.ceil(imgHeightMm / contentHeight);
      for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
        const fromY = pageIndex * sliceHeightPx;
        const sliceH = Math.min(sliceHeightPx, canvas.height - fromY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get 2d context for PDF page slice');
        }
        if (pageIndex > 0) doc.addPage();
        ctx.drawImage(canvas, 0, fromY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const sliceData = sliceCanvas.toDataURL('image/png');
        const sliceHeightMm = (sliceH / canvas.height) * imgHeightMm;
        doc.addImage(sliceData, 'PNG', margin, margin, imgWidthMm, sliceHeightMm);
      }
    };

    try {
      const part1 = el.querySelector<HTMLElement>('[data-pdf-part="1"]');
      const part2 = el.querySelector<HTMLElement>('[data-pdf-part="2"]');
      if (!part1) return;
      const doc = new jsPDF('p', 'mm', 'a4');
      await addPartToPdf(doc, part1);
      if (part2) {
        doc.addPage();
        await addPartToPdf(doc, part2);
      }
      doc.save('Capital-Engineering-Model-Report.pdf');
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-[#0D3A1D] text-[#F6F5F1] [font-size:14px]">
      {/* On-screen app (hidden when printing) */}
      <div className="no-print">
        <div className="pt-14">
          <PersistentSummaryHeader summary={result.summary} currency={currency} totalCapital={totalCapital} />
        <div className="mx-auto w-full max-w-[100%] pt-52 pb-6 px-4 min-[641px]:max-w-[var(--container-tablet-max)] min-[641px]:px-6 min-[641px]:pt-56 min-[641px]:pb-8 min-[1025px]:max-w-[var(--container-desktop-max)] min-[1025px]:px-8 min-[1025px]:pt-60 min-[1025px]:pb-10 min-[1441px]:max-w-[var(--container-wide-max)] min-[1441px]:px-10 min-[1441px]:pt-64 min-[1441px]:pb-12">
          <section aria-label="Expectations setting" className="space-y-6">
            <div className="rounded-xl border border-[#1A4D2E]/60 bg-[#163d28] p-4 sm:p-6">
              <h2 className="font-serif-section mb-1 text-base font-bold uppercase sm:text-lg">Expectations Setting</h2>
              <p className="mb-4 text-xs text-[#B8B5AE] opacity-90">Define your lifestyle goal and planning assumptions</p>
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#B8B5AE]">Currency</p>
                  <CurrencySelectorEmbedded />
                </div>
                <ExpensesInput />
              </div>
            </div>
            <IncomeInputs />
            <AssetsUnlockPanel
              totalIncome={result.summary.monthlyIncome + result.summary.estimatedMonthlyInvestmentIncome}
              totalExpenses={result.summary.monthlyExpenses + result.summary.monthlyLoanRepayments}
            />
            <InvestmentBucketsPanel />
          </section>

          <section aria-label="Details" className="mt-10 space-y-5 min-[641px]:mt-12 min-[641px]:space-y-6 min-[1025px]:mt-14 min-[1025px]:space-y-6">
            <WhatThisMeansBox
              status={result.summary.sustainabilityStatus}
              medianCoverage={result.medianCoverage}
              worstMonthCoverage={result.worstMonthCoverage}
              invalidReason={result.summary.invalidReason}
            />
          </section>

          <section aria-label="The Lion's Verdict" className="mt-10">
            <div className="mx-auto max-w-3xl">
              {!lionAccessEnabled ? (
                <LionVerdictLocked tierLabel={lionTier} />
              ) : (
                <LionVerdictActive
                  user={props.lionAccessUser}
                  userId={lionSeedUserId}
                  reportType="income_engineering"
                  tier={lionTier}
                  score={lionScore}
                  confidenceScore={lionConfidenceScore}
                  surplusRatio={lionSurplusRatio}
                  riskTolerance={lionRiskTolerance}
                  horizon={horizonYears}
                  horizonLabel={horizonLabel}
                  target={targetCapital}
                  gap={gapAmount}
                  progress={progressPercent}
                />
              )}
            </div>
          </section>

          <FooterDisclaimer />

          <div className="mt-8 mx-auto max-w-xl space-y-4">
            <p className="text-center text-sm font-semibold text-[#FFCC6A]">
              Please save or print a copy for your records. Capital Bridge does not save or store your personal information.
            </p>
            <button
              type="button"
              onClick={handlePrintReport}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl border-2 border-[#FFCC6A] bg-[#FFCC6A]/10 px-4 py-3 text-sm font-bold text-[#FFCC6A] hover:bg-[#FFCC6A]/20 focus:outline-none focus:ring-2 focus:ring-[#FFCC6A]/50 touch-manipulation"
            >
              <Printer className="h-5 w-5 shrink-0" aria-hidden />
              Print or Save Report
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Report content (off-screen; captured for PDF download) */}
      <div
        ref={reportRef}
        className="print-only"
        style={{ position: 'absolute', left: '-9999px', top: 0, width: 800 }}
      >
        <PrintReportView
          summary={result.summary}
          currency={currency}
          totalCapital={totalCapital}
          monthlyExpenses={monthlyExpenses}
          incomeRows={incomeRows}
          assetUnlocks={assetUnlocks}
          investmentBuckets={investmentBuckets}
          medianCoverage={result.medianCoverage}
          worstMonthCoverage={result.worstMonthCoverage}
          lionAccessEnabled={lionAccessEnabled}
        />
      </div>
    </div>
  );
});

const App = forwardRef<IncomeEngineeringAppHandle, { lionAccessUser?: LionAccessUser }>(function App(props, ref) {
  const lionAccessUser = props.lionAccessUser ?? DEFAULT_LION_ACCESS_USER;
  return (
    <CalculatorStoreProvider>
      <AppInner ref={ref} lionAccessUser={lionAccessUser} />
    </CalculatorStoreProvider>
  );
});

export default App;
