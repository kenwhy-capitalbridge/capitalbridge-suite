//Forever Income Model
"use client";

import React, { useEffect, useLayoutEffect, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
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
  Coins,
  Users,
  Timer,
} from "lucide-react";
import SliderInput from "./components/SliderInput";
import { ExpenseType } from "./types";
import { computeForeverResults } from "./foreverModel";
import { formatCurrency, formatPercent } from "./utils/formatters";
import {
  buildLionVerdictClientReportFromForever,
  formatLionPublicStatusLabel,
  parseForeverRunway,
} from "@cb/advisory-graph/lionsVerdict";
import { LionVerdictActive } from "../../../packages/lion-verdict/LionVerdictActive";
import { canAccessLion, type LionAccessUser } from "../../../packages/lion-verdict/access";
import type { Tier } from "../../../packages/lion-verdict/copy";
import type { GetLionVerdictOutput } from "../../../packages/lion-verdict/getLionVerdict";
import { ModelReportDownloadFooter, useModelMetricSpine } from "@cb/ui";
import {
  FOREVER_PRINT_SNAPSHOT_STORAGE_KEY,
  type ForeverPrintSnapshotV1,
} from "@/app/dashboard/print/foreverPrintSnapshot";
import "./index.css";

const DEFAULT_LION_ACCESS_USER: LionAccessUser = { isPaid: true, hasActiveTrialUpgrade: false };

