//Capital Health Model
"use client";
import React, { useState, useMemo, useCallback, useRef, forwardRef, useImperativeHandle, useLayoutEffect } from 'react';
import './index.css';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from 'recharts';
import { Printer } from 'lucide-react';
import {
  CURRENCIES,
  PRESETS,
  type CalculatorInputs,
  type RiskPreset,
} from './calculator-types';
import { applyPreset } from './calculator-engine';
import { useCalculatorResults } from './src/hooks/useCalculatorResults';
import { TapToReveal, TapToRevealProvider } from './src/components/TapToReveal';
import { MID_RETURN_WARN_PCT, EPS_MONEY, EPS_RETURN } from './src/lib/constants';
import { exportCapitalHealthReport } from './src/lib/exportCapitalHealthReport';
import { SECTIONS, getHealthScoreCopy } from './src/lib/capitalHealthCopy';
import {
  buildLionVerdictClientReportFromCapitalHealth,
  capitalHealthVerdictExportText,
  formatLionPublicStatusLabel,
  lionPublicStatusFromScore0to100,
  lionStrongEligibilityFromHealthTier,
  runLionVerdictEngineCapitalHealth,
} from '@cb/advisory-graph/lionsVerdict';
import { LionVerdictActive } from "../../../packages/lion-verdict/LionVerdictActive";
import { canAccessLion, type LionAccessUser } from "../../../packages/lion-verdict/access";
import type { Tier } from "../../../packages/lion-verdict/copy";
import { CapitalStrengthBar } from './src/components/CapitalStrengthBar';
import { runSimulation } from './calculator-engine';
import { getRiskTier } from './src/lib/riskTier';
import { useModelMetricSpine } from '@cb/ui';

/** Coloured rectangular risk badge: label only (e.g. Critical). Institutional, no tier numbers. */
function RiskTierBadge({ tier, label }: { tier: number; label: string }) {
  const base = {
    borderRadius: 4,
    padding: '2px 8px',
    fontWeight: 600,
    letterSpacing: '0.3px',
    fontSize: 'clamp(10px, 1.2vw, 13px)',
    maxWidth: '100%',
  } as const;
  const tierStyle =
    tier === 1
      ? { backgroundColor: '#55B685', color: '#FFFFFF' }
      : tier === 2
        ? { backgroundColor: '#9BCF8E', color: '#0D3A1D' }
        : tier === 3
          ? { backgroundColor: '#F3AF56', color: '#0D3A1D' }
          : tier === 4
          ? { backgroundColor: '#D9A441', color: '#0D3A1D' }
            : { backgroundColor: '#CD5B52', color: '#FFFFFF' };
  return (
    <span className="inline-block w-fit max-w-full" style={{ ...base, ...tierStyle }}>
      {label}
    </span>
  );
}

