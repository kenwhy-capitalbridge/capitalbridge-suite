"use client";

import React, {
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useEffect,
} from 'react';
import './index.css';
import { CalculatorStoreProvider, useCalculatorStoreInternals } from './store/useCalculatorStore';
import { runSimulation } from './lib/simulation';
import type { CurrencyCode } from './config/currency';
import { ChromeSpinnerGlyph, ModelReportDownloadFooter, useModelMetricSpine } from '@cb/ui';
import { ExpensesInput } from './components/ExpensesInput';
import { IncomeInputs } from './components/IncomeInputs';
import { AssetsUnlockPanel } from './components/AssetsUnlockPanel';
import { assetUnlocksToLoans } from './lib/assetUnlockToLoans';
import { InvestmentBucketsPanel } from './components/InvestmentBucketsPanel';
import { WhatThisMeansBox } from './components/WhatThisMeansBox';
import { serializeIncomePrintProps } from './incomePrintSnapshot';
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
import { createSupabaseBrowserClient } from '@cb/advisory-graph/supabaseClient';
import { emitCapitalUpdatedSafely } from '@/core/events/capital';

export type IncomeEngineeringAppHandle = {
  getInputs: () => Record<string, unknown>;
  getResults: () => Record<string, unknown>;
  applyInputs: (inputs: Record<string, unknown>, meta?: { fromRollingSave?: boolean }) => void;
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

  const [hasStrategicInterest, setHasStrategicInterest] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setHasStrategicInterest(false);
        return;
      }
      const { data } = await supabase
        .schema('public')
        .from('strategic_interest')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      setHasStrategicInterest(!!data?.length);
    })();
  }, []);

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
      applyInputs: (raw, _meta) => dispatch({ type: 'HYDRATE', payload: raw }),
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

  const [pdfDownloadBusy, setPdfDownloadBusy] = useState(false);

  const handleDownloadPdf = async () => {
    if (pdfDownloadBusy) return;
    const snapshot = serializeIncomePrintProps({
      summary: result.summary,
      currency,
      totalCapital,
      monthlyExpenses,
      incomeRows,
      loans: loansFromAssets,
      assetUnlocks,
      investmentBuckets,
      medianCoverage: result.medianCoverage,
      worstMonthCoverage: result.worstMonthCoverage,
      lionAccessEnabled,
      reportClientDisplayName: props.reportClientDisplayName ?? 'Client',
      hasStrategicInterest,
    });

    setPdfDownloadBusy(true);
    try {
      const startRes = await fetch('/api/income-engineering/report-export/start', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot }),
      });
      const startPayload = (await startRes.json().catch(() => ({}))) as { exportId?: string; error?: unknown };
      if (!startRes.ok) {
        console.error('[income-engineering] report-export/start failed', startRes.status, startPayload);
        window.alert(
          'Could not start PDF export. If this keeps happening, try again later or contact support.',
        );
        return;
      }
      const { exportId } = startPayload;
      if (!exportId) {
        window.alert('PDF export could not be created. Please try again.');
        return;
      }
      emitCapitalUpdatedSafely();
      const pdfRes = await fetch(`/api/income-engineering/report-pdf/${exportId}`, {
        credentials: 'same-origin',
      });
      if (!pdfRes.ok) {
        const raw = await pdfRes.text().catch(() => '');
        let detail = '';
        try {
          const j = JSON.parse(raw) as { error?: unknown };
          if (typeof j.error === 'string' && j.error.trim()) detail = j.error.trim().slice(0, 400);
        } catch {
          detail = raw.trim().slice(0, 320);
        }
        console.error('[income-engineering] report-pdf failed', pdfRes.status, detail || raw.slice(0, 200));
        window.alert(
          detail
            ? `Could not generate the PDF: ${detail}`
            : 'Could not generate the PDF. Please try again. If the problem persists, contact support.',
        );
        return;
      }
      const blob = await pdfRes.blob();
      const cd = pdfRes.headers.get('Content-Disposition');
      let filename = 'IncomeEngineering-Report.pdf';
      const m = cd?.match(/filename="([^"]+)"/);
      if (m?.[1]) filename = m[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[income-engineering] PDF download failed:', e);
      window.alert('PDF download failed. Please check your connection and try again.');
    } finally {
      setPdfDownloadBusy(false);
    }
  };

  return (
    <div className="cb-body min-w-0 overflow-x-hidden bg-transparent text-[#F6F5F1]">
      {/* On-screen app (hidden when printing) */}
      <div className="no-print">
        <div className="mx-auto w-full max-w-[100%] pt-8 pb-7 px-4 min-[641px]:max-w-[var(--container-tablet-max)] min-[641px]:px-6 min-[641px]:pt-10 min-[641px]:pb-9 min-[1025px]:max-w-[var(--container-desktop-max)] min-[1025px]:px-8 min-[1025px]:pt-12 min-[1025px]:pb-11 min-[1441px]:max-w-[var(--container-wide-max)] min-[1441px]:px-10 min-[1441px]:pt-14 min-[1441px]:pb-14">
          <section aria-label="Expectations setting" className="space-y-5 min-[641px]:space-y-7 min-[1025px]:space-y-9 min-[1441px]:space-y-10">
            <div className="rounded-xl border border-[#FFCC6A]/25 bg-[#163d28] p-4 sm:p-6">
              <h2 className="font-serif-section mb-1 text-base font-bold uppercase sm:text-lg">Expectations Setting</h2>
              <p className="mb-1 text-xs text-[#B8B5AE] opacity-90">Define your lifestyle goal and planning assumptions</p>
              <p className="mb-4 text-[11px] leading-relaxed text-[#B8B5AE] opacity-80 break-words sm:text-xs">
                Currency matches your advisory region (change on the Capital Bridge platform profile).
              </p>
              <div className="space-y-5">
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
              currency={currency}
              summary={result.summary}
              totalCapital={totalCapital}
              loans={loansFromAssets}
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

          <ModelReportDownloadFooter
            onDownload={() => void handleDownloadPdf()}
            disabled={pdfDownloadBusy}
            buttonLabel={pdfDownloadBusy ? 'GENERATING…' : undefined}
            buttonLeading={pdfDownloadBusy ? <ChromeSpinnerGlyph sizePx={16} /> : undefined}
          />
        </div>
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
    /** From profile `advisory_market`; no in-app currency toggle. */
    initialCurrencyCode?: CurrencyCode;
  }
>(function App(props, ref) {
  const lionAccessUser = props.lionAccessUser ?? DEFAULT_LION_ACCESS_USER;
  const reportClientDisplayName = props.reportClientDisplayName ?? 'Client';
  return (
    <CalculatorStoreProvider
      initialHydratePayload={props.initialHydratePayload}
      initialCurrency={props.initialCurrencyCode}
    >
      <AppInner ref={ref} lionAccessUser={lionAccessUser} reportClientDisplayName={reportClientDisplayName} />
    </CalculatorStoreProvider>
  );
});

export default App;
