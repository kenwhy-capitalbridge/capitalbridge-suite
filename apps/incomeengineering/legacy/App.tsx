"use client";

import React, {
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useEffect,
  useCallback,
} from 'react';
import { flushSync } from 'react-dom';
import {
  beginReportReadyCycle,
  completeReportReadyCycle,
  subscribeReportReadyOnPrint,
} from '@cb/pdf';
import './index.css';
import { CalculatorStoreProvider, useCalculatorStoreInternals } from './store/useCalculatorStore';
import { runSimulation } from './lib/simulation';
import { createReportAuditMeta, type ReportAuditMeta } from '@cb/shared/reportTraceability';
import { ModelReportDownloadFooter, stampAllPdfPagesWithAudit, useModelMetricSpine } from '@cb/ui';
import { CurrencySelectorEmbedded } from './components/CurrencySelector';
import { ExpensesInput } from './components/ExpensesInput';
import { IncomeInputs } from './components/IncomeInputs';
import { AssetsUnlockPanel } from './components/AssetsUnlockPanel';
import { assetUnlocksToLoans } from './lib/assetUnlockToLoans';
import { InvestmentBucketsPanel } from './components/InvestmentBucketsPanel';
import { WhatThisMeansBox } from './components/WhatThisMeansBox';
import { PrintReportView } from './components/PrintReportView';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  buildLionVerdictClientReportFromIncomeEngineering,
  incomeEngineeringCoverageToLion0to100,
  lionPublicStatusFromScore0to100,
  lionStrongEligibilityFromIncomeEngineering,
} from '@cb/advisory-graph/lionsVerdict';
import { LionVerdictActive } from "../../../packages/lion-verdict/LionVerdictActive";
import { canAccessLion, type LionAccessUser } from "../../../packages/lion-verdict/access";
import type { SummaryKPIs } from './types/calculator';
import { formatCurrency } from './utils/format';

export type IncomeEngineeringAppHandle = {
  getInputs: () => Record<string, unknown>;
  getResults: () => Record<string, unknown>;
  applyInputs: (inputs: Record<string, unknown>) => void;
};

const DEFAULT_LION_ACCESS_USER: LionAccessUser = { isPaid: true, hasActiveTrialUpgrade: false };

function coveragePctHeader(totalIncome: number, totalExpenses: number): number {
  if (totalExpenses <= 0) return 100;
  return (totalIncome / totalExpenses) * 100;
}

function statusLabelFromSummary(status: SummaryKPIs['sustainabilityStatus']): string {
  if (status === 'green') return 'SUSTAINABLE';
  if (status === 'amber') return 'PLAUSIBLE';
  if (status === 'red') return 'UNSUSTAINABLE';
  return 'INVALID';
}

const AppInner = forwardRef<
  IncomeEngineeringAppHandle,
  { lionAccessUser: LionAccessUser; reportClientDisplayName: string }