function scrollToInput(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function calculateSurvivalAge(currentAge: number | null, runwayYears: number | null): number | null {
  if (currentAge == null || runwayYears == null) return null;
  return currentAge + runwayYears;
}

function mapCapitalHealthStatusToTier(status?: string): Tier {
  switch (status) {
    case 'Very Strong':
      return 'STRONG';
    case 'Strong':
      return 'STABLE';
    case 'Moderate':
      return 'FRAGILE';
    case 'Weak':
      return 'AT_RISK';
    default:
      return 'NOT_SUSTAINABLE';
  }
}

/** Format depletion months as "X years Y months" (no decimal years). */
function formatRunwayYearsMonths(months: number | null): string {
  if (months == null || months >= 1200) return 'Perpetual';
  const y = Math.floor(months / 12);
  const m = Math.round(months % 12);
  if (y === 0 && m === 0) return 'Perpetual';
  if (y === 0) return `${m} months`;
  if (m === 0) return `${y} years`;
  return `${y} years ${m} months`;
}

/** Format decimal years (e.g. 38.6) as "X years Y months". */
function formatRunwayFromDecimalYears(yearsDecimal: number): string {
  const y = Math.floor(yearsDecimal);
  const m = Math.round((yearsDecimal % 1) * 12);
  if (m === 0) return `${y} years`;
  if (y === 0) return `${m} months`;
  return `${y} years ${m} months`;
}

const defaultInputs: CalculatorInputs = {
  mode: 'withdrawal',
  currency: CURRENCIES[0],
  riskPreset: 'balanced',
  targetMonthlyIncome: 10000,
  targetFutureCapital: 2000000,
  timeHorizonYears: 10,
  startingCapital: 500000,
  expectedAnnualReturnPct: PRESETS.balanced.annualReturn,
  monthlyTopUp: 0,
  inflationEnabled: false,
  inflationPct: 1.5,
  cashBufferPct: PRESETS.balanced.cashBufferPct,
  cashAPY: PRESETS.balanced.cashAPY,
  reinvestmentSplitPct: PRESETS.balanced.reinvestmentSplitPct,
  withdrawalRule: 'fixed',
  withdrawalPctOfCapital: PRESETS.balanced.withdrawalPctOfCapital,
  yieldBoost: 'balanced',
};

/** Desired monthly income slider: step per month by currency (RM 1k increment). Slider value is yearly so step = stepMonthly * 12. */
const DESIRED_INCOME_STEP_MONTHLY: Record<string, number> = {
  RM: 1_000,
  SGD: 500,
  USD: 500,
  AUD: 500,
  RMB: 2_000,
  HKD: 2_000,
  THB: 5_000,
  PHP: 10_000,
};

/** Desired monthly income slider: max per month by currency (same quantum as RM 200k). Slider value is yearly so max = maxMonthly * 12. */
const DESIRED_INCOME_MAX_MONTHLY: Record<string, number> = {
  RM: 200_000,
  SGD: 100_000,
  USD: 100_000,
  AUD: 100_000,
  RMB: 500_000,
  HKD: 500_000,
  THB: 1_000_000,
  PHP: 1_000_000,
};

/** Desired monthly income default per currency (used when switching currency). */
const DESIRED_MONTHLY_INCOME_DEFAULT: Record<string, number> = {
  RM: 10_000,
  SGD: 5_000,
  USD: 5_000,
  AUD: 5_000,
  RMB: 30_000,
  HKD: 30_000,
  THB: 80_000,
  PHP: 150_000,
};

/** Desired future capital slider config by currency: default, max, step */
const FUTURE_CAPITAL_SLIDER: Record<string, { default: number; max: number; step: number }> = {
  RM: { default: 2_000_000, max: 20_000_000, step: 100_000 },
  SGD: { default: 2_000_000, max: 20_000_000, step: 100_000 },
  USD: { default: 2_000_000, max: 20_000_000, step: 100_000 },
  AUD: { default: 2_000_000, max: 20_000_000, step: 100_000 },
  RMB: { default: 3_500_000, max: 35_000_000, step: 200_000 },
  HKD: { default: 4_000_000, max: 40_000_000, step: 200_000 },
  THB: { default: 16_000_000, max: 160_000_000, step: 1_000_000 },
  PHP: { default: 30_000_000, max: 300_000_000, step: 1_000_000 },
};

/** Starting capital slider config by currency: default, max, step */
const STARTING_CAPITAL_SLIDER: Record<string, { default: number; max: number; step: number }> = {
  RM: { default: 500_000, max: 20_000_000, step: 100_000 },
  SGD: { default: 200_000, max: 20_000_000, step: 100_000 },
  USD: { default: 200_000, max: 20_000_000, step: 100_000 },
  AUD: { default: 200_000, max: 20_000_000, step: 100_000 },
  RMB: { default: 800_000, max: 35_000_000, step: 200_000 },
  HKD: { default: 800_000, max: 40_000_000, step: 200_000 },
  THB: { default: 4_000_000, max: 160_000_000, step: 1_000_000 },
  PHP: { default: 8_000_000, max: 300_000_000, step: 1_000_000 },
};

/** Monthly top-up slider config by currency: default, max, step */
const MONTHLY_TOPUP_SLIDER: Record<string, { default: number; max: number; step: number }> = {
  RM: { default: 5_000, max: 50_000, step: 1_000 },
  SGD: { default: 1_500, max: 20_000, step: 400 },
  USD: { default: 1_000, max: 15_000, step: 300 },
  AUD: { default: 1_500, max: 15_000, step: 300 },
  RMB: { default: 8_000, max: 80_000, step: 2_000 },
  HKD: { default: 10_000, max: 100_000, step: 2_000 },
  THB: { default: 30_000, max: 300_000, step: 5_000 },
  PHP: { default: 70_000, max: 600_000, step: 15_000 },
};

function formatNum(n: number, decimals = 0): string {
  const x = Number.isFinite(n) ? n : 0;
  return x.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Compact format for large amounts: 1.2m, 850k; full value for tooltips. */
function formatCurrencyCompact(symbol: string, val: number): string {
  if (val >= 1_000_000) return `${symbol} ${(val / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (val >= 100_000) return `${symbol} ${Math.round(val / 1_000)}k`;
  return `${symbol} ${formatNum(val)}`;
}

function parseNum(s: string): number {
  const v = parseFloat(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(v) ? v : 0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Guardrail bounds for solver Apply actions */
const START_CAPITAL_MIN = 0;
const START_CAPITAL_MAX = 1_000_000_000;
const MONTHLY_TOPUP_MIN = 0;
const MONTHLY_TOPUP_MAX = 5_000_000;
const EXPECTED_RETURN_MIN = 0.1;
const EXPECTED_RETURN_MAX = 40;

const HISTORY_SIZE = 10;

export type CapitalHealthAppHandle = {
  getInputs: () => Record<string, unknown>;
  getResults: () => Record<string, unknown>;
  applyInputs: (inputs: Record<string, unknown>) => void;
};

const DEFAULT_LION_ACCESS_USER: LionAccessUser = { isPaid: true, hasActiveTrialUpgrade: false };

type CapitalHealthAppProps = {
  canSeeVerdict?: boolean;
  lionAccessUser?: LionAccessUser;
  reportClientDisplayName?: string;
};

type CapitalHealthVerdictBundle = {
  engine: ReturnType<typeof runLionVerdictEngineCapitalHealth>;
  publicLabel: string;
  text: string;
};

export default forwardRef<CapitalHealthAppHandle, CapitalHealthAppProps>(function App(props, ref) {
  const lionAccessUser = props.lionAccessUser ?? DEFAULT_LION_ACCESS_USER;
  return (
    <CalculatorScreen
      ref={ref}
      canSeeVerdict={props.canSeeVerdict ?? true}
      lionAccessUser={lionAccessUser}
      reportClientDisplayName={props.reportClientDisplayName ?? 'Client'}
    />
  );
});

const CalculatorScreen = forwardRef<
  CapitalHealthAppHandle,
  { canSeeVerdict: boolean; lionAccessUser: LionAccessUser; reportClientDisplayName: string }
>(function CalculatorScreen(
  props,
  ref
) {
  const { lionAccessUser, canSeeVerdict, reportClientDisplayName } = props;
  const [inputs, setInputsRaw] = useState<CalculatorInputs>(defaultInputs);
  const [history, setHistory] = useState<CalculatorInputs[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [currentAge, setCurrentAge] = useState<number | null>(35);
  const [stressTestExpanded, setStressTestExpanded] = useState(false);
  const [stressPulseOn, setStressPulseOn] = useState(true);
  const handleToggleStressTest = () => {
    const willExpand = !stressTestExpanded;
    setStressTestExpanded(willExpand);
    if (willExpand) {
      setStressPulseOn(false);
      setTimeout(() => {
        document.querySelector('.stress-test-cards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  };
  /** When switching to growth we overwrite horizon with 10; restore this when switching back to withdrawal. */
  const lastWithdrawalHorizonYearsRef = useRef<number | null>(null);

  const setInputs = useCallback((updater: (prev: CalculatorInputs) => CalculatorInputs) => {
    setInputsRaw((prev) => {
      const next = updater(prev);
      setHistory((h) => [prev, ...h].slice(0, HISTORY_SIZE));
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const [last, ...rest] = h;
      setInputsRaw(last);
      return rest;
    });
    setToast('Reverted to previous inputs.');
    setTimeout(() => setToast(null), 2500);
  }, []);

  const result = useCalculatorResults(inputs);
  const lionAccessEnabled = canAccessLion(lionAccessUser);
  const lionSeedUserId = useMemo(
    () => (typeof window !== 'undefined' ? window.location.hostname : 'capital-health'),
    [],
  );

  const applySavedInputs = useCallback((raw: Record<string, unknown>) => {
    if (!raw || typeof raw !== "object") return;
    const p = raw as Partial<CalculatorInputs>;
    setInputsRaw((prev) => {
      const next = { ...prev, ...p } as CalculatorInputs;
      const cur = p.currency;
      if (cur && typeof cur === "object" && cur !== null && "code" in cur) {
        const code = String((cur as { code: string }).code);
        const match = CURRENCIES.find((c) => c.code === code);
        if (match) next.currency = match;
      }
      return next;
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getInputs: () => JSON.parse(JSON.stringify(inputs)) as Record<string, unknown>,
      getResults: () => {
        try {
          const base = JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
          if (props.canSeeVerdict && lionAccessEnabled) {
            const mode = inputs.mode;
            const tier = Math.min(5, Math.max(1, result.riskMetrics.riskTier)) as 1 | 2 | 3 | 4 | 5;
            const runwayYears =
              inputs.mode === 'withdrawal' && result.depletionMonth != null
                ? (result.depletionMonth / 12).toFixed(1)
                : undefined;
            const vars = {
              withdrawal:
                inputs.mode === 'withdrawal'
                  ? `${inputs.currency.symbol} ${formatNum(inputs.targetMonthlyIncome)}`
                  : undefined,
              desiredCapital:
                inputs.mode === 'growth'
                  ? `${inputs.currency.symbol} ${formatNum(inputs.targetFutureCapital)}`
                  : undefined,
              horizon: `${Number(inputs.timeHorizonYears).toFixed(1)}`,
              runway: runwayYears,
              expectedReturn: `${formatNum(inputs.expectedAnnualReturnPct, 1)}%`,
              estimatedReturn: `${formatNum(inputs.expectedAnnualReturnPct, 1)}%`,
            };
            const fmt = (n: number) => `${inputs.currency.symbol} ${formatNum(n)}`;
            base.lionVerdictClient = buildLionVerdictClientReportFromCapitalHealth(
              {
                mode,
                tier,
                vars,
                startingCapital: inputs.startingCapital,
                targetMonthlyIncome: inputs.targetMonthlyIncome,
                targetFutureCapital: inputs.targetFutureCapital,
                passiveIncomeMonthly: result.passiveIncomeMonthly,
                nominalCapitalAtHorizon: result.nominalCapitalAtHorizon,
                coveragePct: result.coveragePct,
              },
              { formatCurrency: fmt },
            );
          }
          return base;
        } catch {
          return {};
        }
      },
      applyInputs: (raw) => applySavedInputs(raw),
    }),
    [inputs, result, applySavedInputs, props.canSeeVerdict, lionAccessEnabled]
  );

  const formatCurrency = useCallback(
    (val: number) => `${inputs.currency.symbol} ${formatNum(val)}`,
    [inputs.currency]
  );

  const formatCurrencyCompactDisplay = useCallback(
    (val: number) => formatCurrencyCompact(inputs.currency.symbol, val),
    [inputs.currency]
  );

  /** Compact on narrow viewports (e.g. RM 7.34m), full in tooltip and on sm+ */
  const formatCurrencyResponsive = useCallback(
    (val: number) => {
      if (val < 100_000) return formatCurrency(val);
      return (
        <span title={formatCurrency(val)}>
          <span className="sm:hidden">{formatCurrencyCompactDisplay(val)}</span>
          <span className="hidden sm:inline">{formatCurrency(val)}</span>
        </span>
      );
    },
    [formatCurrency, formatCurrencyCompactDisplay]
  );

  const resultsChartTooltip = useCallback(
    (tp: TooltipContentProps) => {
      const { active, payload } = tp;
      if (!active || !payload?.length) return null;
      const row = payload[0]?.payload as { month?: number; nominal?: number } | undefined;
      if (row == null || typeof row.month !== 'number' || typeof row.nominal !== 'number') return null;
      const mo = row.month;
      const years = (mo / 12).toFixed(1);
      return (
        <div className="rounded border border-[#FFCC6A] bg-[#0D3A1D] px-2.5 py-2 text-[10px] sm:text-xs text-[#FFCC6A] shadow-lg">
          <div className="text-[#F6F5F1]">
            Time: {years} yr ({mo} mo)
          </div>
          <div className="mt-0.5">Capital : {formatCurrency(row.nominal)}</div>
        </div>
      );
    },
    [formatCurrency]
  );

  const update = useCallback((patch: Partial<CalculatorInputs>) => {
    setInputsRaw((prev) => {
      const next = { ...prev, ...patch };
      setHistory((h) => [prev, ...h].slice(0, HISTORY_SIZE));
      return next;
    });
  }, []);

  /** Apply solver suggestion: starting capital — clamp [0, 1B], round to nearest 100 */
  const applyStartCapital = useCallback(
    (v: number) => {
      const next = Math.round(clamp(v, START_CAPITAL_MIN, START_CAPITAL_MAX) / 100) * 100;
      update({ startingCapital: next });
      scrollToInput('input-start-capital');
    },
    [update]
  );

  /** Apply solver suggestion: monthly top-up — clamp [0, 5M], round to nearest 100 */
  const applyMonthlyTopUp = useCallback(
    (v: number) => {
      const next = Math.round(clamp(v, MONTHLY_TOPUP_MIN, MONTHLY_TOPUP_MAX) / 100) * 100;
      update({ monthlyTopUp: next });
      scrollToInput('input-monthly-topup');
    },
    [update]
  );

  const setPreset = useCallback(
    (preset: RiskPreset) => {
      const patch = applyPreset(preset, inputs.mode);
      update({ ...patch });
      setToast(`${preset.charAt(0).toUpperCase() + preset.slice(1)} preset applied. You can still edit details.`);
      setTimeout(() => setToast(null), 3000);
    },
    [inputs.mode, update]
  );

  const setMode = useCallback(
    (mode: 'growth' | 'withdrawal') => {
      const patch = applyPreset(inputs.riskPreset, mode);
      setInputsRaw((prev) => {
        if (mode === 'growth' && prev.mode === 'withdrawal') {
          lastWithdrawalHorizonYearsRef.current = prev.timeHorizonYears;
        }
        const restoredWithdrawalHorizon = lastWithdrawalHorizonYearsRef.current;
        const timeHorizonYears =
          mode === 'growth'
            ? 10
            : (restoredWithdrawalHorizon ?? prev.timeHorizonYears);
        const next = {
          ...prev,
          mode,
          ...patch,
          targetMonthlyIncome: prev.targetMonthlyIncome,
          targetFutureCapital: prev.targetFutureCapital,
          startingCapital: prev.startingCapital,
          expectedAnnualReturnPct: patch.expectedAnnualReturnPct ?? prev.expectedAnnualReturnPct,
          timeHorizonYears,
        };
        setHistory((h) => [prev, ...h].slice(0, HISTORY_SIZE));
        return next;
      });
    },
    [inputs.riskPreset]
  );

  const targetDisplay = inputs.mode === 'withdrawal' ? inputs.targetMonthlyIncome : inputs.targetFutureCapital;
  const outcomeDisplay = inputs.mode === 'withdrawal' ? result.currentOutcome : result.nominalCapitalAtHorizon;
  const netDisplay = inputs.mode === 'withdrawal'
    ? result.passiveIncomeMonthly - inputs.targetMonthlyIncome
    : result.nominalCapitalAtHorizon - inputs.targetFutureCapital;

  const coverageDisplay = result.coveragePct;

  const horizonYearsFormatted = Number(inputs.timeHorizonYears).toFixed(1);

  const chartData = useMemo(() => {
    return result.monthlySnapshots
      .filter((_, i) => i % (Math.max(1, Math.floor(result.monthlySnapshots.length / 60)) || 1) === 0)
      .map((s, i) => ({
        month: s.monthIndex,
        nominal: s.totalCapital,
        real: s.totalCapital,
        withdrawal: s.withdrawalPaid,
        target: inputs.mode === 'withdrawal' ? inputs.targetMonthlyIncome : null,
      }));
  }, [result.monthlySnapshots, inputs.mode, inputs.targetMonthlyIncome]);

  const lionVerdictBundle = useMemo(() => {
    if (!lionAccessEnabled) return null;
    const mode = inputs.mode;
    const tier = Math.min(5, Math.max(1, result.riskMetrics.riskTier)) as 1 | 2 | 3 | 4 | 5;
    const runwayYears =
      inputs.mode === 'withdrawal' && result.depletionMonth != null
        ? (result.depletionMonth / 12).toFixed(1)
        : undefined;
    const vars = {
      withdrawal:
        inputs.mode === 'withdrawal'
          ? formatCurrency(inputs.targetMonthlyIncome)
          : undefined,
      desiredCapital:
        inputs.mode === 'growth'
          ? formatCurrency(inputs.targetFutureCapital)
          : undefined,
      horizon: `${Number(inputs.timeHorizonYears).toFixed(1)}`,
      runway: runwayYears,
      expectedReturn: `${formatNum(inputs.expectedAnnualReturnPct, 1)}%`,
      estimatedReturn: `${formatNum(inputs.expectedAnnualReturnPct, 1)}%`,
    };
    const engine = runLionVerdictEngineCapitalHealth(mode, tier, vars);
    const publicLabel = formatLionPublicStatusLabel(
      lionPublicStatusFromScore0to100(
        engine.score0to100,
        lionStrongEligibilityFromHealthTier(tier, mode, vars),
      ),
    );
    return {
      text: capitalHealthVerdictExportText(mode, tier, vars),
      engine,
      publicLabel,
    };
  }, [
    lionAccessEnabled,
    inputs.mode,
    inputs.targetMonthlyIncome,
    inputs.targetFutureCapital,
    inputs.timeHorizonYears,
    inputs.expectedAnnualReturnPct,
    result.riskMetrics.riskTier,
    result.depletionMonth,
    formatCurrency,
  ]);
  const lionScore = lionVerdictBundle?.engine.score0to100 ?? 0;
  const lionTierLabel = mapCapitalHealthStatusToTier(lionVerdictBundle?.engine.status);
  const lionConfidenceScore = Math.min(1, Math.max(0, lionScore / 100));
  const lionSurplusRatio = Math.min(1, Math.max(0, result.coveragePct / 100));
  const lionRiskTolerance = lionSurplusRatio;
  const targetCapital = inputs.mode === 'growth' ? inputs.targetFutureCapital : inputs.targetMonthlyIncome * 12;
  const projectedCapital =
    inputs.mode === 'growth' ? result.nominalCapitalAtHorizon : inputs.startingCapital;
  const gapAmount = Math.max(0, targetCapital - projectedCapital);
  const progressPercent = targetCapital > 0 ? Math.min(100, (projectedCapital / targetCapital) * 100) : 0;
  const depletionYears =
    inputs.mode === 'withdrawal' && result.depletionMonth != null
      ? result.depletionMonth / 12
      : undefined;
  const horizonLabel =
    inputs.mode === 'withdrawal'
      ? depletionYears != null
        ? formatRunwayFromDecimalYears(depletionYears)
        : 'Perpetual'
      : `${Number(inputs.timeHorizonYears).toFixed(1)} years`;
  const stressTestScenarios = useMemo(() => {
    const baseReturn = inputs.expectedAnnualReturnPct;
    const bearReturn = Math.max(baseReturn - 4, 0);
    const bullReturn = baseReturn + 2;
    const baseInputs = { ...inputs };
    const scenarios = [
      {
        label: 'Bear Market',
        returnPct: bearReturn,
        relationshipLabel: 'Base −4%',
        inputs: { ...baseInputs, expectedAnnualReturnPct: bearReturn },
      },
      {
        label: 'Base Case',
        returnPct: baseReturn,
        relationshipLabel: 'Expected Return',
        inputs: { ...baseInputs, expectedAnnualReturnPct: baseReturn },
      },
      {
        label: 'Bull Market',
        returnPct: bullReturn,
        relationshipLabel: 'Base +2%',
        inputs: { ...baseInputs, expectedAnnualReturnPct: bullReturn },
      },
    ];
    return scenarios.map((s) => {
      const sim = runSimulation(s.inputs);
      const coveragePct =
        inputs.mode === 'withdrawal'
          ? sim.coveragePct
          : inputs.targetFutureCapital > 0
            ? (sim.nominalCapitalAtHorizon / inputs.targetFutureCapital) * 100
            : 100;
      const survivalPct = Math.min(100, Math.max(0, coveragePct));
      const tierResult = getRiskTier(survivalPct);
      const runwayYears =
        inputs.mode === 'withdrawal' && sim.depletionMonth != null
          ? sim.depletionMonth / 12
          : null;
      return {
        label: s.label,
        returnPct: s.returnPct,
        relationshipLabel: s.relationshipLabel,
        runwayYears,
        endingCapital: sim.nominalCapitalAtHorizon,
        tier: tierResult.tier,
        tierLabel: tierResult.label,
      };
    });
  }, [
    inputs.mode,
    inputs.expectedAnnualReturnPct,
    inputs.timeHorizonYears,
    inputs.targetFutureCapital,
    inputs.startingCapital,
    inputs.targetMonthlyIncome,
    inputs.monthlyTopUp,
    inputs.inflationEnabled,
    inputs.inflationPct,
    inputs.cashBufferPct,
    inputs.cashAPY,
  ]);

  const handlePrintOrSaveReport = useCallback(async () => {
    setReportGenerating(true);
    setReportReady(false);
    try {
      const chartPoints = chartData.map(({ month, nominal }) => ({ month, nominal }));
      await exportCapitalHealthReport({
        inputs,
        result,
        chartPoints,
        currentAge: currentAge ?? undefined,
        includeLionsVerdict: lionAccessEnabled,
        reportClientDisplayName,
      });
      setReportReady(true);
    } finally {
      setReportGenerating(false);
    }
  }, [inputs, result, chartData, lionAccessEnabled, currentAge, reportClientDisplayName]);

  const capitalHealthSlot3RunwayValue = useMemo(() => {
    if (inputs.mode === 'growth') return `${horizonYearsFormatted} years`;
    if (result.runwayPhrase.startsWith('Forever Income')) return 'Forever Income';
    if (result.depletionMonth != null) return formatRunwayYearsMonths(result.depletionMonth);
    const rp = result.runwayPhrase;
    const runsOutMatch = rp.match(/Runs out in (\d+) years (\d+) months/);
    if (runsOutMatch) return `${runsOutMatch[1]} years ${runsOutMatch[2]} months`;
    const approxMatch = rp.match(/≈(\d+) years(?: (\d+) months)?/);
    if (approxMatch) {
      const y = Number(approxMatch[1]);
      const m = approxMatch[2] ? Number(approxMatch[2]) : 0;
      return m === 0 ? `${y} years` : `${y} years ${m} months`;
    }
    return rp;
  }, [inputs.mode, result.runwayPhrase, result.depletionMonth, horizonYearsFormatted]);

  const { setSpine } = useModelMetricSpine();
  const sustainableIncomeMonthly = (result as { sustainableIncomeMonthly?: number }).sustainableIncomeMonthly ?? 0;
  const incomeGapMonthly = Math.max(0, inputs.targetMonthlyIncome - sustainableIncomeMonthly);
  const slot2ValueStr =
    inputs.mode === 'withdrawal'
      ? `${formatCurrency(incomeGapMonthly)} / mo`
      : formatCurrency(inputs.targetFutureCapital);

  useLayoutEffect(() => {
    setSpine({
      slot1: {
        labelDesktop: 'Risk Level',
        labelMobile: 'Risk',
        value: <RiskTierBadge tier={result.riskMetrics.riskTier} label={result.riskMetrics.riskTierLabel} />,
      },
      slot2: {
        labelDesktop: inputs.mode === 'withdrawal' ? 'Income Gap' : 'Desired Capital',
        labelMobile: inputs.mode === 'withdrawal' ? 'Gap' : 'Target',
        value: slot2ValueStr,
      },
      slot3: {
        labelDesktop: inputs.mode === 'withdrawal' ? SECTIONS.downsideHorizon : 'Time Horizon',
        labelMobile: inputs.mode === 'withdrawal' ? 'Runway' : 'Horizon',
        value: capitalHealthSlot3RunwayValue,
      },
    });
    return () => setSpine(null);
  }, [
    setSpine,
    inputs.mode,
    result.riskMetrics.riskTier,
    result.riskMetrics.riskTierLabel,
    slot2ValueStr,
    capitalHealthSlot3RunwayValue,
  ]);

  return (
    <TapToRevealProvider>
    <div className="cb-body min-h-screen bg-transparent text-[#F6F5F1] overflow-x-hidden">
      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#FFCC6A] text-[#0D3A1D] px-4 py-2 rounded-lg text-sm font-semibold shadow-lg z-[100] pill-transition"
          role="status"
        >
          {toast}
        </div>
      )}

      <main id="calculator-panel" className="max-w-4xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8 md:pt-10 pb-5 sm:pb-8 md:pb-10 space-y-5 sm:space-y-6 md:space-y-10 lg:space-y-14" role="tabpanel" aria-labelledby={inputs.mode === 'growth' ? 'mode-growth' : 'mode-withdrawal'}>
        {/* Mode selector */}
        <section className="bg-[#0D3A1D] rounded-xl border border-[#FFCC6A] p-2 sm:p-4 text-white text-center sm:text-left mt-4 sm:mt-6">
          <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#FFCC6A] mb-2 sm:mb-3">
            Model Mode
          </h2>
          <div className="flex rounded-lg border border-[#FFCC6A] p-0.5 sm:p-1 bg-white/10" role="tablist" aria-label="Model Mode">
            <button
              type="button"
              role="tab"
              aria-selected={inputs.mode === 'growth'}
              aria-controls="calculator-panel"
              id="mode-growth"
              onClick={() => setMode('growth')}
              className={`flex-1 py-1.5 px-2 sm:py-2 sm:px-3 text-[10px] sm:text-sm font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] ${
                inputs.mode === 'growth' ? 'bg-[#FFCC6A] text-[#0D3A1D]' : 'text-white hover:bg-[#FFCC6A]/20'
              }`}
            >
              Compounding Growth
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inputs.mode === 'withdrawal'}
              aria-controls="calculator-panel"
              id="mode-withdrawal"
              onClick={() => setMode('withdrawal')}
              className={`flex-1 py-1.5 px-2 sm:py-2 sm:px-3 text-[10px] sm:text-sm font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] ${
                inputs.mode === 'withdrawal' ? 'bg-[#FFCC6A] text-[#0D3A1D]' : 'text-white hover:bg-[#FFCC6A]/20'
              }`}
            >
              Monthly Withdrawal
            </button>
          </div>
        </section>

        {/* Currency strip */}
        <section className="bg-[#0D3A1D] rounded-xl border border-[#FFCC6A] p-4 text-center sm:text-left">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFCC6A] mb-2">
            Currency
          </h2>
          <div className="flex flex-nowrap gap-1 sm:flex-wrap sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => update({
                  currency: c,
                  startingCapital: (STARTING_CAPITAL_SLIDER[c.code] ?? STARTING_CAPITAL_SLIDER.USD).default,
                  targetMonthlyIncome: DESIRED_MONTHLY_INCOME_DEFAULT[c.code] ?? DESIRED_MONTHLY_INCOME_DEFAULT.USD,
                })}
                className={`flex-shrink-0 px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] ${
                  inputs.currency.code === c.code
                    ? 'bg-[#FFCC6A] text-[#0D3A1D] border-[#FFCC6A]'
                    : 'bg-[#0D3A1D] border-[#FFCC6A] text-[#F6F5F1] hover:border-[#FFCC6A]'
                }`}
              >
                {c.code}
              </button>
            ))}
                    </div>
        </section>

        {/* Section A — Expectations */}
        <section className="bg-[#0D3A1D] rounded-xl border border-[#FFCC6A] p-4 text-white">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFCC6A] mb-4 flex items-center justify-center sm:justify-start gap-2">
            <img src="/brand/lionhead_Gold.svg" alt="" className="h-4 w-4" aria-hidden />
            Expectations
          </h2>
          {inputs.mode === 'withdrawal' ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                Desired Monthly Income
              </label>
              <div className="flex items-center gap-2 border border-[#FFCC6A]/50 rounded-lg overflow-hidden bg-[#F0F7F0] focus-within:border-[#FFCC6A]">
                <span className="pl-3 text-[#0D3A1D] font-semibold">{inputs.currency.symbol}</span>
                        <input 
                          type="text"
                  inputMode="decimal"
                  value={formatNum(inputs.targetMonthlyIncome)}
                  onChange={(e) => {
                    const v = parseNum(e.target.value);
                    update({ targetMonthlyIncome: v });
                  }}
                  className="flex-1 py-2 pl-2 pr-3 bg-transparent text-[#0D3A1D] min-w-0 focus:outline-none"
                  aria-label="Desired Monthly Income"
                        />
                      </div>
              {(() => {
                const config = FUTURE_CAPITAL_SLIDER[inputs.currency.code] ?? FUTURE_CAPITAL_SLIDER.USD;
                const stepMonthly = DESIRED_INCOME_STEP_MONTHLY[inputs.currency.code] ?? 500;
                const maxYearly =
                  DESIRED_INCOME_MAX_MONTHLY[inputs.currency.code] != null
                    ? DESIRED_INCOME_MAX_MONTHLY[inputs.currency.code] * 12
                    : config.max;
                const yearlyIncome = inputs.targetMonthlyIncome * 12;
                const value = Math.min(maxYearly, Math.max(0, yearlyIncome));
                return (
                    <input 
                      type="range" 
                    min={0}
                    max={maxYearly}
                    step={stepMonthly * 12}
                    value={value}
                    onChange={(e) => update({ targetMonthlyIncome: Number(e.target.value) / 12 })}
                    className="w-full mt-2"
                    aria-label="Desired Income Slider"
                  />
                );
              })()}
            </div>
          ) : null}
          {inputs.mode === 'growth' && (
            <div className="space-y-2 mt-4">
              <label className="block text-sm font-medium text-white">Desired Future Capital</label>
              <div className="flex items-center gap-2 border border-[#FFCC6A]/50 rounded-lg overflow-hidden bg-[#F0F7F0] focus-within:border-[#FFCC6A]">
                <span className="pl-3 text-[#0D3A1D] font-semibold">{inputs.currency.symbol}</span>
                              <input 
                                type="text"
                  inputMode="decimal"
                  value={formatNum(inputs.targetFutureCapital)}
                  onChange={(e) => update({ targetFutureCapital: parseNum(e.target.value) })}
                  className="flex-1 py-2 pl-2 pr-3 bg-transparent text-[#0D3A1D] min-w-0 focus:outline-none"
                  aria-label="Desired Future Capital"
                />
                            </div>
              {(() => {
                const config = FUTURE_CAPITAL_SLIDER[inputs.currency.code] ?? FUTURE_CAPITAL_SLIDER.USD;
                const min = 0;
                const value = Math.min(config.max, Math.max(min, inputs.targetFutureCapital));
                return (
                  <input
                    type="range"
                    min={min}
                    max={config.max}
                    step={config.step}
                    value={value}
                    onChange={(e) => update({ targetFutureCapital: Number(e.target.value) })}
                    className="w-full mt-2"
                    aria-label="Desired Future Capital Slider"
                  />
                );
              })()}
                          </div>
          )}
          <div className="space-y-2 mb-4 mt-5">
            <label className="block text-sm font-medium text-white">
              Time Horizon: {horizonYearsFormatted} years ({Math.round(inputs.timeHorizonYears * 12)} months)
            </label>
                          <input 
                            type="range" 
              min={1}
              max={40}
              step={0.5}
              value={inputs.timeHorizonYears}
              onChange={(e) => update({ timeHorizonYears: Number(e.target.value) })}
              className="w-full"
              aria-label="Time Horizon"
                          />
                        </div>
          <div className="space-y-2 mb-4 mt-1">
            <label className="block text-sm font-medium text-white">
              Your Current Age
            </label>
            <input
              type="number"
              min={18}
              max={90}
              placeholder=""
              value={currentAge ?? ''}
              onChange={(e) => {
                const v = e.target.value ? parseInt(e.target.value, 10) : null;
                setCurrentAge(Number.isFinite(v) && v != null ? v : null);
              }}
              className="w-20 py-2 pl-2 pr-2 rounded-lg border border-[#FFCC6A]/50 bg-[#F0F7F0] text-[#0D3A1D] text-sm focus:outline-none focus:border-[#FFCC6A]"
              aria-label="Your Current Age"
            />
          </div>
          <div className="space-y-2 mb-4 mt-7">
            <label className="block text-sm font-medium text-white">
              Estimated Yearly Inflation: {formatNum(inputs.inflationPct, 1)}%
            </label>
            <input
              type="range"
              min={0}
              max={15}
              step={0.5}
              value={inputs.inflationPct}
              onChange={(e) => update({ inflationPct: Number(e.target.value) })}
              className="w-full"
              aria-label="Estimated Yearly Inflation"
            />
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <span className="text-sm font-medium text-white">
                Inflation Adjustment:
              </span>
              <div className="flex rounded border border-[#FFCC6A]/50 overflow-hidden bg-white/10 w-fit">
                <button
                  type="button"
                  onClick={() => update({ inflationEnabled: false })}
                  className={`px-2 py-1 text-xs font-medium ${!inputs.inflationEnabled ? 'bg-[#FFCC6A] text-[#0D3A1D]' : 'text-white'}`}
                  aria-pressed={!inputs.inflationEnabled}
                >
                  Off
                </button>
                <button
                  type="button"
                  onClick={() => update({ inflationEnabled: true })}
                  className={`px-2 py-1 text-xs font-medium ${inputs.inflationEnabled ? 'bg-[#FFCC6A] text-[#0D3A1D]' : 'text-white'}`}
                  aria-pressed={inputs.inflationEnabled}
                >
                  On
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section B — Capital & Returns */}
        <section className="bg-[#0D3A1D] rounded-xl border border-[#FFCC6A] p-4 text-white">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFCC6A] mb-4 flex items-center gap-2">
            <img src="/brand/lionhead_Gold.svg" alt="" className="h-4 w-4" aria-hidden />
            Capital & Returns
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div id="input-start-capital">
              <label className="block text-sm font-medium mb-1 text-white min-h-[2.5rem]">Starting Capital</label>
              <div className="flex items-center gap-2 border border-[#FFCC6A]/50 rounded-lg overflow-hidden bg-[#F0F7F0] focus-within:border-[#FFCC6A]">
                <span className="pl-3 text-[#0D3A1D] font-semibold">{inputs.currency.symbol}</span>
                              <input 
                                type="text"
                  inputMode="decimal"
                  value={formatNum(inputs.startingCapital)}
                  onChange={(e) => update({ startingCapital: parseNum(e.target.value) })}
                  className="flex-1 py-2 pl-2 pr-3 bg-transparent text-[#0D3A1D] min-w-0 focus:outline-none"
                />
                            </div>
              {(() => {
                const config = STARTING_CAPITAL_SLIDER[inputs.currency.code] ?? STARTING_CAPITAL_SLIDER.USD;
                const value = Math.min(config.max, Math.max(0, inputs.startingCapital));
                return (
                          <input 
                            type="range" 
                    min={0}
                    max={config.max}
                    step={config.step}
                    value={value}
                    onChange={(e) => update({ startingCapital: Number(e.target.value) })}
                    className="w-full mt-2"
                    aria-label="Starting Capital Slider"
                  />
                );
              })()}
                        </div>
            <div id="input-expected-return">
              <label className="block text-sm font-medium mb-1 text-white min-h-[2.5rem] inline-flex items-center gap-1.5">
                Expected Annual Return (%)
                {inputs.expectedAnnualReturnPct > MID_RETURN_WARN_PCT && (
                    <TapToReveal
                      variant="caution"
                      explanation="Higher returns usually mean higher risk and can be hard to sustain."
                      ariaLabel="High Return Risk"
                    className="shrink-0"
                  />
                )}
              </label>
              <div className="flex items-center gap-2 border border-[#FFCC6A]/50 rounded-lg overflow-hidden bg-[#F0F7F0] focus-within:border-[#FFCC6A]">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={15}
                  step={0.1}
                  value={inputs.expectedAnnualReturnPct}
                  onChange={(e) => update({ expectedAnnualReturnPct: parseNum(e.target.value) })}
                  className="flex-1 py-2 pl-3 pr-2 bg-transparent text-[#0D3A1D] min-w-0 focus:outline-none"
                />
                <span className="pr-3 text-[#0D3A1D] font-semibold">%</span>
                      </div>
              <div className="flex gap-2 mt-2">
                {(['conservative', 'balanced', 'aggressive'] as const).map((y) => (
                      <button 
                    key={y}
                        type="button"
                    onClick={() => update({ yieldBoost: y, expectedAnnualReturnPct: PRESETS[y].annualReturn })}
                    className={`px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] ${
                      inputs.yieldBoost === y ? 'bg-[#FFCC6A] text-[#0D3A1D] border-[#FFCC6A]' : 'border-[#FFCC6A]/50 bg-white/10 text-white'
                    }`}
                  >
                    {y.charAt(0).toUpperCase() + y.slice(1)}
                      </button>
                ))}
                    </div>
                </div>
            <div id="input-monthly-topup" className="mt-6">
              <label className="block text-sm font-medium mb-2.5 text-white">Monthly Top‑Up (Optional)</label>
              <div className="flex items-center gap-2 border border-[#FFCC6A]/50 rounded-lg overflow-hidden bg-[#F0F7F0] focus-within:border-[#FFCC6A]">
                <span className="pl-3 text-[#0D3A1D] font-semibold">{inputs.currency.symbol}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatNum(inputs.monthlyTopUp)}
                  onChange={(e) => update({ monthlyTopUp: parseNum(e.target.value) })}
                  className="flex-1 py-2 pl-2 pr-3 bg-transparent text-[#0D3A1D] min-w-0 focus:outline-none"
                />
              </div>
              {(() => {
                const config = MONTHLY_TOPUP_SLIDER[inputs.currency.code] ?? MONTHLY_TOPUP_SLIDER.USD;
                const value = Math.min(config.max, Math.max(0, inputs.monthlyTopUp));
                return (
                  <input
                    type="range"
                    min={0}
                    max={config.max}
                    step={config.step}
                    value={value}
                    onChange={(e) => update({ monthlyTopUp: Number(e.target.value) })}
                    className="w-full mt-2"
                    aria-label="Monthly Top-Up Slider"
                  />
                );
              })()}
          </div>
          </div>
        </section>

        {/* Section C — Cash Management */}
        <section className="bg-[#0D3A1D] rounded-xl border border-[#FFCC6A] p-4 text-white">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFCC6A] mb-4 flex items-center gap-2">
            <img src="/brand/lionhead_Gold.svg" alt="" className="h-4 w-4" aria-hidden />
            Cash Management
          </h2>

               <div className="space-y-4">
            <div className="flex flex-row gap-0">
              <div className="flex-1 min-w-0 max-w-[180px] sm:max-w-[200px] overflow-hidden">
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  <span className="text-sm font-medium text-white shrink-0">Cash Buffer (%)</span>
                  <TapToReveal
                    explanation="Liquid reserve at a lower rate so you can cover monthly needs without selling. The rest stays invested."
                    ariaLabel="Cash Buffer Explanation"
                  />
                   </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => update({ cashBufferPct: Math.max(0, inputs.cashBufferPct - 1) })}
                    className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg border border-[#FFCC6A] bg-[#FFCC6A]/10 text-[#FFCC6A] text-xl font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] active:bg-[#FFCC6A]/20"
                    aria-label="Decrease Cash Buffer"
                  >
                    −
                  </button>
                 <input 
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={1}
                    value={inputs.cashBufferPct}
                    onChange={(e) => update({ cashBufferPct: parseNum(e.target.value) })}
                    className="w-14 sm:w-16 py-2 px-2 border border-[#FFCC6A]/50 rounded-lg bg-[#F0F7F0] text-[#0D3A1D] focus:outline-none focus:border-[#FFCC6A]"
                  />
                  <button
                    type="button"
                    onClick={() => update({ cashBufferPct: Math.min(100, inputs.cashBufferPct + 1) })}
                    className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg border border-[#FFCC6A] bg-[#FFCC6A]/10 text-[#FFCC6A] text-xl font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] active:bg-[#FFCC6A]/20"
                    aria-label="Increase Cash Buffer"
                  >
                    +
                  </button>
               </div>
                <p className="text-xs text-white/70 mt-1 min-w-0 break-words">Keep A Portion Safe And Ready.</p>
                   </div>
              <div className="w-px flex-shrink-0 bg-[#FFCC6A]" aria-hidden />
              <div className="flex-1 min-w-0 pl-2 overflow-hidden">
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  <span className="text-sm font-medium text-white shrink-0">Expected Return (%)</span>
                 </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => update({ cashAPY: Math.max(0, Math.round((inputs.cashAPY - 0.5) * 10) / 10) })}
                    className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg border border-[#FFCC6A] bg-[#FFCC6A]/10 text-[#FFCC6A] text-xl font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] active:bg-[#FFCC6A]/20"
                    aria-label="Decrease Expected Return"
                  >
                    −
                  </button>
                 <input 
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={20}
                    step={0.1}
                    value={inputs.cashAPY}
                    onChange={(e) => update({ cashAPY: parseNum(e.target.value) })}
                    className="w-16 sm:w-20 py-2 px-2 border border-[#FFCC6A]/50 rounded-lg bg-[#F0F7F0] text-[#0D3A1D] focus:outline-none focus:border-[#FFCC6A]"
                  />
                  <button
                    type="button"
                    onClick={() => update({ cashAPY: Math.min(20, Math.round((inputs.cashAPY + 0.5) * 10) / 10) })}
                    className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg border border-[#FFCC6A] bg-[#FFCC6A]/10 text-[#FFCC6A] text-xl font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] active:bg-[#FFCC6A]/20"
                    aria-label="Increase Expected Return"
                  >
                    +
                  </button>
               </div>
                <p className="text-xs text-white/70 mt-1 min-w-0 break-words">
                  Liquid reserves earn lower returns; the rest stays invested.
                </p>
              </div>
            </div>
            <p className="text-xs text-white/60 mt-3 min-w-0 break-words">
              {result.cashBufferHelperText}
            </p>
          </div>
        </section>

        {/* Section D — Results */}
        <section id="results" className="bg-[#0D3A1D] rounded-xl border border-[#FFCC6A] p-3 sm:p-4 text-white">
          <div className="mb-3 sm:mb-4">
            <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#FFCC6A] flex items-center gap-1.5 sm:gap-2">
              <img src="/brand/lionhead_Gold.svg" alt="" className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
              Results
            </h2>
          </div>

          {inputs.mode === 'withdrawal' ? (
            <>
              {chartData.length >= 2 && (
                <>
                  <div className="h-60 sm:h-72 mb-1.5 sm:mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10 }}
                          label={{ value: 'Time (months)', position: 'insideBottom', offset: -4, style: { fill: 'rgba(246,245,241,0.85)', fontSize: 9 } }}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          label={{ value: 'Capital', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'rgba(246,245,241,0.85)', fontSize: 9 } }}
                        />
                        <Tooltip content={resultsChartTooltip} cursor={{ stroke: 'rgba(246,245,241,0.55)' }} />
                        <Area
                          type="monotone"
                          dataKey="nominal"
                          stroke="#FFCC6A"
                          fill="#FFCC6A"
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[9px] sm:text-xs text-white/60 mt-6 sm:mt-8 mb-3 sm:mb-4 leading-snug">
                    {inputs.inflationEnabled
                      ? 'Projected capital balance over time (inflation‑adjusted monthly withdrawals).'
                      : 'Projected capital balance over time (fixed monthly withdrawals).'}
                    {result.targetDepletionMonths != null && (
                      <span className="ml-1">
                        <TapToReveal
                          explanation={`Capital runs out in ~${formatRunwayYearsMonths(result.targetDepletionMonths)}.`}
                          ariaLabel="Depletion Point"
                          className="inline-flex align-middle"
                        />
               </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mb-3 sm:mb-4 items-center">
                    <span className="text-sm font-medium text-white">
                      Inflation Adjustment:
                    </span>
                    <div className="flex rounded border border-[#FFCC6A]/50 overflow-hidden bg-white/10 w-fit">
                      <button
                        type="button"
                        onClick={() => update({ inflationEnabled: false })}
                        className={`px-2 py-1 text-xs font-medium ${!inputs.inflationEnabled ? 'bg-[#FFCC6A] text-[#0D3A1D]' : 'text-white'}`}
                        aria-pressed={!inputs.inflationEnabled}
                      >
                        Off
                      </button>
                      <button
                        type="button"
                        onClick={() => update({ inflationEnabled: true })}
                        className={`px-2 py-1 text-xs font-medium ${inputs.inflationEnabled ? 'bg-[#FFCC6A] text-[#0D3A1D]' : 'text-white'}`}
                        aria-pressed={inputs.inflationEnabled}
                      >
                        On
                      </button>
            </div>
                    <span className="text-sm text-white/80 tabular-nums">
                      {formatNum(inputs.inflationPct, 1)}%
                    </span>
          </div>
                </>
              )}
              {result.scenarioAdjustments != null && (() => {
                const s = result.scenarioAdjustments;
                const addCapNoOp = !s.addCapital.feasible || Math.abs(inputs.startingCapital - s.addCapital.requiredStart) <= EPS_MONEY;
                const reduceIncomeNoOp = !s.reduceIncome.feasible || Math.abs(inputs.targetMonthlyIncome - s.reduceIncome.targetMonthly) <= EPS_MONEY;
                const incReturnNoOp = !s.increaseReturn.feasible || Math.abs(inputs.expectedAnnualReturnPct - s.increaseReturn.requiredAnnualPct) <= EPS_RETURN;
                const applyReduceIncome = () => {
                  if (!s.reduceIncome.feasible) return;
                  update({ targetMonthlyIncome: Math.round(s.reduceIncome.targetMonthly * 100) / 100 });
                  setToast('Applied: Reduce Income');
                  setTimeout(() => setToast(null), 2500);
                };
                const applyAddCapital = () => {
                  if (!s.addCapital.feasible) return;
                  applyStartCapital(s.addCapital.requiredStart);
                  setToast('Applied: Add Capital');
                  setTimeout(() => setToast(null), 2500);
                };
                const applyIncreaseReturn = () => {
                  if (!s.increaseReturn.feasible) return;
                  update({ expectedAnnualReturnPct: Math.round(s.increaseReturn.requiredAnnualPct * 10) / 10 });
                  scrollToInput('input-expected-return');
                  setToast('Applied: Increase Return');
                  setTimeout(() => setToast(null), 2500);
                };
                const applyBalanced = () => {
                  if (!s.balancedAdjustment.feasible) return;
                  const newIncome = inputs.targetMonthlyIncome * (1 - s.balancedAdjustment.incomeReductionPct / 100);
                  const newCap = Math.min(inputs.startingCapital * (1 + s.balancedAdjustment.capitalIncreasePct / 100), START_CAPITAL_MAX);
                  update({
                    targetMonthlyIncome: Math.round(newIncome * 100) / 100,
                    startingCapital: Math.round(Math.max(START_CAPITAL_MIN, newCap) / 100) * 100,
                  });
                  setToast('Applied: Balanced Adjustment');
                  setTimeout(() => setToast(null), 2500);
                };
                const balancedNoOp = !s.balancedAdjustment.feasible || (s.balancedAdjustment.incomeReductionPct <= 0 && s.balancedAdjustment.capitalIncreasePct <= 0 && s.balancedAdjustment.returnIncreasePct <= 0);
                return (
                  <div className="mb-4 sm:mb-6 pt-8 sm:pt-10 relative">
                    <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#FFCC6A] pb-2 mb-2 border-b border-[#FFCC6A]">{SECTIONS.solver.title}</h3>
                    <div className="overflow-x-auto -mx-1 px-1">
                      <table className="w-full min-w-[320px] border-collapse text-[9px] min-[380px]:text-[10px] sm:text-xs text-[#F6F5F1]">
                        <thead>
                          <tr className="border-b border-[#FFCC6A]/40">
                            <th className="text-center py-1.5 px-2 font-semibold text-[#FFCC6A]">{SECTIONS.solver.reduceIncome}</th>
                            <th className="text-center py-1.5 px-2 font-semibold text-[#FFCC6A]">{SECTIONS.solver.addCapital}</th>
                            <th className="text-center py-1.5 px-2 font-semibold text-[#FFCC6A]">{SECTIONS.solver.increaseReturn}</th>
                            <th className="text-center py-1.5 px-2 font-semibold text-[#FFCC6A]">{SECTIONS.solver.balancedAdjustment}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-[#FFCC6A]/20">
                            <td className="py-1.5 px-2 align-top min-h-[4rem] text-center">
                              <div className="flex flex-col justify-between items-center min-h-[3.5rem]">
                                <span>{s.reduceIncome.feasible ? `${formatCurrencyCompactDisplay(s.reduceIncome.targetMonthly)}/mo` : '—'}</span>
                                <button type="button" onClick={applyReduceIncome} disabled={reduceIncomeNoOp} className="mt-1 shrink-0 text-[#FFCC6A] hover:underline disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] border border-[#FFCC6A] rounded-md px-2 py-0.5 text-[8px] sm:text-[9px] w-fit">Apply</button>
                </div>
                            </td>
                            <td className="py-1.5 px-2 align-top min-h-[4rem] text-center">
                              <div className="flex flex-col justify-between items-center min-h-[3.5rem]">
                                <span>{s.addCapital.feasible ? formatCurrencyCompactDisplay(s.addCapital.requiredStart) : '—'}</span>
                                <button type="button" onClick={applyAddCapital} disabled={addCapNoOp} className="mt-1 shrink-0 text-[#FFCC6A] hover:underline disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] border border-[#FFCC6A] rounded-md px-2 py-0.5 text-[8px] sm:text-[9px] w-fit">Apply</button>
              </div>
                            </td>
                            <td className="py-1.5 px-2 align-top min-h-[4rem] text-center">
                              <div className="flex flex-col justify-between items-center min-h-[3.5rem]">
                                <span>{s.increaseReturn.feasible ? `${formatNum(s.increaseReturn.requiredAnnualPct, 1)}%` : '—'}</span>
                                <button type="button" onClick={applyIncreaseReturn} disabled={incReturnNoOp} className="mt-1 shrink-0 text-[#FFCC6A] hover:underline disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] border border-[#FFCC6A] rounded-md px-2 py-0.5 text-[8px] sm:text-[9px] w-fit">Apply</button>
                </div>
                            </td>
                            <td className="py-1.5 px-2 align-top min-h-[4rem] text-center">
                              <div className="flex flex-col justify-between items-center min-h-[3.5rem]">
                                <span>
                                  {s.balancedAdjustment.feasible ? (
                                    <>
                                      <span>Income −{formatNum(s.balancedAdjustment.incomeReductionPct, 0)}%</span>
                                      <br className="sm:hidden" />
                                      <span>Capital +{formatNum(s.balancedAdjustment.capitalIncreasePct, 0)}%</span>
                                    </>
                                  ) : '—'}
                                </span>
                                <button type="button" onClick={applyBalanced} disabled={balancedNoOp} className="mt-1 shrink-0 text-[#FFCC6A] hover:underline disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] border border-[#FFCC6A] rounded-md px-2 py-0.5 text-[8px] sm:text-[9px] w-fit">Apply</button>
                  </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
              </div>
                    <div className="mt-2 mb-16 sm:mb-24 flex justify-start">
                      <button
                        type="button"
                        onClick={undo}
                        disabled={history.length === 0}
                        className="cb-gold-primary-cta shrink-0 !rounded-lg !px-2 !py-1 sm:!px-3 sm:!py-1.5 !text-[10px] sm:!text-xs !font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Undo"
                      >
                        Undo
                      </button>
            </div>
          </div>
                );
              })()}
            </>
          ) : null}

          {inputs.mode !== 'withdrawal' ? (
            <>
              <div className="h-60 sm:h-72 mb-4 sm:mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                    <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10 }}
                          label={{ value: 'Time (months)', position: 'insideBottom', offset: -4, style: { fill: 'rgba(246,245,241,0.85)', fontSize: 9 } }}
                        />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      label={{ value: 'Capital', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'rgba(246,245,241,0.85)', fontSize: 9 } }}
                    />
                    <Tooltip content={resultsChartTooltip} cursor={{ stroke: 'rgba(246,245,241,0.55)' }} />
                    <Area
                      type="monotone"
                      dataKey="nominal"
                      stroke="#FFCC6A"
                      fill="#FFCC6A"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
            </div>
              <p className="text-[9px] sm:text-xs text-white/60 mt-1 mb-3 sm:mb-4 leading-snug">
                Projected capital over the next {horizonYearsFormatted} years, based on current assumptions.
              </p>
              <div className="flex items-center gap-2 flex-wrap mb-1 sm:mb-2">
                <span className="text-[9px] sm:text-sm font-medium text-white">
                  Inflation Adjustment:
                </span>
                <div className="flex rounded border border-[#FFCC6A]/50 overflow-hidden bg-white/10 w-fit">
                  <button
                    type="button"
                    onClick={() => update({ inflationEnabled: false })}
                    className={`px-2 py-1 text-xs font-medium ${!inputs.inflationEnabled ? 'bg-[#FFCC6A] text-[#0D3A1D]' : 'text-white'}`}
                    aria-pressed={!inputs.inflationEnabled}
                  >
                    Off
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ inflationEnabled: true })}
                    className={`px-2 py-1 text-xs font-medium ${inputs.inflationEnabled ? 'bg-[#FFCC6A] text-[#0D3A1D]' : 'text-white'}`}
                    aria-pressed={inputs.inflationEnabled}
                  >
                    On
                  </button>
          </div>
                <span className="text-[9px] sm:text-sm text-white/80 tabular-nums">
                  {formatNum(inputs.inflationPct, 1)}%
            </span>
            </div>
              <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 space-y-1.5 sm:space-y-2 mb-10 sm:mb-14">
                <div className="text-[9px] min-[380px]:text-[10px] sm:text-xs text-white/90 leading-snug">
                  <strong>Estimated sustainable monthly income after {horizonYearsFormatted} year:</strong> ≈ <strong className="text-white">{formatCurrency(result.teaserIncomeMonthly)}</strong>{' '}
                  <span className="text-white/60">(based on current assumptions).</span>
          </div>
        </div>
            </>
          ) : null}

          <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#FFCC6A] mb-2 sm:mb-3">
            Key Outcomes ({inputs.mode === 'growth' ? 'Compounding Growth' : 'Monthly Withdrawal'} mode)
          </h3>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 rounded-lg bg-[#F0F7F0] border border-[#0D3A1D] min-w-0">
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#0D3A1D]/70 mb-0.5 sm:mb-1 break-words leading-snug">
                {inputs.mode === 'withdrawal' ? 'How long your money lasts' : `What your money becomes in ${horizonYearsFormatted} years`}
                </div>
              <div className="text-base sm:text-lg font-bold text-[#0D3A1D]">
                {inputs.mode === 'withdrawal' ? result.runwayPhrase : formatCurrencyResponsive(result.nominalCapitalAtHorizon)}
              </div>
              {inputs.mode === 'withdrawal' && (result.monthlyReturnOnCapital ?? 0) > 0 && (
                <p className="text-[10px] sm:text-xs text-[#0D3A1D]/70 mt-0.5 sm:mt-1 leading-snug">
                  {inputs.monthlyTopUp > 0
                    ? `~${formatCurrency(result.monthlyReturnOnCapital ?? 0)}/mo is the return on your capital alone. Withdrawing more than this uses principal; your monthly top-up helps extend how long your money lasts.`
                    : `Withdrawals above ~${formatCurrency(result.monthlyReturnOnCapital ?? 0)}/mo spend principal. At or below this, you have forever income.`}
                </p>
              )}
           </div>
            <div className="p-2 sm:p-3 rounded-lg bg-[#F0F7F0] border border-[#0D3A1D] min-w-0">
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#0D3A1D]/70 mb-0.5 sm:mb-1 break-words leading-snug">
                Total withdrawals paid
              </div>
              <div className="text-base sm:text-lg font-bold text-[#0D3A1D]">{formatCurrency(result.totalWithdrawalsPaid)}</div>
              <p className="text-[10px] sm:text-xs text-[#0D3A1D]/70 mt-0.5 sm:mt-1 leading-snug">
                Sum of what you took out over {horizonYearsFormatted} years
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg bg-[#F0F7F0] border border-[#0D3A1D] min-w-0">
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#0D3A1D]/70 mb-0.5 sm:mb-1 break-words leading-snug">
                Total contributions
              </div>
              <div className="text-base sm:text-lg font-bold text-[#0D3A1D]">{formatCurrency(result.totalContributions)}</div>
            </div>
            <div className="p-2 sm:p-3 rounded-lg bg-[#F0F7F0] border border-[#0D3A1D] min-w-0">
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#0D3A1D]/70 mb-0.5 sm:mb-1 break-words leading-snug">
                {inputs.mode === 'growth'
                  ? 'Total returns earned'
                  : `Capital at the end of ${horizonYearsFormatted} years`}
              </div>
              <div className="text-base sm:text-lg font-bold text-[#0D3A1D]">
                {inputs.mode === 'growth'
                  ? formatCurrencyResponsive(Math.max(0, result.nominalCapitalAtHorizon - result.totalContributions))
                  : formatCurrencyResponsive(result.nominalCapitalAtHorizon)}
              </div>
            </div>
          </div>

          {/* Capital Stress Test */}
          <div className="capital-stress-section mt-10 sm:mt-14 md:mt-16 pt-8 sm:pt-10 md:pt-14 mb-5 sm:mb-8 text-center sm:text-left">
            <div className="stress-section-header">
              <div className="stress-title-row">
                <img src="/brand/lionhead_Gold.svg" alt="" className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                <span className="stress-title text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#FFCC6A]">CAPITAL STRESS TEST</span>
              </div>
              <p className="stress-description text-[9px] sm:text-xs text-white/70">
                Evaluate your structure across different market return scenarios.
              </p>
              <button
                type="button"
                onClick={handleToggleStressTest}
                className={`stress-toggle-btn${stressPulseOn ? ' pulse-on-load' : ''}`}
                aria-expanded={stressTestExpanded}
                aria-label={stressTestExpanded ? 'Hide Stress Test' : 'Show Stress Test'}
              >
                <span className="toggle-label">
                  {stressTestExpanded ? 'Hide Stress Test' : 'Show Stress Test'}
                </span>
                <span className={`toggle-icon${stressTestExpanded ? ' expanded' : ''}`} aria-hidden>
                  {stressTestExpanded ? '–' : '+'}
                </span>
              </button>
            </div>
            {stressTestExpanded && (
              <>
                <div className="capital-stress-divider" aria-hidden />
                <div className="stress-test-cards scenario-cards-grid mt-2">
                  {stressTestScenarios.map((s) => {
                    const scenarioClass = s.label === 'Bear Market' ? 'bear-card' : s.label === 'Base Case' ? 'base-card' : 'bull-card';
                    return (
                    <div
                      key={s.label}
                      className={`scenario-card ${scenarioClass} rounded-lg bg-[#F0F7F0] border border-[#0D3A1D] min-w-0`}
                    >
                      <div className="scenario-header">
                        <div className="scenario-title">{s.label}</div>
                        <div className="scenario-label">{s.relationshipLabel}</div>
                        <div className="scenario-return">Return: {formatNum(s.returnPct, 1)}%</div>
                      </div>
                      <div className="scenario-body">
                        {inputs.mode === 'withdrawal' ? (
                          <>
                            <div className="runway-label">Capital Survival Age</div>
                            <div className="runway-value">
                              {s.runwayYears != null ? formatRunwayFromDecimalYears(s.runwayYears) : 'Forever'}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="runway-label">Ending Capital</div>
                            <div className="runway-value">{formatCurrencyCompactDisplay(s.endingCapital)}</div>
                          </>
                        )}
                      </div>
                      <div className="scenario-footer">
                        <RiskTierBadge tier={s.tier} label={s.tierLabel} />
                      </div>
                    </div>
                  );})}
                </div>
              </>
            )}
          </div>

          {result.bufferBreachMonths > 0 && (
            <div className="mb-3 sm:mb-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[#FFAB40]/20 border border-[#FFAB40] text-[#0D3A1D] text-[11px] sm:text-sm">
              Buffer breached for {formatRunwayYearsMonths(result.bufferBreachMonths)}.
            </div>
          )}
        </section>

        <section
          id="lions-verdict"
          className="mt-4 sm:mt-6"
          aria-labelledby="lions-verdict-heading"
        >
          <div className="mx-auto max-w-3xl">
            <LionVerdictActive
              user={lionAccessUser}
              userId={lionSeedUserId}
              reportType="capital_health"
              tier={lionTierLabel}
              score={lionScore}
              confidenceScore={lionConfidenceScore}
              surplusRatio={lionSurplusRatio}
              riskTolerance={lionRiskTolerance}
              horizon={depletionYears}
              horizonLabel={horizonLabel}
              target={targetCapital}
              gap={gapAmount}
              progress={progressPercent}
            />
          </div>
        </section>

        <footer className="py-8 border-t border-[#0D3A1D] text-center text-xs text-[#F6F5F1]/80">
          <p className="mb-2">
            This model is for advisory purposes only. Projections are based on your assumptions and do not guarantee future performance.
          </p>
          <p className="mb-4">Please save or print a copy for your records.</p>
          {reportGenerating && (
            <p className="mb-3 text-[#FFCC6A] font-medium" role="status">
              Generating AI Financial Diagnostic...
            </p>
          )}
          {reportReady && !reportGenerating && (
            <p className="mb-3 text-[#55B685] font-medium" role="status">
              AI-Generated Capital Diagnostic Ready
            </p>
          )}
          <div className="flex justify-center mb-6">
          <button
            type="button"
              onClick={handlePrintOrSaveReport}
              disabled={reportGenerating}
              className="cb-gold-outline-cta w-full sm:w-auto !rounded-lg !py-3 !px-6 !text-sm !font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC6A] disabled:opacity-60 disabled:cursor-not-allowed"
          >
              <Printer className="h-4 w-4 flex-shrink-0" aria-hidden />
              {reportGenerating ? 'Generating…' : 'Print or Save Report'}
          </button>
        </div>
          </footer>
      </main>
         </div>
    </TapToRevealProvider>
  );
});