type ForeverAppProps = {
  lionAccessUser?: LionAccessUser;
  reportClientDisplayName?: string;
  /** From profile `advisory_market`; currency selector removed. */
  modelCurrencyPrefix?: string | null;
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
  const reportClientDisplayName = props.reportClientDisplayName ?? "Client";
  const profileCurrencyPrefix = props.modelCurrencyPrefix?.trim() || null;
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
  const [currency, setCurrency] = useState<string>(() =>
    profileCurrencyPrefix && currencies.includes(profileCurrencyPrefix) ? profileCurrencyPrefix : "RM"
  );

  useEffect(() => {
    if (profileCurrencyPrefix && currencies.includes(profileCurrencyPrefix)) {
      setCurrency(profileCurrencyPrefix);
    }
  }, [profileCurrencyPrefix]);

  // Expense & Market States
  const [expense, setExpense] = useState<number>(10000);
  const [expenseType, setExpenseType] = useState<ExpenseType>(ExpenseType.MONTHLY);
  const [familyContribution, setFamilyContribution] = useState<number>(0);
  const [expectedReturn, setExpectedReturn] = useState<number>(7);
  const [inflationRate, setInflationRate] = useState<number>(2);

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

  const results = useMemo(
    () =>
      computeForeverResults({
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
      }),
    [
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
    ],
  );

  const { setSpine } = useModelMetricSpine();
  useLayoutEffect(() => {
    setSpine({
      slot1: {
        labelDesktop: "Target Capital",
        labelMobile: "Target",
        value: results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : "∞",
      },
      slot2: {
        labelDesktop: "Total Assets",
        labelMobile: "Assets",
        value: formatCurrency(results.currentAssets, currency),
      },
      slot3: {
        labelDesktop: "Horizon",
        labelMobile: "Horizon",
        value: results.runway,
      },
    });
    return () => setSpine(null);
  }, [setSpine, results, currency]);

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

  const COLORS = ['#FFCC6A', '#F97316', '#22C55E', '#0D3A1D'];

  const isSurplusState = results.currentAssets >= results.capitalNeeded;
  const capitalDiff = results.isSustainable ? Math.abs(results.currentAssets - results.capitalNeeded) : 0;
  
  // Explicit "Annum" or "Monthly" toggle for income impact text
  const displayImpactLabel = expenseType === ExpenseType.MONTHLY ? 'Monthly' : 'Annum';
  const displayIncomeImpact = expenseType === ExpenseType.MONTHLY 
    ? (capitalDiff * (results.realReturnRate / 100)) / 12 
    : (capitalDiff * (results.realReturnRate / 100));

  /** STEP 11 — single path to v6 print + Playwright PDF; replaces client jsPDF download. */
  const buildPrintSnapshot = (): ForeverPrintSnapshotV1 => ({
    v: 1,
    savedAt: Date.now(),
    inputs: {
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
    },
    results: {
      monthlyExpense: results.monthlyExpense,
      annualExpense: results.annualExpense,
      propertyMonthlyRepayment: results.propertyMonthlyRepayment,
      familyContribution: results.familyContribution,
      expectedReturn: results.expectedReturn,
      inflationRate: results.inflationRate,
      realReturnRate: results.realReturnRate,
      capitalNeeded: Number.isFinite(results.capitalNeeded) ? results.capitalNeeded : null,
      currentAssets: results.currentAssets,
      assetBreakdown: results.assetBreakdown,
      gap: results.gap,
      progressPercent: results.progressPercent,
      isSustainable: results.isSustainable,
      runway: results.runway,
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
    },
  });

  const goToV6PrintReport = () => {
    if (!results.isSustainable) return;
    try {
      sessionStorage.setItem(FOREVER_PRINT_SNAPSHOT_STORAGE_KEY, JSON.stringify(buildPrintSnapshot()));
    } catch {
      /* quota / private mode */
    }
    window.location.assign("/dashboard/print");
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
    <div className="cb-body min-h-screen p-3 sm:p-5 lg:p-10 flex flex-col items-center">
      <main className="w-full max-w-[900px] bg-[#0D3A1D] rounded-3xl border-2 border-[#FFCC6A] shadow-[0_0_50px_rgba(255,204,106,0.1)] overflow-hidden">
        <div className="flex flex-col">
          <div className="p-5 sm:p-7 md:p-10 lg:p-12 bg-black/10 border-b border-[#FFCC6A]/20">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 md:mb-10 lg:mb-12">
              <h2 className="text-xl font-semibold text-[#FFCC6A] flex items-center gap-2 flex-shrink-0">
                <Landmark className="w-5 h-5" /> Forever Income Model
              </h2>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#FFCC6A]/80">
                Currency: <span className="text-[#FFCC6A]">{currency}</span>
              </p>
            </div>

            <div className="mb-6 md:mb-10 lg:mb-12 space-y-5 md:space-y-7 lg:space-y-9">
              <div className="relative flex p-1 bg-emerald-950/50 rounded-xl border border-white/5">
                <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#FFCC6A] rounded-lg transition-all duration-300 ease-in-out shadow-sm ${expenseType === ExpenseType.ANNUAL ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`} />
                <button onClick={() => handleExpenseTypeChange(ExpenseType.MONTHLY)} className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-colors ${expenseType === ExpenseType.MONTHLY ? 'text-[#0D3A1D]' : 'text-gray-400'}`}>
                  <Clock className="w-4 h-4" /> Monthly Expense
                </button>
                <button onClick={() => handleExpenseTypeChange(ExpenseType.ANNUAL)} className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-colors ${expenseType === ExpenseType.ANNUAL ? 'text-[#0D3A1D]' : 'text-gray-400'}`}>
                  <Calendar className="w-4 h-4" /> Annual Expense
                </button>
              </div>

              <div className="space-y-4 md:space-y-6">
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

              <div className="space-y-4 md:space-y-6 p-5 md:p-6 rounded-2xl bg-[#FFCC6A]/5 border border-[#FFCC6A]/20 mt-5 md:mt-8">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                <SliderInput label="Expected ROI %" value={expectedReturn} min={0.1} max={20} step={0.1} unit="%" onChange={setExpectedReturn} />
                <SliderInput label="Inflation Rate %" value={inflationRate} min={0} max={15} step={0.1} unit="%" onChange={setInflationRate} />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7 md:p-10 lg:p-12 flex flex-col relative overflow-hidden">
            <div className="absolute right-[-10%] bottom-[-5%] opacity-[0.03] pointer-events-none transform rotate-[-15deg]">
              <img src="/brand/lionhead_Gold.svg" alt="" className="w-96 h-96 opacity-90" />
            </div>

            <div className="flex justify-between items-start mb-8 md:mb-12 relative z-10">
              <h2 className="text-xl font-semibold text-[#FFCC6A]">Strategic Gap Analysis</h2>
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${status.bgColor} ${status.textColor} text-[10px] font-bold border ${status.borderColor}`}>
                {status.icon} {status.label}
              </span>
            </div>

            <div className="flex-1 flex flex-col relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-6 md:mb-10">
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Target Capital</p>
                  <p className="text-xl font-black text-[#FFCC6A]">{results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : '∞'}</p>
                </div>
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Assets</p>
                  <p className="text-xl font-black text-white">{formatCurrency(results.currentAssets, currency)}</p>
                </div>
                <div className={`p-4 rounded-xl transition-colors duration-500 ${isSurplusState ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-[#0D3A1D]/30 border-[#FFCC6A]/20'} text-center relative overflow-hidden border flex flex-col justify-center min-h-[135px]`}>
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

              <div className="mb-8 md:mb-12">
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mt-8 md:mt-12 text-[10px] uppercase font-bold tracking-tighter">
                {chartData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-black/10 rounded-lg min-h-[50px] border border-white/5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }}></div>
                    <span className="text-gray-400 leading-tight break-words">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      <div className="mt-10 w-full max-w-[900px] px-3 sm:px-5 lg:px-10 md:mt-14 lg:mt-16 pb-2 md:pb-4">
        <div className="mx-auto max-w-3xl text-sm text-gray-200">
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
            currency={currency}
            monthlyIncome={familyContribution}
            monthlyExpense={results.monthlyExpense}
            totalCapital={results.currentAssets}
            targetCapital={foreverLionTargetCapital}
            coverageRatio={surplusRatio}
            sustainabilityYears={foreverLionHorizonYears}
            depletionPressure={foreverLionTier}
            modelType="FOREVER"
            onCopyComputed={setLionCopyPayload}
            pricingReturnModel="forever"
          />
        </div>
      </div>

      <div className="w-full max-w-[900px] px-3 sm:px-5 lg:px-10">
        <ModelReportDownloadFooter
          onDownload={goToV6PrintReport}
          disabled={!results.isSustainable}
          buttonLabel="OPEN PRINT REPORT"
          buttonClassName={
            results.isSustainable
              ? undefined
              : "mx-auto flex min-h-[2.5rem] w-full max-w-[min(100%,28rem)] cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-bold text-gray-500 shadow-none"
          }
        />
        <p className="mt-3 text-center text-[10px] font-normal text-gray-500 px-2">
          Opens the v6 print layout (snapshot saved for this tab). Official file PDF: Playwright capture or browser
          print from that page.
        </p>
      </div>
    </div>
  );
});

export default ForeverApp;