>(
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
  const lionConfidenceScore = 0.5;
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
            medianCoveragePct: result.medianCoverage * 100,
            worstMonthCoveragePct: result.worstMonthCoverage * 100,
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
  const netCashflowForLion = totalIncome - totalExpenses;
  const lionScoreIe = incomeEngineeringCoverageToLion0to100({
    medianCoveragePct: result.medianCoverage * 100,
    worstMonthCoveragePct: result.worstMonthCoverage * 100,
    sustainabilityStatus: result.summary.sustainabilityStatus,
  });
  const lionTier = lionPublicStatusFromScore0to100(
    lionScoreIe,
    lionStrongEligibilityFromIncomeEngineering({
      monthlyNetCashflow: netCashflowForLion,
      sustainabilityStatus: result.summary.sustainabilityStatus,
      worstMonthCoveragePct: result.worstMonthCoverage * 100,
      medianCoveragePct: result.medianCoverage * 100,
    }),
  );
  const lionScore = lionScoreIe;
  const lionSurplusRatio = totalExpenses > 0 ? totalIncome / totalExpenses : 1;
  const monthlyShortfall = Math.max(0, totalExpenses - totalIncome);
  const horizonYears =
    monthlyShortfall > 0 ? totalCapital / (monthlyShortfall * 12) : undefined;
  const horizonLabel = horizonYears ? horizonYears.toFixed(1) : 'Perpetual';
  const targetCapital = totalExpenses * 12;
  const gapAmount = Math.max(0, targetCapital - totalCapital);
  const progressPercent = targetCapital > 0 ? Math.min(100, (totalCapital / targetCapital) * 100) : 0;

  const { setSpine } = useModelMetricSpine();
  const spineNetMonthly = formatCurrency(totalIncome - totalExpenses, currency);
  const spineCoveragePct = coveragePctHeader(totalIncome, totalExpenses);
  const spineStatusLabel = statusLabelFromSummary(result.summary.sustainabilityStatus);
  const spineIsSurplus = spineCoveragePct >= 100;
  const spineDeficitSurplusLabel = spineIsSurplus ? 'SURPLUS' : 'DEFICIT';
  const spineStatus = result.summary.sustainabilityStatus;
  const spineStatusChipStyles =
    spineStatus === 'green'
      ? 'bg-[#11B981] text-white border-[#11B981]'
      : spineStatus === 'amber'
        ? 'bg-[#FFAB40] text-[#0D3A1D] border-[#FFAB40]'
        : 'bg-[#DD524C] text-white border-[#DD524C]';
  const spineTotalCapital = formatCurrency(totalCapital, currency);

  useLayoutEffect(() => {
    setSpine({
      slot1: {
        labelDesktop: 'Net Position',
        labelMobile: 'Position',
        value: (
          <span className="inline-flex min-w-0 max-w-full flex-wrap items-center justify-center gap-1">
            <span
              className={`shrink-0 font-bold tabular-nums ${spineIsSurplus ? 'text-[#11B981]' : 'text-[#DD524C]'}`}
            >
              {spineDeficitSurplusLabel} {spineCoveragePct.toFixed(1)}%
            </span>
            <span
              className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider md:text-xs ${spineStatusChipStyles}`}
            >
              {spineStatusLabel}
            </span>
          </span>
        ),
      },
      slot2: {
        labelDesktop: 'Net Monthly Income',
        labelMobile: 'Monthly',
        value: spineNetMonthly,
      },
      slot3: {
        labelDesktop: 'Total Capital',
        labelMobile: 'Capital',
        value: spineTotalCapital,
      },
    });
    return () => setSpine(null);
  }, [
    setSpine,
    spineCoveragePct,
    spineDeficitSurplusLabel,
    spineIsSurplus,
    spineNetMonthly,
    spineTotalCapital,
    spineStatusChipStyles,
    spineStatusLabel,
  ]);

  const reportRef = useRef<HTMLDivElement>(null);
  const reportReadyTokenRef = useRef(0);
  const [pdfAuditMeta, setPdfAuditMeta] = useState<ReportAuditMeta | null>(null);

  const reportStableKey = useMemo(
    () =>
      [
        lionAccessEnabled,
        props.reportClientDisplayName,
        currency,
        monthlyExpenses,
        JSON.stringify(incomeRows),
        JSON.stringify(loansFromAssets),
        JSON.stringify(investmentBuckets),
        JSON.stringify(assetUnlocks),
        result.medianCoverage,
        result.worstMonthCoverage,
        result.summary.sustainabilityStatus,
      ].join('|'),
    [
      lionAccessEnabled,
      props.reportClientDisplayName,
      currency,
      monthlyExpenses,
      incomeRows,
      loansFromAssets,
      investmentBuckets,
      assetUnlocks,
      result.medianCoverage,
      result.worstMonthCoverage,
      result.summary.sustainabilityStatus,
    ]
  );

  useLayoutEffect(() => {
    reportReadyTokenRef.current = beginReportReadyCycle();
  }, [reportStableKey]);

  const scheduleReportReady = useCallback(() => {
    void completeReportReadyCycle(reportReadyTokenRef.current);
  }, []);

  /** Re-run when inputs change while already in print (browser print preview / Playwright). */
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(print)').matches) {
      scheduleReportReady();
    }
  }, [reportStableKey, scheduleReportReady]);

  useEffect(() => {
    return subscribeReportReadyOnPrint(scheduleReportReady);
  }, [scheduleReportReady]);

  /** Playwright calls `emulateMedia({ print })` then `resize`; matchMedia may not emit `change` in all cases. */
  useEffect(() => {
    const onResize = () => {
      if (typeof window !== 'undefined' && window.matchMedia('(print)').matches) {
        scheduleReportReady();
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [scheduleReportReady]);

  const handlePrintReport = async () => {
    const el = reportRef.current;
    if (!el) return;
    let audit!: ReportAuditMeta;
    flushSync(() => {
      audit = createReportAuditMeta({
        modelCode: "INCOME",
        userDisplayName: props.reportClientDisplayName ?? "Client",
      });
      setPdfAuditMeta(audit);
    });
    try {
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready;
      }
    } catch {
      /* ignore */
    }
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
        windowWidth: partEl.scrollWidth,
        windowHeight: partEl.scrollHeight,
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
      stampAllPdfPagesWithAudit(doc, audit);
      doc.save(audit.filename);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  };

  return (
    <div className="cb-body min-h-screen min-w-0 overflow-x-hidden bg-transparent text-[#F6F5F1]">
      {/* On-screen app (hidden when printing) */}
      <div className="no-print">
        <div className="mx-auto w-full max-w-[100%] pt-8 pb-7 px-4 min-[641px]:max-w-[var(--container-tablet-max)] min-[641px]:px-6 min-[641px]:pt-10 min-[641px]:pb-9 min-[1025px]:max-w-[var(--container-desktop-max)] min-[1025px]:px-8 min-[1025px]:pt-12 min-[1025px]:pb-11 min-[1441px]:max-w-[var(--container-wide-max)] min-[1441px]:px-10 min-[1441px]:pt-14 min-[1441px]:pb-14">
          <section aria-label="Expectations setting" className="space-y-5 min-[641px]:space-y-7 min-[1025px]:space-y-9 min-[1441px]:space-y-10">
            <div className="rounded-xl border border-[#FFCC6A]/25 bg-[#163d28] p-4 sm:p-6">
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

          <section aria-label="Details" className="mt-8 space-y-5 min-[641px]:mt-12 min-[641px]:space-y-6 min-[1025px]:mt-16 min-[1025px]:space-y-7 min-[1441px]:mt-20 min-[1441px]:space-y-8">
            <WhatThisMeansBox
              status={result.summary.sustainabilityStatus}
              medianCoverage={result.medianCoverage}
              worstMonthCoverage={result.worstMonthCoverage}
              invalidReason={result.summary.invalidReason}
            />
          </section>

          <section
            aria-label="The Lion's Verdict"
            className="mt-8 min-[641px]:mt-12 min-[1025px]:mt-16 min-[1441px]:mt-20 pb-1 min-[641px]:pb-2"
          >
            <div className="mx-auto max-w-3xl">
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
                currency={currency}
                monthlyIncome={totalIncome}
                monthlyExpense={totalExpenses}
                totalCapital={totalCapital}
                targetCapital={targetCapital}
                coverageRatio={lionSurplusRatio}
                sustainabilityYears={horizonYears}
                depletionPressure={result.summary.sustainabilityStatus}
                modelType="IE"
                pricingReturnModel="incomeengineering"
              />
            </div>
          </section>

          <ModelReportDownloadFooter onDownload={() => void handlePrintReport()} />
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
          loans={loansFromAssets}
          assetUnlocks={assetUnlocks}
          investmentBuckets={investmentBuckets}
          medianCoverage={result.medianCoverage}
          worstMonthCoverage={result.worstMonthCoverage}
          lionAccessEnabled={lionAccessEnabled}
          reportClientDisplayName={props.reportClientDisplayName}
          auditMeta={pdfAuditMeta}
        />
      </div>
    </div>
  );
});

const App = forwardRef<
  IncomeEngineeringAppHandle,
  {
    lionAccessUser?: LionAccessUser;
    reportClientDisplayName?: string;
    initialHydratePayload?: unknown;
  }
>(function App(props, ref) {
  const lionAccessUser = props.lionAccessUser ?? DEFAULT_LION_ACCESS_USER;
  const reportClientDisplayName = props.reportClientDisplayName ?? 'Client';
  return (
    <CalculatorStoreProvider initialHydratePayload={props.initialHydratePayload}>
      <AppInner ref={ref} lionAccessUser={lionAccessUser} reportClientDisplayName={reportClientDisplayName} />
    </CalculatorStoreProvider>
  );
});

export default App;
