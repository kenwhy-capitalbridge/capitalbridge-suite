"use client";

import React, { useState, useCallback, useEffect, useLayoutEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import "./index.css";
import { MonteCarloResult, StressSeverity, StressScenarioResult } from './types';
import { runMonteCarlo, getSimulationCount, runStressScenarios, getDepletionBarOutput } from './services/mathUtils';
import { DepletionBarProvider, DepletionBarConsumers, type DepletionBarOutput } from './DepletionBarContext';
import {
  getMicroDiagnosticSignals,
  getKeyTakeaways,
  getRecommendedAdjustments,
  runLionVerdictEngineStress,
  stressScoreToDisplay0to100,
  toVerdictNarrative,
} from './services/advisory_engine';
import {
  type LionStressAdvisoryInputs,
  buildLionVerdictClientReportFromStress,
  formatLionPublicStatusLabel,
  lionPublicStatusFromScore0to100,
  lionStrongEligibilityFromStressInputs,
} from '@cb/advisory-graph/lionsVerdict';
import { PrintReport } from './PrintReport';
import { LionVerdictActive } from "../../../packages/lion-verdict/LionVerdictActive";
import { LionVerdictLocked } from "../../../packages/lion-verdict/LionVerdictLocked";
import { canAccessLion, type LionAccessUser } from "../../../packages/lion-verdict/access";
import type { Tier } from "../../../packages/lion-verdict/copy";
import { LOGIN_APP_URL } from "@cb/shared/urls";
import { useModelMetricSpine } from "@cb/ui";

const CURRENCIES = [
  { label: 'RM', code: 'MYR', locale: 'en-MY' },
  { label: 'SGD', code: 'SGD', locale: 'en-SG' },
  { label: 'USD', code: 'USD', locale: 'en-US' },
  { label: 'THB', code: 'THB', locale: 'th-TH' },
  { label: 'AUD', code: 'AUD', locale: 'en-AU' },
  { label: 'PHP', code: 'PHP', locale: 'en-PH' },
  { label: 'RMB', code: 'CNY', locale: 'zh-CN' },
  { label: 'HKD', code: 'HKD', locale: 'en-HK' },
];

const PRESETS = {
  conservative: { lower: -5.0, upper: 6.0, label: 'Conservative' },
  balanced: { lower: -2.0, upper: 7.0, label: 'Balanced' },
  growth: { lower: -2.5, upper: 10.0, label: 'Growth' },
};

const STRESS_OPTIONS: { value: StressSeverity; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'moderate', label: 'Moderate Shock (-15%)' },
  { value: 'bear', label: 'Bear Market (-30%)' },
  { value: 'crisis', label: 'Crisis Event (-45%)' },
];

/** Same 5-tier Policy B palette as Depletion Pressure: Critical → Fragile → Vulnerable → Watchful → Stable. */
const TIER_PILL_COLORS: Record<string, string> = {
  'Very Strong': '#1F8A4D',  /* Stable */
  'Strong': '#9BAA23',        /* Watchful */
  'Moderate': '#E3A539',      /* Vulnerable */
  'Weak': '#D27A1F',         /* Fragile */
  'Critical': '#CA3A2E',     /* Critical */
};

/** Policy B segment palette (filled pill / bar gradient). */
const FRAGILITY_GAUGE_COLORS: Record<string, string> = {
  Stable: '#1F8A4D',
  Watchful: '#9BAA23',
  Vulnerable: '#E3A539',
  Fragile: '#D27A1F',
  Critical: '#CA3A2E',
};

/** Dark green text for pills with light backgrounds (legibility). */
const PILL_TEXT_DARK = '#0D3A1D';

/** Labels that use dark green text on light pill bg. Amber pills (Weak, Moderate) use bright white. Light pills (Strong, Watchful, Vulnerable) → dark text; dark/amber pills (Critical, Fragile, Stable, Weak, Moderate / Very Strong) → white. */
const LIGHT_PILL_LABELS = new Set(['Strong', 'Watchful', 'Vulnerable']);

function getPillTextColor(label: string): string {
  return LIGHT_PILL_LABELS.has(label) ? PILL_TEXT_DARK : '#FFFFFF';
}

/** Fragility Index tier (0–100). Distinct from Depletion Pressure tiers. */
type FragilityIndexTier = 'FORTIFIED' | 'Highly Robust' | 'Stable' | 'Fragile' | 'Critical';

/** Distinct color scale for Fragility Index (teal/slate) so it does not conflict with Depletion Pressure. */
const FRAGILITY_INDEX_COLORS: Record<FragilityIndexTier, string> = {
  'FORTIFIED': '#0D9488',
  'Highly Robust': '#2DD4BF',
  'Stable': '#5EEAD4',
  'Fragile': '#F59E0B',
  'Critical': '#DC2626',
};

function getFragilityIndexTier(score: number): FragilityIndexTier {
  if (score <= 20) return 'FORTIFIED';
  if (score <= 40) return 'Highly Robust';
  if (score <= 60) return 'Stable';
  if (score <= 80) return 'Fragile';
  return 'Critical';
}

function getFragilityIndexPillTextColor(tier: FragilityIndexTier): string {
  return tier === 'Stable' || tier === 'Highly Robust' ? '#0D3A1D' : '#FFFFFF';
}

function mapStressStatusToTier(status?: string): Tier {
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

const PrinterIcon = () => (
  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4 text-[#FFCC6A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
  </svg>
);

export type CapitalStressAppHandle = {
  getInputs: () => Record<string, unknown>;
  getResults: () => Record<string, unknown>;
  applyInputs: (inputs: Record<string, unknown>) => void;
};

/** Combined resilience view — same logic as in-app STRUCTURE HEALTH badge (watermark risk driver). */
type CapitalHealthStatus = 'Strong' | 'Stable' | 'Watchful' | 'Needs Attention' | 'Critical';

function getCapitalHealthStatus(
  tier: string,
  fiTier: FragilityIndexTier,
  depletionPill: string,
): CapitalHealthStatus {
  const depBad = depletionPill === 'Critical' || depletionPill === 'Fragile' || depletionPill === 'Vulnerable';
  const fiBad = fiTier === 'Critical' || fiTier === 'Fragile';
  if (tier === 'Critical' || depletionPill === 'Critical' || fiTier === 'Critical') return 'Critical';
  const badCount = (tier === 'Weak' ? 1 : 0) + (fiBad ? 1 : 0) + (depBad ? 1 : 0);
  if (badCount >= 2) return 'Needs Attention';
  if (badCount === 1 || tier === 'Moderate') return 'Watchful';
  if (tier === 'Strong' || tier === 'Very Strong')
    return depletionPill === 'Stable' && (fiTier === 'FORTIFIED' || fiTier === 'Highly Robust') ? 'Strong' : 'Stable';
  return 'Stable';
}

const DEFAULT_LION_ACCESS_USER: LionAccessUser = { isPaid: true, hasActiveTrialUpgrade: false };

type CapitalStressMetricSpineSyncProps = {
  depletionBarOutput: DepletionBarOutput | null;
  withdrawalDisplay: string;
  horizonDisplay: string;
};

function CapitalStressMetricSpineSync({
  depletionBarOutput,
  withdrawalDisplay,
  horizonDisplay,
}: CapitalStressMetricSpineSyncProps) {
  const { setSpine } = useModelMetricSpine();
  useLayoutEffect(() => {
    const slot1Value =
      depletionBarOutput != null ? (
        <span
          title="Method: Net Pressure (bar‑derived)"
          className="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase"
          style={{
            backgroundColor: FRAGILITY_GAUGE_COLORS[depletionBarOutput.pillLabel],
            color: getPillTextColor(depletionBarOutput.pillLabel),
          }}
        >
          {depletionBarOutput.pillLabel === 'Vulnerable' ? (
            <>
              <span className="sm:hidden">Exposed</span>
              <span className="hidden sm:inline">Vulnerable</span>
            </>
          ) : (
            depletionBarOutput.pillLabel
          )}
        </span>
      ) : (
        <span className="text-[#F6F5F1]/80">—</span>
      );

    setSpine({
      slot1: {
        labelDesktop: 'Depletion Status',
        labelMobile: 'Pressure',
        value: slot1Value,
      },
      slot2: {
        labelDesktop: 'Withdrawal',
        labelMobile: 'Withdrawal',
        value: withdrawalDisplay,
      },
      slot3: {
        labelDesktop: 'Time Horizon',
        labelMobile: 'Horizon',
        value: horizonDisplay,
      },
    });
    return () => setSpine(null);
  }, [depletionBarOutput, withdrawalDisplay, horizonDisplay, setSpine]);
  return null;
}

type CapitalStressAppProps = {
  canUseStressModel?: boolean;
  canSeeVerdict?: boolean;
  lionAccessUser?: LionAccessUser;
  reportClientDisplayName?: string;
};

const App = forwardRef<CapitalStressAppHandle, CapitalStressAppProps>(function App(props, ref) {
  const canUseStressModel = props.canUseStressModel ?? true;
  const canSeeVerdict = props.canSeeVerdict ?? true;
  const lionAccessUser = props.lionAccessUser ?? DEFAULT_LION_ACCESS_USER;
  const reportClientDisplayName = props.reportClientDisplayName ?? 'Client';
  const lionAccessEnabled = canAccessLion(lionAccessUser);
  const [investment, setInvestment] = useState<number>(1000000);
  const [withdrawal, setWithdrawal] = useState<number>(0);
  const [lowerPct, setLowerPct] = useState<number>(-2.0);
  const [upperPct, setUpperPct] = useState<number>(7.0);
  const [years, setYears] = useState<number>(10);
  const [confidence, setConfidence] = useState<number>(90);
  const [currencyIndex, setCurrencyIndex] = useState<number>(0);
  const [inflationAdjustmentOn, setInflationAdjustmentOn] = useState<boolean>(true);
  const [inflationPct, setInflationPct] = useState<number>(1.5);
  const [stressSeverity, setStressSeverity] = useState<StressSeverity>('none');
  const [pathView, setPathView] = useState<'worst' | 'median' | 'best'>('median');

  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
  const [stressScenarioResults, setStressScenarioResults] = useState<StressScenarioResult[] | null>(null);
  const [adjustmentResults, setAdjustmentResults] = useState<{
    reduceWithdrawal: MonteCarloResult | null;
    extendHorizon: MonteCarloResult | null;
    improveReturns: MonteCarloResult | null;
  } | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [durabilityTooltip, setDurabilityTooltip] = useState<{ year: number; p25: number; p50: number; p75: number; x: number; y: number } | null>(null);
  const [distributionTooltip, setDistributionTooltip] = useState<{ low: number; high: number; count: number; pct: number; isMedian: boolean; x: number; y: number } | null>(null);
  const [radarLabelTooltip, setRadarLabelTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    structuralStabilityMap: true,
    capitalOutcomeDist: true,
    capitalStressRadar: true,
    furtherStressTest: true,
    capitalAdjustmentSimulator: true,
  });
  const toggleSection = (key: keyof typeof collapsedSections) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  useEffect(() => {
    const check = () => setIsMobileView(typeof window !== 'undefined' && window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const selectedCurrency = CURRENCIES[currencyIndex];
  const effectiveInflation = inflationAdjustmentOn ? inflationPct : 0;

  const runCalculation = useCallback(() => {
    setIsRunning(true);
    setStressScenarioResults(null);
    setAdjustmentResults(null);
    setTimeout(() => {
      const result = runMonteCarlo(investment, withdrawal, lowerPct, upperPct, years, stressSeverity, undefined, confidence);
      setMcResult(result);
      setTimeout(() => {
        const scenarios = runStressScenarios(investment, withdrawal, lowerPct, upperPct, years, stressSeverity);
        setStressScenarioResults(scenarios);
        const reduceWithdrawal = runMonteCarlo(investment, withdrawal * 0.9, lowerPct, upperPct, years, stressSeverity, undefined, confidence);
        const extendHorizon = runMonteCarlo(investment, withdrawal, lowerPct, upperPct, years + 5, stressSeverity, undefined, confidence);
        const improveReturns = runMonteCarlo(investment, withdrawal, lowerPct + 1, upperPct + 1, years, stressSeverity, undefined, confidence);
        setAdjustmentResults({ reduceWithdrawal, extendHorizon, improveReturns });
      }, 0);
      setIsRunning(false);
    }, 0);
  }, [investment, withdrawal, lowerPct, upperPct, years, stressSeverity, confidence]);

  const strategyLabel = Object.values(PRESETS).find(
    p => p.lower === lowerPct && p.upper === upperPct
  )?.label ?? 'Custom';

  const getVerdictExplanation = (tier: string) => {
    switch (tier) {
      case 'Critical': return 'Your capital structure shows high vulnerability over the selected horizon. Significant stress or withdrawal pressure may lead to capital depletion.';
      case 'Weak': return 'Your capital structure appears weak under stress. Volatility and adverse market conditions could materially erode capital.';
      case 'Moderate': return 'Your capital structure appears moderately resilient over the selected horizon, but it may experience meaningful volatility under stressed market conditions.';
      case 'Strong': return 'Your capital structure shows strong resilience. It is likely to withstand most adverse scenarios, though some volatility is possible.';
      case 'Very Strong': return 'Your capital structure appears very resilient. It is well positioned to endure stress and maintain positive outcomes across most scenarios.';
      default: return 'The simulation indicates how your capital may perform under a range of market conditions.';
    }
  };

  /** First paragraph under "Probability of Success Over {years}-year:" — by tier; STRONG varies by horizon <5 vs ≥5. */
  const getResilienceScoreProbabilityCopy = (tier: string, horizonYears: number) => {
    const shortTerm = horizonYears < 5;
    switch (tier) {
      case 'Very Strong':
        return 'Based on current assumptions, the capital structure shows good resilience and is positioned to absorb market stress over time.';
      case 'Strong':
        return shortTerm
          ? 'The structure appears resilient under a wide range of simulated market conditions. It can support medium-term outcomes with some buffer.'
          : 'The structure appears resilient under a wide range of simulated market conditions. It can support longer-term outcomes with some buffer.';
      case 'Moderate':
        return 'The plan is generally balanced but may be sensitive to adverse sequences or higher withdrawals.';
      case 'Weak':
        return `The structure shows elevated sensitivity to withdrawals and market drawdowns across the ${horizonYears}-year horizon.`;
      case 'Critical':
        return 'The plan faces meaningful risk under current settings, with a high chance of stress in adverse conditions.';
      default:
        return 'Based on current assumptions, the simulation suggests how your capital may perform under a range of market conditions.';
    }
  };

  /** Second paragraph under "What This Means:" — by tier, same for all horizons. */
  const getResilienceScoreWhatThisMeans = (tier: string) => {
    switch (tier) {
      case 'Very Strong':
        return 'You may review assumptions periodically to keep the plan aligned, but no immediate changes appear necessary.';
      case 'Strong':
        return 'Consider modest improvements only if your objectives or withdrawal needs change.';
      case 'Moderate':
        return 'Tightening withdrawals, extending horizon flexibility, or improving expected return can enhance resilience.';
      case 'Weak':
        return 'Reduce withdrawal pressure, increase starting capital, or revisiting asset mix for higher returns could improve outcomes.';
      case 'Critical':
        return 'Consider immediate adjustments: lower withdrawals, add capital, lengthen runway and reassess returns assumptions.';
      default:
        return 'Based on current assumptions, the simulation suggests how your capital may perform under a range of market conditions.';
    }
  };

  /** Short interpretation sentence for Resilience Score. */
  const getResilienceScoreInterpretation = (tier: string) => {
    switch (tier) {
      case 'Very Strong': return 'Your capital structure appears strong and well positioned for the selected horizon.';
      case 'Strong': return 'Your capital structure shows good resilience under most market conditions.';
      case 'Moderate': return 'Your capital structure is balanced but may be sensitive to adverse market sequences.';
      case 'Weak': return 'Your capital structure may struggle under sustained market pressure.';
      case 'Critical': return 'Your capital structure faces meaningful risk under current assumptions.';
      default: return 'This score reflects how likely your capital is to remain intact over the selected horizon.';
    }
  };

  /** Short interpretation sentence for Fragility Index (by tier). */
  const getFragilityIndexInterpretation = (tier: FragilityIndexTier) => {
    switch (tier) {
      case 'FORTIFIED': return 'Your capital is robust and less sensitive to market shocks.';
      case 'Highly Robust': return 'Your capital structure absorbs volatility well.';
      case 'Stable': return 'Your capital is moderately sensitive to market shocks.';
      case 'Fragile': return 'Your capital is sensitive to market shocks and may react strongly during downturns.';
      case 'Critical': return 'Your capital is highly sensitive to market shocks and structural stress.';
      default: return 'This index measures how sensitive your capital structure is to market shocks.';
    }
  };

  /** Short interpretation for Depletion Pressure (by pill label). */
  const getDepletionPressureInterpretation = (pillLabel: string) => {
    switch (pillLabel) {
      case 'Stable': return 'Withdrawals are currently manageable but may place pressure on capital sustainability over time.';
      case 'Watchful': return 'Withdrawals are within a manageable range; monitor as conditions change.';
      case 'Vulnerable': return 'Withdrawals are beginning to place noticeable pressure on capital sustainability.';
      case 'Fragile': return 'Withdrawals are placing significant pressure on long-term capital sustainability.';
      case 'Critical': return 'Withdrawals are currently placing heavy strain on long-term capital sustainability.';
      default: return 'This indicator shows whether withdrawals are placing strain on the sustainability of your capital.';
    }
  };

  const CAPITAL_HEALTH_COLORS: Record<CapitalHealthStatus, string> = {
    Strong: '#1F8A4D',
    Stable: '#9BAA23',
    Watchful: '#E3A539',
    'Needs Attention': '#D27A1F',
    Critical: '#CA3A2E',
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(selectedCurrency.locale, { 
      style: 'currency', 
      currency: selectedCurrency.code,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(val);

  const currentPathYearly = mcResult
    ? pathView === 'worst'
      ? mcResult.worstPathYearly
      : pathView === 'best'
        ? mcResult.bestPathYearly
        : mcResult.medianPathYearly
    : [];

  const applyPreset = (preset: keyof typeof PRESETS) => {
    setLowerPct(PRESETS[preset].lower);
    setUpperPct(PRESETS[preset].upper);
  };

  const formatPercent = (val: number) => val.toFixed(1) + '%';
  const formatPercentSmall = (val: number) => val.toFixed(2) + '%';
  const formatSignedPct = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
  
  const formatNumber = (val: number) => 
    new Intl.NumberFormat(selectedCurrency.locale, {
      maximumFractionDigits: 0
    }).format(val);

  const handleInvestmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    const numericValue = parseInt(rawValue, 10);
    if (!isNaN(numericValue)) setInvestment(numericValue);
    else if (rawValue === '') setInvestment(0);
  };

  const handleWithdrawalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    const numericValue = parseInt(rawValue, 10);
    if (!isNaN(numericValue)) setWithdrawal(numericValue);
    else if (rawValue === '') setWithdrawal(0);
  };

  const handlePrint = () => {
    window.print();
  };

  const depletionBarRef = useRef<DepletionBarOutput | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      getInputs: () =>
        ({
          investment,
          withdrawal,
          lowerPct,
          upperPct,
          years,
          confidence,
          currencyIndex,
          inflationAdjustmentOn,
          inflationPct,
          stressSeverity,
          pathView,
        }) as Record<string, unknown>,
      getResults: () => {
        try {
          const base = { mcResult, stressScenarioResults, adjustmentResults };
          const dep = depletionBarRef.current;
          if (canSeeVerdict && lionAccessEnabled && mcResult) {
            const advisoryInputs: LionStressAdvisoryInputs = {
              capitalResilienceScore: mcResult.capitalResilienceScore,
              tier: mcResult.tier,
              fragilityIndicator: dep ? dep.pillLabel : mcResult.fragilityIndicator,
              initialCapital: investment,
              withdrawalAmount: withdrawal,
              timeHorizonYears: years,
              simulatedAverageOutcome: mcResult.simulatedAverage,
              maximumDrawdownPct: mcResult.maxDrawdownPctAvg,
              worstCaseOutcome: mcResult.percentile5,
            };
            const lionVerdictClient = buildLionVerdictClientReportFromStress(advisoryInputs, {
              formatCurrency,
            });
            return JSON.parse(
              JSON.stringify({ ...base, lionVerdictClient }),
            ) as Record<string, unknown>;
          }
          return JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
        } catch {
          return {};
        }
      },
      applyInputs: (raw) => {
        const p = raw as Record<string, unknown>;
        if (typeof p.investment === "number") setInvestment(p.investment);
        if (typeof p.withdrawal === "number") setWithdrawal(p.withdrawal);
        if (typeof p.lowerPct === "number") setLowerPct(p.lowerPct);
        if (typeof p.upperPct === "number") setUpperPct(p.upperPct);
        if (typeof p.years === "number") setYears(p.years);
        if (typeof p.confidence === "number") setConfidence(p.confidence);
        if (typeof p.currencyIndex === "number") setCurrencyIndex(p.currencyIndex);
        if (typeof p.inflationAdjustmentOn === "boolean") setInflationAdjustmentOn(p.inflationAdjustmentOn);
        if (typeof p.inflationPct === "number") setInflationPct(p.inflationPct);
        if (typeof p.stressSeverity === "string") setStressSeverity(p.stressSeverity as StressSeverity);
        if (p.pathView === "worst" || p.pathView === "median" || p.pathView === "best")
          setPathView(p.pathView);
        setTimeout(() => runCalculation(), 0);
      },
    }),
    [
      investment,
      withdrawal,
      lowerPct,
      upperPct,
      years,
      confidence,
      currencyIndex,
      inflationAdjustmentOn,
      inflationPct,
      stressSeverity,
      pathView,
      mcResult,
      stressScenarioResults,
      adjustmentResults,
      runCalculation,
      canSeeVerdict,
      investment,
      withdrawal,
      years,
      lionAccessEnabled,
      formatCurrency,
    ]
  );

  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isAllowed =
    hostname === "" ||
    hostname === "localhost" ||
    hostname.endsWith(".vercel.app") ||
    hostname.endsWith(".thecapitalbridge.com") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.");

  if (!isAllowed) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif"
      }}>
        Unauthorised domain
      </div>
    );
  }

  return (
    <>
      <DepletionBarProvider mcResult={mcResult}>
        <DepletionBarConsumers>
          {(depletionBarOutput) => {
            depletionBarRef.current = depletionBarOutput;
            const advisoryInputs = mcResult
              ? {
                  capitalResilienceScore: mcResult.capitalResilienceScore,
                  tier: mcResult.tier,
                  fragilityIndicator: depletionBarOutput ? depletionBarOutput.pillLabel : mcResult.fragilityIndicator,
                  initialCapital: investment,
                  withdrawalAmount: withdrawal,
                  timeHorizonYears: years,
                  simulatedAverageOutcome: mcResult.simulatedAverage,
                  maximumDrawdownPct: mcResult.maxDrawdownPctAvg,
                  worstCaseOutcome: mcResult.percentile5,
                }
              : null;
            const lionEngine =
              canSeeVerdict && advisoryInputs ? runLionVerdictEngineStress(advisoryInputs, formatCurrency) : null;
            const verdict = lionEngine ? toVerdictNarrative(lionEngine) : null;
            const microSignals = advisoryInputs ? getMicroDiagnosticSignals(advisoryInputs) : [];
            const lionScore = lionEngine?.score0to100 ?? 0;
            const lionTierLabel = mapStressStatusToTier(lionEngine?.status ?? 'Critical');
            const lionConfidenceScore = Math.min(1, Math.max(0, lionScore / 100));
            const lionSurplusRatio = lionConfidenceScore;
            const lionRiskTolerance = lionConfidenceScore;
            const targetCapital = investment;
            const projectedCapital = mcResult?.simulatedAverage ?? investment;
            const gapAmount = Math.max(0, targetCapital - projectedCapital);
            const progressPercent = targetCapital > 0 ? Math.min(100, (projectedCapital / targetCapital) * 100) : 0;
            const horizonYears = years;
            const horizonLabel = `${years.toFixed(1)} years`;
            const lionSeedUserId = typeof window !== 'undefined' ? window.location.hostname : 'capital-stress';
            const showLionActive = lionEngine && advisoryInputs;
            return (
              <>
      {!canUseStressModel && (
        <div
          className="fixed inset-0 z-[10050] flex flex-col items-center justify-start pt-[max(5.5rem,env(safe-area-inset-top,0px)+4.5rem)] sm:pt-28 px-3 sm:px-6 pointer-events-none"
          aria-live="polite"
        >
          <div className="pointer-events-auto w-full max-w-md rounded-lg border-2 border-[#FFCC6A] bg-[#0D3A1D]/95 px-4 py-3.5 shadow-[0_12px_48px_rgba(0,0,0,0.55)] backdrop-blur-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#FFCC6A] mb-1.5">Trial plan</p>
            <h2 className="text-[0.95rem] sm:text-base font-bold text-[#FFCC6A] mb-2 leading-snug">
              Capital Stress Model is not available on trial
            </h2>
            <p className="text-[11px] sm:text-xs leading-relaxed text-[#F6F5F1]/88 mb-3">
              You can scroll and read how the engine is laid out, but inputs, simulation runs, and exports stay locked. Upgrade to a paid plan to use this model fully.
            </p>
            <a
              href={`${LOGIN_APP_URL.replace(/\/+$/, "")}/pricing`}
              className="cb-gold-primary-cta w-full !rounded-md py-2.5 text-[10px] font-bold uppercase tracking-wide"
            >
              View paid plans
            </a>
          </div>
        </div>
      )}
      <div
        id="screen-content"
        style={{ opacity: canUseStressModel ? 1 : 0.55, pointerEvents: canUseStressModel ? "auto" : "none" }}
      >
        <CapitalStressMetricSpineSync
          depletionBarOutput={depletionBarOutput}
          withdrawalDisplay={formatCurrency(withdrawal)}
          horizonDisplay={`${years} years`}
        />
      <div className="cb-body min-h-screen bg-transparent text-cb-cream font-sans selection:bg-[#FFCC6A] selection:text-black pt-0 pb-4 md:pb-16">
        <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-4 sm:pt-8 md:pt-12 lg:pt-14 space-y-4 sm:space-y-6 md:space-y-10 lg:space-y-14 xl:space-y-16">
        {/* Module 3 note — standalone mode */}
        <div className="pt-6 pb-2 sm:pt-2 no-print">
          <p className="text-[10px] text-[#FFCC6A]/90 leading-relaxed text-center">This model represents <strong className="text-[#FFCC6A]">Module 3 of the Capital Bridge Advisory Framework</strong>, focusing on capital resilience under market volatility and withdrawal pressure over the selected time horizon.</p>
        </div>

        {/* Scenario Lab — interactive assumptions */}
        <section>
          <div className="bg-[#0D3A1D]/40 p-6 sm:p-10 md:p-16 rounded-sm border border-[#FFCC6A]/10 shadow-2xl">
            <h2 className="text-sm md:text-lg font-bold mb-1 md:mb-2 text-[#FFCC6A] uppercase tracking-wide border-b border-[#FFCC6A]/10 pb-3 sanserif-font text-center md:text-left">Scenario Builder &amp; Settings</h2>
            <p className="text-[10px] md:text-[11px] text-[#FFCC6A]/80 mt-2 mb-10 md:mb-16 text-center">Adjust sliders and inputs below; run simulation to update Resilience Score, Depletion Pressure, Durability Curve, Depletion Risk, and Stress Radar.</p>
            
            <div className="max-w-2xl mx-auto space-y-10 sm:space-y-12 md:space-y-16 lg:space-y-20">
              
              {/* CURRENCY */}
              <div className="w-full overflow-x-hidden pb-2 no-print">
                <div className="flex flex-nowrap gap-1 sm:gap-2 w-full items-stretch">
                  {CURRENCIES.map((c, idx) => (
                    <button
                      key={c.code}
                      onClick={() => setCurrencyIndex(idx)}
                      className={`flex-1 min-w-0 min-h-[1.5rem] sm:min-h-0 h-6 sm:h-7 flex items-center justify-center py-0.5 px-0.5 sm:py-1 sm:px-1 text-[7px] sm:text-[11px] md:text-xs font-bold rounded-[5px] sm:rounded-[8px] border transition-all uppercase tracking-tight whitespace-nowrap leading-none ${
                        currencyIndex === idx
                        ? 'bg-[#FFCC6A] text-[#0D3A1D] border-[#FFCC6A]'
                        : 'bg-[#0D3A1D]/60 text-[#FFCC6A]/60 border-[#FFCC6A]/20 hover:border-[#FFCC6A]/60'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* INITIAL CAPITAL */}
              <div>
                <label className="block text-[10px] md:text-[11px] font-bold text-[#FFCC6A] uppercase tracking-wide mb-1">INITIAL CAPITAL</label>
                <p className="text-[9px] md:text-[10px] text-[#FFCC6A]/60 mb-3">The initial capital to be invested at the start of the simulation.</p>
<div className="relative bg-[#0D3A1D]/80 border border-[#FFCC6A]/20 rounded-sm focus-within:border-[#FFCC6A]/50 transition-all h-12 md:h-14">
                  <span className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-[#FFCC6A]/40 text-[9px] md:text-[11px] font-bold uppercase tracking-tight">{selectedCurrency.label}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={investment === 0 ? '' : investment.toLocaleString()}
                    onChange={handleInvestmentChange}
                    className="scenario-amount-input w-full h-full pl-16 md:pl-32 pr-4 md:pr-10 bg-transparent text-white outline-none font-bold tracking-tight"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* WITHDRAWAL */}
              <div>
                <label className="block text-[10px] md:text-[11px] font-bold text-[#FFCC6A] uppercase tracking-wide mb-1">Yearly Withdrawal (If Any)</label>
                <p className="text-[9px] md:text-[10px] text-[#FFCC6A]/60 mb-3">Annual outflow for expenses, subtracted at the end of each simulated year.</p>
                <div className="relative bg-[#0D3A1D]/80 border border-[#FFCC6A]/20 rounded-sm focus-within:border-[#FFCC6A]/50 transition-all h-12 md:h-14">
<span className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-[#FFCC6A]/40 text-[9px] md:text-[11px] font-bold uppercase tracking-tight">{selectedCurrency.label}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={withdrawal === 0 ? '' : withdrawal.toLocaleString()}
                    onChange={handleWithdrawalChange}
                    className="scenario-amount-input w-full h-full pl-16 md:pl-32 pr-4 md:pr-10 bg-transparent text-white outline-none font-bold tracking-tight"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* RETURN RANGE */}
              <div>
                <label className="text-[10px] md:text-[11px] font-bold text-[#FFCC6A] uppercase tracking-wide mb-3 block">Expected Return Range</label>
                <div className="no-print mb-6">
                  <div className="flex gap-2 sm:gap-3 h-8">
                    {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => {
                      const preset = PRESETS[key];
                      const isActive = lowerPct === preset.lower && upperPct === preset.upper;
                      return (
                        <button 
                          key={key}
                          onClick={() => applyPreset(key)}
                          className={`flex-1 flex items-center justify-center text-[10px] md:text-[12px] font-bold rounded-md border transition-all uppercase tracking-tight px-1 text-center leading-none ${
                            isActive
                            ? 'bg-[#FFCC6A] text-[#0D3A1D] border-[#FFCC6A]' 
                            : 'bg-[#0D3A1D]/40 text-[#FFCC6A]/60 border-[#FFCC6A]/20 hover:bg-[#FFCC6A]/10'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-between items-end border-b border-[#FFCC6A]/10 pb-4 mb-8">
                  <span className="text-[8px] md:text-[9px] font-bold text-[#FFCC6A]/40 uppercase tracking-tight">Selected Boundaries</span>
                  <span className="text-[11px] md:text-[14px] font-bold text-[#FFCC6A] tracking-tight">{formatPercent(lowerPct)} | {formatPercent(upperPct)}</span>
                </div>
                
                <div className="space-y-8 md:space-y-12 lg:space-y-16">
                  <div>
                    <div className="flex justify-between text-[10px] md:text-[11px] font-bold text-[#FFCC6A] uppercase tracking-tight mb-2">
                      <span>Low Point (Worst Year)</span>
                      <span className="font-bold">{lowerPct.toFixed(1)}%</span>
                    </div>
                    <p className="text-[8px] md:text-[9px] text-[#FFCC6A]/40 mb-3">The minimum expected annual performance in a downturn.</p>
                    <input 
                      type="range" min="-10" max="0" step="0.1" value={lowerPct}
                      onChange={(e) => setLowerPct(parseFloat(e.target.value))}
                      className="w-full h-[2px] bg-[#FFCC6A]/20 rounded-full appearance-none cursor-pointer accent-white no-print"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] md:text-[11px] font-bold text-[#FFCC6A] uppercase tracking-tight mb-2">
                      <span>High Point (Best Year)</span>
                      <span className="font-bold">{upperPct.toFixed(1)}%</span>
                    </div>
                    <p className="text-[8px] md:text-[9px] text-[#FFCC6A]/40 mb-3">The maximum expected annual performance in a bull market.</p>
                    <input 
                      type="range" min="0" max="15" step="0.1" value={upperPct}
                      onChange={(e) => setUpperPct(parseFloat(e.target.value))}
                      className="w-full h-[2px] bg-[#FFCC6A]/20 rounded-full appearance-none cursor-pointer accent-white no-print"
                    />
                  </div>
                </div>
              </div>

              {/* DURATION */}
              <div>
                <label className="text-[10px] md:text-[11px] font-bold text-[#FFCC6A] uppercase tracking-wide mb-1 block">Investment Length: {years} Years</label>
                <p className="text-[9px] md:text-[10px] text-[#FFCC6A]/60 mb-6">The period over which your capital is simulated and evaluated.</p>
                <div className="flex justify-between items-end pb-2 mb-2">
                  <span className="text-[8px] md:text-[9px] font-bold text-[#FFCC6A]/40 uppercase tracking-tight">Time Horizon</span>
                  <span className="text-[11px] md:text-[14px] font-bold text-[#FFCC6A] tracking-tight">{years} Years</span>
                </div>
                <input 
                  type="range" min="0.5" max="30" step="0.5" value={years} 
                  onChange={(e) => setYears(parseFloat(e.target.value))}
                  className="w-full h-[2px] bg-[#FFCC6A]/20 rounded-full appearance-none cursor-pointer accent-white no-print"
                />
              </div>

              {/* CONFIDENCE */}
              <div>
                <label className="block text-[10px] md:text-[11px] font-bold text-[#FFCC6A] uppercase tracking-wide mb-1">Confidence Level</label>
                <p className="text-[9px] md:text-[10px] text-[#FFCC6A]/60 mb-3">90% prioritises realistic scenarios, while 99% plans for extreme, unlikely outcomes.</p>
                <div className="relative">
                  <select 
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className={`w-full pl-4 md:pl-8 pr-12 md:pr-16 py-2 md:py-3 rounded-sm border border-[#FFCC6A]/30 bg-[#0D3A1D] text-white focus:border-[#FFCC6A] outline-none appearance-none cursor-pointer font-bold tracking-tight text-xs md:text-base no-print`}
                  >
                    <option value={99}>99% Probability</option>
                    <option value={98}>98% Probability</option>
                    <option value={95}>95% Probability</option>
                    <option value={90}>90% Probability</option>
                  </select>
                  <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 pointer-events-none no-print">
                    <ChevronDownIcon />
                  </div>
                  <div className="hidden print:block w-full pl-4 md:pl-8 py-4 md:py-6 rounded-sm border border-[#FFCC6A]/30 bg-[#0D3A1D] text-white font-bold tracking-tight text-xs md:text-base">
                    {confidence}% Probability
                  </div>
                </div>
              </div>

              {/* INFLATION — toggle + rate (Capital Health Model style) */}
              <div>
                <label className="block text-[10px] md:text-[11px] font-bold text-[#FFCC6A] uppercase tracking-wide mb-1">Inflation Adjustment</label>
                <p className="text-[9px] md:text-[10px] text-[#FFCC6A]/60 mb-3">When ON, outcomes are shown in real terms. Default: ON, 1.5%. When OFF, inflation is treated as 0%.</p>
                <div className="flex items-center gap-4 mb-3">
                  <button
                    type="button"
                    onClick={() => setInflationAdjustmentOn(true)}
                    className={`px-4 py-1 rounded border text-[10px] font-bold uppercase ${inflationAdjustmentOn ? 'bg-[#FFCC6A] text-[#0D3A1D] border-[#FFCC6A]' : 'border-[#FFCC6A]/30 text-[#FFCC6A]/70'}`}
                  >
                    ON
                  </button>
                  <button
                    type="button"
                    onClick={() => setInflationAdjustmentOn(false)}
                    className={`px-4 py-1 rounded border text-[10px] font-bold uppercase ${!inflationAdjustmentOn ? 'bg-[#FFCC6A] text-[#0D3A1D] border-[#FFCC6A]' : 'border-[#FFCC6A]/30 text-[#FFCC6A]/70'}`}
                  >
                    OFF
                  </button>
                  {inflationAdjustmentOn && (
                    <>
                      <input type="range" min="0.5" max="10" step="0.1" value={inflationPct} onChange={(e) => setInflationPct(parseFloat(e.target.value))} className="flex-1 h-[2px] bg-[#FFCC6A]/20 rounded-full appearance-none cursor-pointer accent-white no-print" />
                      <span className="text-[11px] md:text-[14px] font-bold text-[#FFCC6A] tracking-tight w-12">{inflationPct.toFixed(1)}%</span>
                    </>
                  )}
                </div>
              </div>

              {/* STRESS EVENT */}
              <div>
                <label className="block text-[10px] md:text-[11px] font-bold text-[#FFCC6A] uppercase tracking-wide mb-1">Include Market Shock Event</label>
                <p className="text-[9px] md:text-[10px] text-[#FFCC6A]/60 mb-3">Adds a single severe market correction at one point within the selected time horizon to test capital resilience.</p>
                <div className="relative">
                  <select 
                    value={stressSeverity}
                    onChange={(e) => setStressSeverity(e.target.value as StressSeverity)}
                    className="w-full pl-4 md:pl-8 pr-12 md:pr-16 py-2 md:py-3 rounded-sm border border-[#FFCC6A]/30 bg-[#0D3A1D] text-white focus:border-[#FFCC6A] outline-none appearance-none cursor-pointer font-bold tracking-tight text-xs md:text-base no-print"
                  >
                    {STRESS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 pointer-events-none no-print">
                    <ChevronDownIcon />
                  </div>
                </div>
              </div>

              {/* RUN — button moved to sticky bottom-left */}
            </div>
          </div>
        </section>

        {/* RESULTS — Single stacked analytical report */}
        <section className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 md:space-y-10 lg:space-y-14 xl:space-y-16">
          {!mcResult && (
            <p className="text-[#FFCC6A]/60 text-center py-8 uppercase">Run Simulation to see results.</p>
          )}

          {mcResult && (
            <div className="space-y-4 sm:space-y-6 md:space-y-10 lg:space-y-14 xl:space-y-16">
          {/* CAPITAL DIAGNOSIS — introduction (horizontal flow on desktop, stacked on mobile) */}
          <div>
            <h2 className="text-sm md:text-lg font-bold uppercase tracking-wide mb-2 md:mb-4 serif-font text-[#FFCC6A]">CAPITAL DIAGNOSIS</h2>
            <p className="text-[8px] sm:text-[9px] md:text-xs text-[#F6F5F1] mb-4 md:mb-6">This system evaluates the strength of your capital structure using three core indicators:</p>
            <div className="flex flex-col items-center text-center md:flex-row md:items-start md:justify-between md:text-left gap-3 md:gap-1 mb-4 md:mb-6">
              <div className="flex-1 min-w-0 w-full md:w-auto">
                <p className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-wide text-[#FFCC6A] mb-0.5">Resilience Score</p>
                <p className="text-[8px] sm:text-[9px] md:text-xs text-[#F6F5F1] leading-snug">Measures whether your capital is likely to survive over the selected time horizon.</p>
                <div className="md:hidden flex justify-center pt-0.5 text-[#FFCC6A]" aria-hidden="true"><span className="text-lg">▼</span></div>
              </div>
              <div className="hidden md:flex items-center shrink-0 text-[#FFCC6A] px-1" aria-hidden="true">
                <span className="text-xl">→</span>
              </div>
              <div className="flex-1 min-w-0 w-full md:w-auto">
                <p className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-wide text-[#FFCC6A] mb-0.5">Fragility Index</p>
                <p className="text-[8px] sm:text-[9px] md:text-xs text-[#F6F5F1] leading-snug">Measures how sensitive your capital structure is to market shocks and volatility.</p>
                <div className="md:hidden flex justify-center pt-0.5 text-[#FFCC6A]" aria-hidden="true"><span className="text-lg">▼</span></div>
              </div>
              <div className="hidden md:flex items-center shrink-0 text-[#FFCC6A] px-1" aria-hidden="true">
                <span className="text-xl">→</span>
              </div>
              <div className="flex-1 min-w-0 w-full md:w-auto">
                <p className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-wide text-[#FFCC6A] mb-0.5">Depletion Pressure</p>
                <p className="text-[8px] sm:text-[9px] md:text-xs text-[#F6F5F1] leading-snug">Measures whether withdrawals are placing strain on long-term capital sustainability.</p>
              </div>
            </div>
            <div className="pt-4">
              <div className="w-32 sm:w-40 mx-auto border-t border-[#FFCC6A]/40 mb-4" aria-hidden="true" />
              <p className="text-[8px] sm:text-[9px] md:text-xs font-bold uppercase tracking-wide text-[#F6F5F1] mb-2">Think of your capital structure like a car</p>
              <p className="text-[8px] sm:text-[9px] md:text-xs text-[#F6F5F1] leading-relaxed">
                <strong className="text-[#FFCC6A]">RESILIENCE SCORE</strong>: The strength of the engine &nbsp;→&nbsp; <strong className="text-[#FFCC6A]">FRAGILITY INDEX</strong>: How sensitive the engine is to road conditions &nbsp;→&nbsp; <strong className="text-[#FFCC6A]">DEPLETION PRESSURE</strong>: How quickly the fuel is being consumed.
              </p>
              <p className="text-[8px] sm:text-[9px] md:text-xs text-[#F6F5F1] mt-6 pb-8 border-b border-[#FFCC6A]/40">Together these indicators reveal whether the capital structure is strong, vulnerable, or under pressure.</p>
            </div>
          </div>

          {/* CAPITAL STRUCTURE HEALTH: Resilience Score + Fragility Index + Health Status pill */}
          <div className="space-y-6 md:space-y-9 lg:space-y-12">
            <div className="pb-2 flex flex-row flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm md:text-lg font-bold text-[#FFCC6A] uppercase tracking-wide serif-font leading-tight mt-0">CAPITAL STRUCTURE HEALTH</h2>
                <p className="text-[10px] text-[#FFCC6A]/60 mt-1">Combined view of Resilience Score, Fragility Index, and Depletion Pressure.</p>
              </div>
              {depletionBarOutput != null && (() => {
                const returnRange = upperPct - lowerPct;
                const returnSens = Math.min(100, Math.max(0, (returnRange - 5) * 10));
                const withdrawalSens = investment > 0 ? Math.min(100, (withdrawal / investment) * 500) : 0;
                const inflationSens = Math.min(100, effectiveInflation * 25);
                const volSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2);
                const drawdownSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2.5);
                const fragilityIndex = Math.round((returnSens + withdrawalSens + inflationSens + volSens + drawdownSens) / 5);
                const fiTier = getFragilityIndexTier(fragilityIndex);
                const healthStatus = getCapitalHealthStatus(mcResult.tier, fiTier, depletionBarOutput.pillLabel);
                return (
                  <span
                    className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-md text-[11px] md:text-sm font-bold uppercase shrink-0 self-start md:px-4"
                    style={{ backgroundColor: CAPITAL_HEALTH_COLORS[healthStatus], color: healthStatus === 'Watchful' || healthStatus === 'Stable' ? '#0D3A1D' : '#FFFFFF', lineHeight: 1 }}
                  >
                    {healthStatus === 'Watchful' ? (
                      <>
                        <span className="sm:hidden">MONITOR</span>
                        <span className="hidden sm:inline">Watchful</span>
                      </>
                    ) : healthStatus === 'Needs Attention' ? (
                      <>
                        <span className="sm:hidden">REVIEW</span>
                        <span className="hidden sm:inline">Needs Attention</span>
                      </>
                    ) : healthStatus}
                  </span>
                );
              })()}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 lg:gap-10 items-stretch">
              {/* 1. Resilience Score */}
              <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl h-full flex flex-col min-h-0">
                <h3 className="text-sm md:text-lg font-bold mb-1 text-[#FFCC6A] uppercase tracking-wide serif-font">Lion score (0–100)</h3>
                <p className="text-[9px] md:text-[10px] text-[#FFCC6A]/60 mb-4">Step 1: Can your capital survive? Derived from the model resilience index.</p>
                <div className="flex flex-wrap items-center gap-4 gap-y-2">
                  <p className="text-sm md:text-xl font-bold tracking-tight text-white">{stressScoreToDisplay0to100(mcResult.capitalResilienceScore)}</p>
                  <span
                    className="inline-flex items-center px-4 py-1 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-md"
                    style={{ backgroundColor: TIER_PILL_COLORS[mcResult.tier] || '#FFCC6A', color: mcResult.tier === 'Moderate' ? '#0D3A1D' : getPillTextColor(mcResult.tier) }}
                  >
                    {mcResult.tier.toUpperCase()}
                  </span>
                </div>
                <p className="text-[9px] md:text-[10px] text-[#FFCC6A]/60 mt-2">Higher means stronger survival odds over the horizon under your assumptions. Same scale as Lion&apos;s Verdict below.</p>
                <div className="mt-3 space-y-2 text-[10px] md:text-[11px]">
                  <div>
                    <p className="font-bold mb-0.5" style={{ color: '#FFCC6A' }}>Probability of Success Over {years}-Year:</p>
                    <p className="text-[#F6F5F1]">{getResilienceScoreProbabilityCopy(mcResult.tier, years)}</p>
                  </div>
                  <p className="text-[#F6F5F1] italic">{getResilienceScoreInterpretation(mcResult.tier)}</p>
                </div>
              </div>

              {/* Fragility Index — weighted from radar inputs */}
              {(() => {
                const returnRange = upperPct - lowerPct;
                const returnSens = Math.min(100, Math.max(0, (returnRange - 5) * 10));
                const withdrawalSens = investment > 0 ? Math.min(100, (withdrawal / investment) * 500) : 0;
                const inflationSens = Math.min(100, effectiveInflation * 25);
                const volSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2);
                const drawdownSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2.5);
                const fragilityIndex = Math.round((returnSens + withdrawalSens + inflationSens + volSens + drawdownSens) / 5);
                const fiTier = getFragilityIndexTier(fragilityIndex);
                return (
                  <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl h-full flex flex-col min-h-0">
                    <h3 className="text-sm md:text-lg font-bold mb-1 text-[#FFCC6A] uppercase tracking-wide serif-font">Fragility Index</h3>
                    <p className="text-[9px] md:text-[10px] text-[#FFCC6A]/60 mb-4">Step 2: How fragile is the structure?</p>
                    <div className="flex flex-wrap items-center gap-4 gap-y-2">
                      <p className="text-sm md:text-xl font-bold tracking-tight text-white">{fragilityIndex}</p>
                      <span
                        className="inline-flex items-center px-4 py-1 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-md"
                        style={{ backgroundColor: FRAGILITY_INDEX_COLORS[fiTier], color: getFragilityIndexPillTextColor(fiTier) }}
                      >
                        {fiTier.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#FFCC6A]/60 mt-2">(0–20 FORTIFIED, 21–40 Highly Robust, 41–60 Stable, 61–80 Fragile, 81–100 Critical)</p>
                    <p className="text-[8px] text-[#FFCC6A]/50 uppercase mt-1">THE LOWER THE BETTER</p>
                    <p className="text-[10px] md:text-[11px] font-bold mt-2" style={{ color: '#FFCC6A' }}>Measures How Sensitive Your Capital Structure Is To Market Shocks & Market Volatility:</p>
                    <p className="text-[10px] md:text-[11px] text-[#F6F5F1] italic mt-2">{getFragilityIndexInterpretation(fiTier)}</p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Depletion Pressure */}
          <div className="bg-[#0D3A1D] px-6 md:px-8 pt-3 md:pt-5 pb-8 md:pb-12 rounded-sm border border-[#FFCC6A]/20 shadow-2xl">
              <h3 className="text-sm md:text-lg font-bold mb-1 text-[#FFCC6A] uppercase tracking-wide serif-font">Depletion Pressure</h3>
              <p className="text-[9px] md:text-[10px] text-[#FFCC6A]/60 mb-4">Step 3: Are withdrawals creating pressure?</p>
              <p className="text-[10px] md:text-[11px] font-bold mb-2" style={{ color: '#FFCC6A' }}>This Indicator Shows Whether Withdrawals Are Placing Strain On The Sustainability Of Your Capital:</p>
            {depletionBarOutput != null && (() => {
              const s = depletionBarOutput.segmentStops;
              const POLICY_B_COLORS = ['#CA3A2E', '#D27A1F', '#E3A539', '#9BAA23', '#1F8A4D'];
              const gradientStops = s.map((pct, i) => `${POLICY_B_COLORS[Math.min(i, 4)]} ${pct}%`).join(', ');
              return (
              <div className="w-full max-w-3xl text-left">
                <p className="text-[8px] text-[#FFCC6A]/50 uppercase mb-3 text-left">The Lower The Better</p>
                <div className="flex justify-between items-center text-[9px] font-bold text-[#FFCC6A]/60 tracking-wide mb-1.5 px-0.5" style={{ fontVariant: 'small-caps' }}>
                  <span>Critical</span>
                  <span>Stable</span>
                </div>
                <div className="relative w-full h-3">
                  <div className="absolute inset-0 w-full rounded-full overflow-hidden border border-[#FFCC6A]/25 bg-transparent">
                    <div
                      className="absolute inset-0"
                      style={{ background: `linear-gradient(90deg, ${gradientStops})` }}
                    />
                  </div>
                  <div
                    className="absolute top-1/2 left-0 -translate-y-1/2 h-3 pointer-events-none overflow-visible"
                    style={{ left: `${depletionBarOutput.pos}%`, transform: 'translate(-50%, -50%)', width: 0, transition: 'none' }}
                  >
                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] rounded-full animate-pulse"
                      style={{
                        height: '28px',
                        background: 'linear-gradient(180deg, transparent 0%, #FFCC6A 15%, #E8D4A0 50%, #FFCC6A 85%, transparent 100%)',
                        boxShadow: '0 0 10px rgba(255, 204, 106,0.9), 0 0 4px rgba(255, 204, 106,0.6)',
                      }}
                    />
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2.5 flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-bold text-[#FFCC6A] tracking-tight drop-shadow-sm whitespace-nowrap">
                        {formatSignedPct(depletionBarOutput.displayValue)}
                      </span>
                      <span
                        title="Method: Net Pressure (bar‑derived)"
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase shadow whitespace-nowrap"
                        style={{ backgroundColor: FRAGILITY_GAUGE_COLORS[depletionBarOutput.pillLabel], color: getPillTextColor(depletionBarOutput.pillLabel) }}
                      >
                        {depletionBarOutput.pillLabel === 'Vulnerable' ? (
                          <>
                            <span className="sm:hidden">Exposed</span>
                            <span className="hidden sm:inline">Vulnerable</span>
                          </>
                        ) : depletionBarOutput.pillLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              );
            })()}
              {depletionBarOutput != null && <p className="text-[10px] md:text-[11px] text-[#F6F5F1] italic mt-10 md:mt-14 pt-4">{getDepletionPressureInterpretation(depletionBarOutput.pillLabel)}</p>}
          </div>

          <div className="border-t border-[#FFCC6A]/40 my-0" aria-hidden="true" />

          {/* Structural Stability Map: 2-axis (Depletion Pressure × Fragility Index), 4 zones */}
          {depletionBarOutput != null && (() => {
            const returnRange = upperPct - lowerPct;
            const returnSens = Math.min(100, Math.max(0, (returnRange - 5) * 10));
            const withdrawalSens = investment > 0 ? Math.min(100, (withdrawal / investment) * 500) : 0;
            const inflationSens = Math.min(100, effectiveInflation * 25);
            const volSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2);
            const drawdownSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2.5);
            const fragilityIndex = Math.round((returnSens + withdrawalSens + inflationSens + volSens + drawdownSens) / 5);
            const pressure = depletionBarOutput.pressure;
            const xNorm = Math.max(0, Math.min(100, ((pressure + 125) / 250) * 100));
            const zone = (x: number, y: number) => {
              const lowDep = x < 50, lowFrag = y > 50;
              if (lowDep && lowFrag) return 'Strong Structure';
              if (!lowDep && lowFrag) return 'Withdrawal Risk';
              if (lowDep && !lowFrag) return 'Market Fragility';
              return 'Structural Stress';
            };
            const yNorm = 100 - fragilityIndex;
            const currentZone = zone(xNorm, yNorm);
            const expanded = !collapsedSections.structuralStabilityMap;
            return (
              <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl">
                <button type="button" onClick={() => toggleSection('structuralStabilityMap')} className="w-full text-left flex items-center justify-between gap-2 group">
                  <h2 className="text-sm md:text-lg font-bold text-[#FFCC6A] uppercase tracking-wide serif-font">Structural Stability Map</h2>
                  <span className="inline-flex items-center rounded border border-[#FFCC6A]/60 text-[#FFCC6A]/90 py-0.5 px-1.5 sm:px-2 text-[9px] sm:text-xs font-medium shrink-0">{expanded ? 'Collapse' : 'Expand'}</span>
                </button>
                {expanded && (
                  <>
                <p className="text-[10px] md:text-[11px] font-bold mb-2 mt-2" style={{ color: '#FFCC6A' }}>This map shows how strong your capital structure is based on its sensitivity to market shocks and withdrawal pressure.</p>
                <div className="max-w-md mx-auto">
                  <svg viewBox="-18 -18 136 136" className="w-full aspect-square" preserveAspectRatio="xMidYMid meet" aria-label="Structural Stability Map: Depletion Pressure horizontal, Fragility Index vertical">
                    <defs>
                      <linearGradient id="zoneStrong" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#1F8A4D" stopOpacity="0.4"/><stop offset="100%" stopColor="#1F8A4D" stopOpacity="0.12"/></linearGradient>
                      <linearGradient id="zoneWithdrawal" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#E3A539" stopOpacity="0.4"/><stop offset="100%" stopColor="#E3A539" stopOpacity="0.12"/></linearGradient>
                      <linearGradient id="zoneMarket" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#0D9488" stopOpacity="0.4"/><stop offset="100%" stopColor="#0D9488" stopOpacity="0.12"/></linearGradient>
                      <linearGradient id="zoneStress" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#CA3A2E" stopOpacity="0.4"/><stop offset="100%" stopColor="#CA3A2E" stopOpacity="0.12"/></linearGradient>
                      <filter id="mapDotGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="blur"/>
                        <feFlood floodColor="#FFCC6A" floodOpacity="0.7"/>
                        <feComposite in2="blur" operator="in" result="glow"/>
                        <feMerge>
                          <feMergeNode in="glow"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    {/* Axis labels */}
                    <text x="50" y="116" textAnchor="middle" fontSize="4" fill="#FFCC6A" fontWeight="bold">Depletion Pressure</text>
                    <text x="50" y="122" textAnchor="middle" fontSize="2.6" fill="#FFCC6A" fillOpacity="0.85">← Lower pressure</text>
                    <text x="50" y="122" textAnchor="end" dx="48" fontSize="2.6" fill="#FFCC6A" fillOpacity="0.85">Heavier pressure →</text>
                    <text x="-10" y="50" textAnchor="middle" fontSize="4" fill="#FFCC6A" fontWeight="bold" transform="rotate(-90 -10 50)">Fragility Index</text>
                    <text x="-14" y="85" textAnchor="middle" fontSize="2.6" fill="#FFCC6A" fillOpacity="0.85" transform="rotate(-90 -14 85)">↓ Stronger</text>
                    <text x="-14" y="15" textAnchor="middle" fontSize="2.6" fill="#FFCC6A" fillOpacity="0.85" transform="rotate(-90 -14 15)">↑ Higher sensitivity</text>
                    {/* Quadrant zones */}
                    <rect x="0" y="50" width="50" height="50" fill="url(#zoneStrong)" stroke="#FFCC6A" strokeOpacity="0.4" strokeWidth="0.35"/>
                    <rect x="50" y="50" width="50" height="50" fill="url(#zoneWithdrawal)" stroke="#FFCC6A" strokeOpacity="0.4" strokeWidth="0.35"/>
                    <rect x="0" y="0" width="50" height="50" fill="url(#zoneMarket)" stroke="#FFCC6A" strokeOpacity="0.4" strokeWidth="0.35"/>
                    <rect x="50" y="0" width="50" height="50" fill="url(#zoneStress)" stroke="#FFCC6A" strokeOpacity="0.4" strokeWidth="0.35"/>
                    <line x1="50" y1="0" x2="50" y2="100" stroke="#FFCC6A" strokeOpacity="0.5" strokeWidth="0.3"/>
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#FFCC6A" strokeOpacity="0.5" strokeWidth="0.3"/>
                    {/* Quadrant labels inside chart */}
                    <text x="25" y="72" textAnchor="middle" fontSize="3.2" fill="#F6F5F1" fontWeight="600">Strong Structure</text>
                    <text x="75" y="72" textAnchor="middle" fontSize="3.2" fill="#F6F5F1" fontWeight="600">Withdrawal Risk</text>
                    <text x="25" y="22" textAnchor="middle" fontSize="3.2" fill="#F6F5F1" fontWeight="600">Market Fragility</text>
                    <text x="75" y="22" textAnchor="middle" fontSize="3.2" fill="#F6F5F1" fontWeight="600">Structural Stress</text>
                    {/* Current position marker + label */}
                    <circle cx={xNorm} cy={yNorm} r="2.8" fill="#FFCC6A" stroke="#F6F5F1" strokeWidth="0.9" filter="url(#mapDotGlow)"/>
                    <text x={Math.min(92, xNorm + 5)} y={yNorm} textAnchor={xNorm > 70 ? 'end' : 'start'} dx={xNorm > 70 ? -4 : 4} fontSize="2.8" fill="#FFCC6A" fontWeight="bold">Current Position</text>
                  </svg>
                  <p className="text-[10px] font-bold mt-2 text-center" style={{ color: '#FFCC6A' }}>Current Position: <span className="text-white uppercase">{currentZone}</span> · Fragility Index: {fragilityIndex} · Depletion Pressure: {depletionBarOutput.pillLabel}</p>
                  <div className="flex items-end justify-between mt-1 text-[8px] text-[#FFCC6A]/60 gap-2">
                    <span>Left: lower withdrawal pressure</span>
                    <span className="text-center shrink-0">Bottom: stronger resilience · Top: higher market sensitivity</span>
                    <span>Right: heavier pressure</span>
                  </div>
                </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* 2. Simulated Average Outcome */}
          <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl">
            <h2 className="text-sm md:text-lg font-bold mb-1 text-[#FFCC6A] uppercase tracking-wide serif-font">Simulated Average Outcome</h2>
            <p className="text-[9px] md:text-[10px] text-[#FFCC6A]/60 mb-4 -mt-0.5">Using the simulated average reduces market noise to show a more stable and representative outcome over {mcResult.simulationCount.toLocaleString()} scenarios.</p>
            <p className="text-lg md:text-2xl font-bold tracking-tighter break-words" style={{ color: '#F6F5F1' }}>{formatCurrency(mcResult.simulatedAverage)}</p>
            <p className="text-[11px] md:text-xs text-[#FFCC6A]/60 mt-1">After inflation ({effectiveInflation}% p.a.): <span className="font-bold text-[#FFCC6A]">{formatCurrency(mcResult.simulatedAverage / Math.pow(1 + effectiveInflation / 100, years))}</span></p>
          </div>

          {/* 3. Possible Capital Outcomes */}
          <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl">
            <h2 className="text-sm md:text-lg font-bold mb-6 text-[#FFCC6A] uppercase tracking-wide serif-font">POSSIBLE CAPITAL OUTCOMES</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 lg:gap-10">
              <div className="space-y-2 p-4 rounded border border-[#FFCC6A]/10 bg-[#0D3A1D]/30 min-w-0">
                <p className="text-[11px] font-bold text-[#FFCC6A] uppercase tracking-tight">Typical Outcome</p>
                <p className="text-sm md:text-lg font-bold text-white break-words">{formatCurrency(mcResult.percentile50)}</p>
                <p className="text-[9px] text-[#FFCC6A]/60 leading-relaxed">The typical result across all simulations.</p>
              </div>
              <div className="space-y-2 p-4 rounded border border-[#FFCC6A]/10 bg-[#0D3A1D]/30 min-w-0">
                <p className="text-[11px] font-bold text-[#FFCC6A] uppercase tracking-tight">Most Likely Range</p>
                <p className="text-sm md:text-lg font-bold text-white break-words">{formatCurrency(mcResult.percentile25)} – {formatCurrency(mcResult.percentile75)}</p>
                <p className="text-[9px] text-[#FFCC6A]/60 leading-relaxed">The range where the middle 50% of outcomes fall.</p>
              </div>
              <div className="space-y-2 p-4 rounded border border-[#FFCC6A]/10 bg-[#0D3A1D]/30 min-w-0">
                <p className="text-[11px] font-bold text-[#FFCC6A] uppercase tracking-tight">Downside Scenario</p>
                <p className="text-sm md:text-lg font-bold text-white break-words">{formatCurrency(mcResult.percentile5)}</p>
                <p className="text-[9px] text-[#FFCC6A]/60 leading-relaxed">A downside result observed in roughly the weakest simulated market environments.</p>
              </div>
              <div className="space-y-2 p-4 rounded border border-[#FFCC6A]/10 bg-[#0D3A1D]/30 min-w-0">
                <p className="text-[11px] font-bold text-[#FFCC6A] uppercase tracking-tight">Strong Market Scenario</p>
                <p className="text-sm md:text-lg font-bold text-white break-words">{formatCurrency(mcResult.percentile95)}</p>
                <p className="text-[9px] text-[#FFCC6A]/60 leading-relaxed">A strong market environment represented by the top simulated outcomes.</p>
              </div>
            </div>
          </div>

          {/* 5. Capital Durability Curve — landscape line chart (wide, short) */}
          <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl">
            <h2 className="text-sm md:text-lg font-bold mb-2 text-[#FFCC6A] uppercase tracking-wide serif-font">Capital Durability Curve</h2>
            <p className="text-[10px] md:text-[11px] font-bold mb-4" style={{ color: '#FFCC6A' }}>Shows how your capital may evolve over time under market conditions and withdrawals:</p>
            <div className="relative w-full min-h-[200px] md:min-h-[240px]" style={{ aspectRatio: '3.5/1' }}>
              {mcResult.yearlyPercentileBands.length > 0 && (() => {
                const bands = mcResult.yearlyPercentileBands;
                const maxVal = Math.max(...bands.map(b => b.p95), investment * 1.2, 1);
                const scale = (v: number) => Math.min(100, (v / maxVal) * 95);
                const w = 100 / (bands.length - 1 || 1);
                const xScale = 4;
                const plotWidth = 100 * xScale;
                const viewWidth = 14 + plotWidth + 8;
                const yTickCount = 5;
                const yTicks = Array.from({ length: yTickCount }, (_, i) => (i / (yTickCount - 1)) * maxVal);
                const xStep = years <= 10 ? 2 : years <= 20 ? 5 : Math.ceil(years / 5);
                const xTickYears = Array.from({ length: Math.floor(years / xStep) + 1 }, (_, i) => i * xStep).filter(y => y <= years);
                const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = (e.clientX - rect.left) / rect.width;
                  const index = Math.min(bands.length - 1, Math.max(0, Math.floor(relX * bands.length)));
                  const b = bands[index];
                  setDurabilityTooltip({ year: b.year, p25: b.p25, p50: b.p50, p75: b.p75, x: e.clientX, y: e.clientY });
                };
                return (
                  <>
                    <svg viewBox={`-14 -6 ${viewWidth} 118`} preserveAspectRatio="xMidYMid meet" className="w-full h-full pointer-events-none" aria-label="Capital durability line chart">
                      <defs>
                        <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFCC6A" stopOpacity="0.3" /><stop offset="100%" stopColor="#FFCC6A" stopOpacity="0.05" /></linearGradient>
                      </defs>
                      {/* Y-axis line */}
                      <line x1={0} y1={0} x2={0} y2={100} stroke="#FFCC6A" strokeOpacity="0.5" strokeWidth="0.3" />
                      {/* X-axis line */}
                      <line x1={0} y1={100} x2={plotWidth} y2={100} stroke="#FFCC6A" strokeOpacity="0.5" strokeWidth="0.3" />
                      {/* Y-axis tick marks and numbers */}
                      {yTicks.map((val, i) => {
                        const y = 100 - scale(val);
                        return (
                          <g key={`y-${i}`}>
                            <line x1={0} y1={y} x2={-0.8} y2={y} stroke="#FFCC6A" strokeOpacity="0.5" strokeWidth="0.25" />
                            <text x={-2.2} y={y} fontSize="2.8" fill="#FFCC6A" fillOpacity="0.85" textAnchor="end" dominantBaseline="middle">{formatCurrency(Math.round(val))}</text>
                          </g>
                        );
                      })}
                      {/* X-axis tick marks and numbers */}
                      {xTickYears.map((year) => {
                        const x = (year / years) * plotWidth;
                        return (
                          <g key={`x-${year}`}>
                            <line x1={x} y1={100} x2={x} y2={100.8} stroke="#FFCC6A" strokeOpacity="0.5" strokeWidth="0.25" />
                            <text x={x} y={103} fontSize="2.8" fill="#FFCC6A" fillOpacity="0.85" textAnchor="middle">{year}</text>
                          </g>
                        );
                      })}
                      {/* Y-axis label at top of chart — larger on mobile */}
                      <text x={0} y={-3} fontSize="9" fill="#FFCC6A" fillOpacity="0.8" textAnchor="start" className="sm:hidden">Capital</text>
                      <text x={0} y={-3} fontSize="5" fill="#FFCC6A" fillOpacity="0.8" textAnchor="start" className="hidden sm:block">Capital</text>
                      {/* Shaded band */}
                      {bands.slice(0, -1).map((b, i) => {
                        const x = i * w * xScale;
                        const next = bands[i + 1];
                        const x2 = (i + 1) * w * xScale;
                        const pts = `${x},${100 - scale(b.p25)} ${x2},${100 - scale(next.p25)} ${x2},${100 - scale(next.p75)} ${x},${100 - scale(b.p75)}`;
                        return <polygon key={i} points={pts} fill="url(#bandGrad)" />;
                      })}
                      {/* Median line */}
                      <polyline fill="none" stroke="#FFCC6A" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" points={bands.map((b, i) => `${i * w * xScale},${100 - scale(b.p50)}`).join(' ')} />
                      {/* 25th / 75th percentile lines */}
                      <polyline fill="none" stroke="#FFCC6A" strokeWidth="0.4" strokeDasharray="1,1" opacity="0.8" strokeLinecap="round" strokeLinejoin="round" points={bands.map((b, i) => `${i * w * xScale},${100 - scale(b.p25)}`).join(' ')} />
                      <polyline fill="none" stroke="#FFCC6A" strokeWidth="0.4" strokeDasharray="1,1" opacity="0.8" strokeLinecap="round" strokeLinejoin="round" points={bands.map((b, i) => `${i * w * xScale},${100 - scale(b.p75)}`).join(' ')} />
                      {/* Data points on median */}
                      {bands.map((b, i) => (
                        <circle key={i} cx={i * w * xScale} cy={100 - scale(b.p50)} r="0.8" fill="#FFCC6A" />
                      ))}
                    </svg>
                    <div
                      className="absolute inset-0 cursor-crosshair"
                      onMouseMove={handleMouseMove}
                      onMouseLeave={() => setDurabilityTooltip(null)}
                      aria-label="Chart hover for tooltip"
                    />
                    {durabilityTooltip && (() => {
                    const tipW = 260;
                    const tipH = 80;
                    const pad = 12;
                    const left = Math.max(pad, Math.min(durabilityTooltip.x + 10, typeof window !== 'undefined' ? window.innerWidth - tipW - pad : durabilityTooltip.x + 10));
                    const top = Math.max(pad, Math.min(durabilityTooltip.y - 8, typeof window !== 'undefined' ? window.innerHeight - tipH - pad : durabilityTooltip.y - 8));
                    return (
                      <div
                        className="fixed z-50 px-3 py-2 rounded-md border border-[#FFCC6A]/40 bg-[#0D3A1D] shadow-lg text-[10px] md:text-xs text-left pointer-events-none max-w-[85vw]"
                        style={{ left, top, transform: 'translateY(-100%)' }}
                      >
                        <p className="font-bold text-[#FFCC6A] border-b border-[#FFCC6A]/30 pb-1 mb-1">Year {durabilityTooltip.year}</p>
                        <p className="text-[#F6F5F1]">Median: {formatCurrency(durabilityTooltip.p50)}</p>
                        <p className="text-[#FFCC6A]/80">Range: {formatCurrency(durabilityTooltip.p25)} – {formatCurrency(durabilityTooltip.p75)}</p>
                      </div>
                    );
                  })()}
                  </>
                );
              })()}
            </div>
            <div className="flex justify-between mt-1 text-[8px] text-[#FFCC6A]/60"><span>Year 0</span><span>Year {years}</span></div>
          </div>

          {/* 6. Capital Outcome Probability Distribution */}
          <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl">
            <button type="button" onClick={() => toggleSection('capitalOutcomeDist')} className="w-full text-left flex items-center justify-between gap-2">
              <h2 className="text-sm md:text-lg font-bold text-[#FFCC6A] uppercase tracking-wide serif-font">Capital Outcome Probability Distribution</h2>
              <span className="inline-flex items-center rounded border border-[#FFCC6A]/60 text-[#FFCC6A]/90 py-0.5 px-1.5 sm:px-2 text-[9px] sm:text-xs font-medium shrink-0">{!collapsedSections.capitalOutcomeDist ? 'Collapse' : 'Expand'}</span>
            </button>
            {!collapsedSections.capitalOutcomeDist && (
              <>
            <p className="text-[10px] md:text-[11px] font-bold mb-4 mt-2" style={{ color: '#FFCC6A' }}>This chart shows how your ending capital varies across thousands of simulated market scenarios:</p>
            <div className="h-40 sm:h-48 relative">
              {mcResult && (() => {
                const finals = mcResult.paths.map(p => p.finalCapital).filter(x => x >= 0);
                if (finals.length === 0) return null;
                const minV = Math.min(...finals);
                const maxV = Math.max(...finals);
                const range = maxV - minV || 1;
                const bins = 24;
                const step = range / bins;
                const hist: number[] = Array(bins).fill(0);
                finals.forEach(v => {
                  const idx = Math.min(bins - 1, Math.floor((v - minV) / step));
                  hist[idx]++;
                });
                const maxCount = Math.max(...hist, 1);
                const barW = 100 / bins;
                const medianVal = mcResult.percentile50;
                const medianBin = Math.min(bins - 1, Math.max(0, Math.floor((medianVal - minV) / step)));
                const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = (e.clientX - rect.left) / rect.width;
                  const index = Math.min(bins - 1, Math.max(0, Math.floor(relX * bins)));
                  const low = minV + index * step;
                  const high = index === bins - 1 ? maxV : minV + (index + 1) * step;
                  setDistributionTooltip({
                    low,
                    high,
                    count: hist[index],
                    pct: (hist[index] / finals.length) * 100,
                    isMedian: index === medianBin,
                    x: e.clientX,
                    y: e.clientY,
                  });
                };
                const xFor = (val: number) => Math.max(0, Math.min(100, ((val - minV) / range) * 100));
                const xConservative = xFor(mcResult.percentile5);
                const xMedian = xFor(mcResult.percentile50);
                const xUpside = xFor(mcResult.percentile95);
                return (
                  <>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full pointer-events-none">
                      {hist.map((count, i) => (
                        <rect
                          key={i}
                          x={i * barW + 1}
                          y={100 - (count / maxCount) * 85}
                          width={barW - 0.5}
                          height={(count / maxCount) * 85}
                          fill={i === medianBin ? '#FFCC6A' : 'rgba(255, 204, 106, 0.4)'}
                          stroke={i === medianBin ? '#FFCC6A' : 'transparent'}
                          strokeWidth="0.5"
                        />
                      ))}
                      {/* Markers: Conservative, Median, Upside */}
                      <line x1={xConservative} y1={0} x2={xConservative} y2={85} stroke="#FFCC6A" strokeOpacity="0.9" strokeWidth="0.4" strokeDasharray="1,0.8" />
                      <line x1={xMedian} y1={0} x2={xMedian} y2={85} stroke="#FFCC6A" strokeOpacity="1" strokeWidth="0.6" />
                      <line x1={xUpside} y1={0} x2={xUpside} y2={85} stroke="#FFCC6A" strokeOpacity="0.9" strokeWidth="0.4" strokeDasharray="1,0.8" />
                    </svg>
                    <div
                      className="absolute inset-0 cursor-crosshair"
                      onMouseMove={handleMouseMove}
                      onMouseLeave={() => setDistributionTooltip(null)}
                      aria-label="Distribution chart hover for tooltip"
                    />
                    {distributionTooltip && (() => {
                      const tipW = 260;
                      const tipH = 88;
                      const pad = 12;
                      const left = Math.max(pad, Math.min(distributionTooltip.x + 10, typeof window !== 'undefined' ? window.innerWidth - tipW - pad : distributionTooltip.x + 10));
                      const top = Math.max(pad, Math.min(distributionTooltip.y - 8, typeof window !== 'undefined' ? window.innerHeight - tipH - pad : distributionTooltip.y - 8));
                      return (
                        <div
                          className="fixed z-50 px-3 py-2 rounded-md border border-[#FFCC6A]/40 bg-[#0D3A1D] shadow-lg text-[10px] md:text-xs text-left pointer-events-none max-w-[85vw]"
                          style={{ left, top, transform: 'translateY(-100%)' }}
                        >
                          <p className="font-bold text-[#FFCC6A] border-b border-[#FFCC6A]/30 pb-1 mb-1">Capital range</p>
                          <p className="text-[#F6F5F1]">{formatCurrency(Math.round(distributionTooltip.low))} – {formatCurrency(Math.round(distributionTooltip.high))}</p>
                          <p className="text-[#FFCC6A]/80 mt-0.5">{distributionTooltip.pct.toFixed(1)}% of scenarios ({distributionTooltip.count.toLocaleString()})</p>
                          {distributionTooltip.isMedian && <p className="text-[#FFCC6A] font-bold mt-0.5 text-[9px]">Typical Outcome</p>}
                        </div>
                      );
                    })()}
                  </>
                );
              })()}
            </div>
            <p className="text-[8px] text-[#FFCC6A]/50 mt-1">Gold bar represents the most typical outcome.</p>
              </>
            )}
          </div>

          {/* 7. Projected Capital at End of Horizon */}
          <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl">
            <h2 className="text-sm md:text-lg font-bold mb-4 text-[#FFCC6A] uppercase tracking-wide serif-font">Projected Capital at End of {years} Years</h2>
            {(() => {
              const withinRange = mcResult.paths.filter(p => p.finalCapital >= mcResult.percentile25 && p.finalCapital <= mcResult.percentile75).length / mcResult.paths.length;
              const aboveStartPct = investment > 0 ? (mcResult.simulatedAverage / investment) * 100 : 0;
              return (
                <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                  <div className="text-center p-3 md:p-6 rounded border border-[#FFCC6A]/20 bg-[#0D3A1D]/30 min-w-0">
                    <p className="text-[11px] font-bold text-[#FFCC6A] uppercase tracking-tight mb-2">VS. STARTING CAPITAL</p>
                    <p className={`text-sm md:text-lg font-bold ${aboveStartPct >= 0 ? 'text-white' : 'text-red-400'}`}>{aboveStartPct.toFixed(1)}%</p>
                    <p className="text-[10px] text-[#FFCC6A]/60 mt-2">Simulated average ending capital vs. Initial Capital</p>
                  </div>
                  <div className="text-center p-3 md:p-6 rounded border border-[#FFCC6A]/20 bg-[#0D3A1D]/30 min-w-0">
                    <p className="text-[11px] font-bold text-[#FFCC6A] uppercase tracking-tight mb-2">Within Expected Range</p>
                    <p className="text-sm md:text-lg font-bold text-white">{(withinRange * 100).toFixed(1)}%</p>
                    <p className="text-[10px] text-[#FFCC6A]/60 mt-2">If you ran this plan many times, the percentage of your ending capital would land in this typical range.</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 8. Simulated Capital Journey Table */}
          <div className="bg-[#0D3A1D] rounded-sm border border-[#FFCC6A]/20 shadow-2xl overflow-hidden">
            <div className="p-6 md:p-8 border-b border-[#FFCC6A]/10 bg-[#0D3A1D]/20">
              <h2 className="text-sm md:text-lg font-bold text-[#FFCC6A] uppercase tracking-wide serif-font">Simulated Capital Journey</h2>
              <p className="text-[9px] md:text-[10px] text-[#FFCC6A]/60 mt-2 mb-4">Markets rarely move in straight lines. These examples show how your capital might evolve under different market conditions.</p>
              <div className="flex flex-nowrap sm:flex-wrap gap-1 sm:gap-2 no-print">
                {(['median', 'best', 'worst'] as const).map(key => (
                  <button
                    key={key}
                    onClick={() => setPathView(key)}
                    className={`flex-1 min-w-0 sm:flex-initial sm:min-w-0 px-2 py-1.5 sm:px-4 sm:py-2 rounded border text-[8px] sm:text-[10px] font-bold uppercase flex flex-col items-center gap-0.5 text-center ${
                      pathView === key
                        ? 'bg-[#FFCC6A] text-[#0D3A1D] border-[#FFCC6A]'
                        : 'bg-transparent text-[#FFCC6A]/70 border-[#FFCC6A]/30 hover:border-[#FFCC6A]/60'
                    }`}
                  >
                    <>
                      <span className="sm:hidden">{key === 'worst' ? 'Stress Market' : key === 'best' ? 'Strong Market' : 'Typical Market'}</span>
                      <span className="hidden sm:inline">{key === 'worst' ? 'Stress Market Path' : key === 'best' ? 'Strong Market Path' : 'Typical Market Path'}</span>
                    </>
                    {key === 'median' && <span className="font-normal normal-case text-[7px] sm:text-[8px] opacity-90"><span className="sm:hidden">median outcomes</span><span className="hidden sm:inline">based on median outcomes</span></span>}
                    {key === 'best' && <span className="font-normal normal-case text-[7px] sm:text-[8px] opacity-90"><span className="sm:hidden">upper-range outcomes</span><span className="hidden sm:inline">based on upper-range outcomes</span></span>}
                    {key === 'worst' && <span className="font-normal normal-case text-[7px] sm:text-[8px] opacity-90"><span className="sm:hidden">weaker-range outcomes</span><span className="hidden sm:inline">based on weaker-range outcomes</span></span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full">
              <table className="hidden sm:table w-full text-left text-sm">
                <thead className="bg-[#0D3A1D] text-[#FFCC6A] font-bold uppercase tracking-tight text-[10px] md:text-[12px]">
                  <tr>
                    <th className="px-10 py-6">Year</th>
                    <th className="px-10 py-6">Est. Return %</th>
                    <th className="px-10 py-6">Annual Change</th>
                    <th className="px-10 py-6 text-right">Account Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFCC6A]/5">
                  {currentPathYearly.map((value, index) => {
                    const prev = index > 0 ? currentPathYearly[index - 1] : 0;
                    const annualChange = prev > 0 ? ((value / prev) - 1) * 100 : 0;
                    let estReturnPct: number | null = null;
                    if (index > 0 && prev > 0 && value > 0) {
                      const endBeforeWithdrawal = value + withdrawal;
                      estReturnPct = (endBeforeWithdrawal / prev - 1) * 100;
                    }
                    return (
                      <tr key={index} className="hover:bg-[#FFCC6A]/5 transition-colors">
                        <td className="px-10 py-4 text-gray-400 font-bold tracking-tight">{index} Yr</td>
                        <td className="px-10 py-4 font-bold text-[#FFCC6A]/80">
                          {index === 0 || estReturnPct === null ? '--' : formatPercentSmall(estReturnPct)}
                        </td>
                        <td className={`px-10 py-4 font-bold ${annualChange >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                          {index === 0 ? '--' : (annualChange > 0 ? '+' : '') + formatPercentSmall(annualChange)}
                        </td>
                        <td className="px-10 py-4 text-gray-100 font-bold text-right tracking-tight">{formatCurrency(value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="sm:hidden divide-y divide-[#FFCC6A]/10">
                {currentPathYearly.map((value, index) => {
                  const prev = index > 0 ? currentPathYearly[index - 1] : 0;
                  const annualChange = prev > 0 ? ((value / prev) - 1) * 100 : 0;
                  let estReturnPct: number | null = null;
                  if (index > 0 && prev > 0 && value > 0) {
                    const endBeforeWithdrawal = value + withdrawal;
                    estReturnPct = (endBeforeWithdrawal / prev - 1) * 100;
                  }
                  return (
                    <div key={index} className="px-6 py-4 flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-gray-400 font-bold tracking-tight">
                        <span>{index} Yr</span>
                        <span className={annualChange >= 0 ? 'text-green-400/60' : 'text-red-400/60'}>
                          {index === 0 ? '--' : formatPercentSmall(annualChange)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-[#FFCC6A]/70 font-semibold tracking-tight">
                        <span>Est. Return</span>
                        <span>{index === 0 || estReturnPct === null ? '--' : formatPercentSmall(estReturnPct)}</span>
                      </div>
                      <div className="text-right text-white font-black text-xs md:text-sm tracking-tighter">{formatCurrency(value)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CAPITAL ADJUSTMENT SIMULATOR + BIGGEST IMPACT */}
          {adjustmentResults != null && mcResult != null && (() => {
            const baseLion = stressScoreToDisplay0to100(mcResult.capitalResilienceScore);
            const scenarios = [
              { key: 'reduceWithdrawal' as const, label: 'Reduce withdrawals by 10%', result: adjustmentResults.reduceWithdrawal, withdrawalUsed: withdrawal * 0.9, yearsUsed: years, lowerUsed: lowerPct, upperUsed: upperPct },
              { key: 'extendHorizon' as const, label: 'Extend investment horizon by 5 years', result: adjustmentResults.extendHorizon, withdrawalUsed: withdrawal, yearsUsed: years + 5, lowerUsed: lowerPct, upperUsed: upperPct },
              { key: 'improveReturns' as const, label: 'Improve portfolio returns by 1%', result: adjustmentResults.improveReturns, withdrawalUsed: withdrawal, yearsUsed: years, lowerUsed: lowerPct + 1, upperUsed: upperPct + 1 },
            ].filter((s): s is typeof s & { result: MonteCarloResult } => s.result != null);
            const withDelta = scenarios.map(s => ({
              ...s,
              delta: stressScoreToDisplay0to100(s.result.capitalResilienceScore) - baseLion,
            })).sort((a, b) => b.delta - a.delta);
            const renderScenario = (s: typeof withDelta[0]) => {
              const r = s.result;
              const depBar = getDepletionBarOutput(r.depletionPressurePct);
              const returnRange = s.upperUsed - s.lowerUsed;
              const returnSens = Math.min(100, Math.max(0, (returnRange - 5) * 10));
              const withdrawalSens = investment > 0 ? Math.min(100, (s.withdrawalUsed / investment) * 500) : 0;
              const inflationSens = Math.min(100, effectiveInflation * 25);
              const volSens = Math.min(100, r.maxDrawdownPctAvg * 2);
              const drawdownSens = Math.min(100, r.maxDrawdownPctAvg * 2.5);
              const lionAdj = stressScoreToDisplay0to100(r.capitalResilienceScore);
              const scenarioStress: LionStressAdvisoryInputs = {
                capitalResilienceScore: r.capitalResilienceScore,
                tier: r.tier,
                fragilityIndicator: depBar.pillLabel as LionStressAdvisoryInputs['fragilityIndicator'],
                initialCapital: investment,
                withdrawalAmount: s.withdrawalUsed,
                timeHorizonYears: s.yearsUsed,
                simulatedAverageOutcome: r.simulatedAverage,
                maximumDrawdownPct: r.maxDrawdownPctAvg,
                worstCaseOutcome: r.percentile5,
              };
              const statusAdj = formatLionPublicStatusLabel(
                lionPublicStatusFromScore0to100(lionAdj, lionStrongEligibilityFromStressInputs(scenarioStress)),
              );
              return (
                <div key={s.key} className="p-4 rounded border border-[#FFCC6A]/20 bg-[#0D3A1D]/30 space-y-2">
                  <p className="font-bold text-[#FFCC6A] text-[10px] md:text-xs uppercase">{s.label}</p>
                  <div className="grid grid-cols-2 gap-2 text-[9px] md:text-[10px]">
                    <span className="text-[#FFCC6A]/80">Lion score: <span className="text-white font-bold">{lionAdj}</span> · {statusAdj}</span>
                    <span className="text-[#FFCC6A]/80">Depletion: <span className="text-white font-bold">{depBar.pillLabel}</span></span>
                  </div>
                  <p className="text-[9px] text-[#FFCC6A]/60 italic">Under this adjustment, Lion score is {lionAdj} ({statusAdj}) with {depBar.pillLabel.toLowerCase()} depletion pressure.</p>
                </div>
              );
            };
            return (
              <>
                <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl">
                  <h2 className="text-sm md:text-lg font-bold mb-2 text-[#FFCC6A] uppercase tracking-wide serif-font">BIGGEST IMPACT IMPROVEMENTS</h2>
                  <p className="text-[9px] text-[#FFCC6A]/60 mb-4">Ranked by impact on Lion score (0–100).</p>
                  <ol className="list-decimal list-inside space-y-1 text-[10px] md:text-xs text-[#F6F5F1] font-medium">
                    {withDelta.slice(0, 3).map((s, i) => (
                      <li key={s.key}>{s.label}</li>
                    ))}
                  </ol>
                </div>
                <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl">
                  <button type="button" onClick={() => toggleSection('capitalAdjustmentSimulator')} className="w-full text-left flex items-center justify-between gap-2">
                    <h2 className="text-sm md:text-lg font-bold text-[#FFCC6A] uppercase tracking-wide serif-font">CAPITAL ADJUSTMENT SIMULATOR</h2>
                    <span className="inline-flex items-center rounded border border-[#FFCC6A]/60 text-[#FFCC6A]/90 py-0.5 px-1.5 sm:px-2 text-[9px] sm:text-xs font-medium shrink-0">{!collapsedSections.capitalAdjustmentSimulator ? 'Collapse' : 'Expand'}</span>
                  </button>
                  {!collapsedSections.capitalAdjustmentSimulator && (
                    <>
                  <p className="text-[9px] text-[#FFCC6A]/60 mb-4 mt-2">See how changes to assumptions may improve your capital structure.</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-[#FFCC6A] mb-2">Scenario 1 — Reduce Withdrawals</p>
                      {renderScenario(withDelta.find(s => s.key === 'reduceWithdrawal')!)}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#FFCC6A] mb-2">Scenario 2 — Extend Investment Horizon</p>
                      {renderScenario(withDelta.find(s => s.key === 'extendHorizon')!)}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#FFCC6A] mb-2">Scenario 3 — Improve Portfolio Returns</p>
                      {renderScenario(withDelta.find(s => s.key === 'improveReturns')!)}
                    </div>
                  </div>
                    </>
                  )}
                </div>
              </>
            );
          })()}

          {/* 10. Capital Stress Radar */}
          <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl">
            <button type="button" onClick={() => toggleSection('capitalStressRadar')} className="w-full text-left flex items-center justify-between gap-2 min-h-[2.5rem]">
              <h2 className="text-sm md:text-lg font-bold text-[#FFCC6A] uppercase tracking-wide serif-font">Capital Stress Radar</h2>
              <span className="inline-flex items-center rounded border border-[#FFCC6A]/60 text-[#FFCC6A]/90 py-0.5 px-1.5 sm:px-2 text-[9px] sm:text-xs font-medium shrink-0">{!collapsedSections.capitalStressRadar ? 'Collapse' : 'Expand'}</span>
            </button>
            {!collapsedSections.capitalStressRadar && (
              <>
            <p className="text-[9px] text-[#FFCC6A]/60 mb-0 mt-2">Shows how sensitive your capital is to key risk drivers. Higher scores indicate greater vulnerability.</p>
            {mcResult && (() => {
              const returnRange = upperPct - lowerPct;
              const returnSens = Math.min(100, Math.max(0, (returnRange - 5) * 10));
              const withdrawalSens = investment > 0 ? Math.min(100, (withdrawal / investment) * 500) : 0;
              const inflationSens = Math.min(100, effectiveInflation * 25);
              const volSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2);
              const drawdownSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2.5);
              const axes = [
                { label: 'Return Sensitivity', value: returnSens },
                { label: 'Withdrawal Pressure', value: withdrawalSens },
                { label: 'Inflation Exposure', value: inflationSens },
                { label: 'Volatility Impact', value: volSens },
                { label: 'Capital Drop Risk', value: drawdownSens },
              ];
              const labelTooltips: Record<string, string> = {
                'Capital Drop Risk': 'Shows how sensitive capital is when it drops during market downturns.',
                'Return Sensitivity': 'Shows how dependent your plan is on achieving the expected investment returns.',
                'Withdrawal Pressure': 'Indicates how much ongoing withdrawals strain your capital over time.',
                'Inflation Exposure': 'Reflects how rising prices can erode your capital\'s real purchasing power.',
                'Volatility Impact': 'Measures how market ups and downs affect the stability of your capital projections.',
              };
              const size = 58;
              const cx = 50; const cy = 50;
              const gridRadius = size / 2;
              const angleStep = (2 * Math.PI) / 5;
              const points = axes.map((a, i) => {
                const a0 = -Math.PI / 2 + i * angleStep;
                const r = (a.value / 100) * gridRadius;
                return { x: cx + r * Math.cos(a0), y: cy + r * Math.sin(a0), label: a.label };
              });
              const poly = points.map(p => `${p.x},${p.y}`).join(' ');
              const labelRadius = 42;
              return (
                <svg viewBox="0 0 100 100" className="w-full max-w-sm mx-auto h-[32rem]" preserveAspectRatio="xMidYMid meet">
                  {[20, 40, 60, 80].map(r => <circle key={r} cx={cx} cy={cy} r={r * size / 200} fill="none" stroke="#FFCC6A" strokeOpacity="0.2" />)}
                  {axes.map((_, i) => {
                    const a0 = -Math.PI / 2 + i * angleStep;
                    const x2 = cx + gridRadius * Math.cos(a0); const y2 = cy + gridRadius * Math.sin(a0);
                    return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="#FFCC6A" strokeOpacity="0.3" />;
                  })}
                  <polygon points={poly} fill="#FFCC6A" fillOpacity="0.25" stroke="#FFCC6A" strokeWidth="0.5" />
                  {points.map((p, i) => (<text key={i} x={p.x} y={p.y} textAnchor="middle" fontSize="3" fill="#FFCC6A">{axes[i].value.toFixed(0)}</text>))}
                  {axes.map((a, i) => {
                    const a0 = -Math.PI / 2 + i * angleStep;
                    const lx = cx + labelRadius * Math.cos(a0);
                    const ly = cy + labelRadius * Math.sin(a0);
                    const style = { paintOrder: 'stroke fill', stroke: '#0D3A1D', strokeWidth: 0.4 };
                    const tooltip = labelTooltips[a.label];
                    const showTooltip = (e: React.MouseEvent) => tooltip && setRadarLabelTooltip({ text: tooltip, x: e.clientX, y: e.clientY });
                    const hideTooltip = () => setRadarLabelTooltip(null);
                    const infoPrefix = isMobileView ? 'ⓘ  ' : 'ⓘ  ';
                    if (a.label === 'Withdrawal Pressure') {
                      return (
                        <g key={`label-${i}`} onMouseEnter={showTooltip} onMouseLeave={hideTooltip} style={{ cursor: tooltip ? 'help' : undefined }}>
                          <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="2.8" fill="#FFCC6A" fillOpacity="1" style={style}>
                            <tspan x={lx} dy="-0.5em">{infoPrefix}Withdrawal</tspan>
                            <tspan x={lx} dy="1.2em">Pressure</tspan>
                          </text>
                        </g>
                      );
                    }
                    if (a.label === 'Capital Drop Risk') {
                      return (
                        <g key={`label-${i}`} onMouseEnter={showTooltip} onMouseLeave={hideTooltip} style={{ cursor: tooltip ? 'help' : undefined }}>
                          <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="2.8" fill="#FFCC6A" fillOpacity="1" style={style}>
                            <tspan x={lx} dy="-0.5em">{infoPrefix}Capital</tspan>
                            <tspan x={lx} dy="1.2em">Drop Risk</tspan>
                          </text>
                        </g>
                      );
                    }
                    const leadingSpace = isMobileView && a.label === 'Return Sensitivity' ? ' ' : '';
                    return (
                      <g key={`label-${i}`} onMouseEnter={showTooltip} onMouseLeave={hideTooltip} style={{ cursor: tooltip ? 'help' : undefined }}>
                        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="2.8" fill="#FFCC6A" fillOpacity="1" style={style}>
                          {leadingSpace}{infoPrefix}{a.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
            {radarLabelTooltip && (() => {
              const pad = 12;
              const tipW = 320;
              const left = Math.max(pad, Math.min(radarLabelTooltip.x + 10, typeof window !== 'undefined' ? window.innerWidth - tipW - pad : radarLabelTooltip.x + 10));
              const top = Math.max(pad, radarLabelTooltip.y - 8);
              return (
                <div
                  className="fixed z-[10000] px-3 py-2 rounded-md border border-[#FFCC6A]/40 bg-[#0D3A1D] shadow-lg text-[10px] md:text-xs text-left pointer-events-none max-w-[85vw]"
                  style={{ left, top, transform: 'translateY(-100%)', width: 'max-content', maxWidth: 'min(320px, 85vw)' }}
                >
                  {radarLabelTooltip.text}
                </div>
              );
            })()}
              </>
            )}
          </div>

          {/* 11. Structural Stress Sensitivity Panel */}
          <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl">
            <button type="button" onClick={() => toggleSection('furtherStressTest')} className="w-full text-left flex items-center justify-between gap-2">
              <h2 className="text-sm md:text-lg font-bold text-[#FFCC6A] uppercase tracking-wide serif-font">FURTHER STRUCTURAL STRESS TEST</h2>
              <span className="inline-flex items-center rounded border border-[#FFCC6A]/60 text-[#FFCC6A]/90 py-0.5 px-1.5 sm:px-2 text-[9px] sm:text-xs font-medium shrink-0">{!collapsedSections.furtherStressTest ? 'Collapse' : 'Expand'}</span>
            </button>
            {!collapsedSections.furtherStressTest && (
              <>
            <p className="text-[9px] text-[#FFCC6A]/60 mb-4 mt-2">Shows how the capital structure responds when key assumptions deteriorate.</p>
            {stressScenarioResults ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] md:text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FFCC6A]/10 text-[#FFCC6A] font-bold uppercase border-b border-[#FFCC6A]/30">
                      <th className="text-center py-3 px-3 border-b border-r border-[#FFCC6A]/20">Stress Driver</th>
                      <th className="text-center py-3 px-3 border-b border-r border-[#FFCC6A]/20"> IF STRESS LEVEL</th>
                      <th className="text-center py-3 px-3 border-b border-r border-[#FFCC6A]/20">Depletion Pressure</th>
                      <th className="text-center py-3 px-3 border-b border-[#FFCC6A]/20">Ending Capital</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FFCC6A]/10">
                    {[
                      { driver: 'Market Returns', indices: [0, 1] },
                      { driver: 'Withdrawals', indices: [2, 3] },
                      { driver: 'Inflation', indices: [4, 5] },
                    ].flatMap(({ driver, indices }) =>
                      indices.map((idx, rowInGroup) => {
                        const s = stressScenarioResults[idx];
                        if (!s) return null;
                        const stressLevel = s.label.includes('Return') ? (s.label.includes('1%') ? '-1%' : '-2%') : s.label.includes('Withdrawal') ? (s.label.includes('10%') ? '+10%' : '+20%') : s.label.includes('3%') ? '3%' : '5%';
                        const isFirstRowOfGroup = rowInGroup === 0;
                        const isStartOfNewGroup = idx === 2 || idx === 4;
                        return (
                          <tr
                            key={idx}
                            className="border-b border-[#FFCC6A]/10"
                            style={isStartOfNewGroup ? { borderTop: '0.5px solid #FFCC6A' } : undefined}
                          >
                            {isFirstRowOfGroup && (
                              <td rowSpan={indices.length} className="py-3 px-3 align-middle text-center border-r border-[#FFCC6A]/20 bg-[#0D3A1D]/30 text-gray-200 font-medium">
                                {driver}
                              </td>
                            )}
                            <td className="py-3 px-3 text-center text-gray-200">{stressLevel}</td>
                            <td className="py-3 px-3 text-center font-bold" style={{ color: s.depletionPressurePct > 5 ? '#CD5B52' : s.depletionPressurePct < -5 ? '#55B685' : '#F3AF56' }}>{formatSignedPct(s.depletionPressurePct)}</td>
                            <td className="py-3 px-3 text-center font-bold text-gray-200">{formatCurrency(s.simulatedEndingCapital)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[10px] text-[#FFCC6A]/60">Run simulation to load stress scenarios.</p>
            )}
              </>
            )}
          </div>

          {/* EXPAND ALL / COLLAPSE ALL — directly under Further Structural Stress Test */}
          {mcResult && (
            <div className="flex justify-end no-print">
              <button
                type="button"
                onClick={() => {
                  const allExpanded = !Object.values(collapsedSections).some(Boolean);
                  setCollapsedSections({
                    structuralStabilityMap: allExpanded,
                    capitalOutcomeDist: allExpanded,
                    capitalStressRadar: allExpanded,
                    furtherStressTest: allExpanded,
                    capitalAdjustmentSimulator: allExpanded,
                  });
                }}
                className="rounded border border-[#FFCC6A]/60 text-[#FFCC6A]/90 py-1.5 px-3 text-[10px] md:text-xs font-bold uppercase tracking-wide hover:bg-[#FFCC6A]/10 transition-colors"
              >
                {Object.values(collapsedSections).some(Boolean) ? 'EXPAND ALL' : 'COLLAPSE ALL'}
              </button>
            </div>
          )}

          {/* Key Takeaways */}
          {advisoryInputs && (
            <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl">
              <h2 className="text-sm md:text-lg font-bold mb-4 text-[#FFCC6A] uppercase tracking-wide serif-font">Key Takeaways</h2>
              <ul className="space-y-2 text-xs md:text-sm text-gray-300 list-disc list-inside">
                {getKeyTakeaways(advisoryInputs).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 14. Recommended Adjustments — always visible */}
          {advisoryInputs && (
            <div className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl">
              <h2 className="text-sm md:text-lg font-bold mb-4 text-[#FFCC6A] uppercase tracking-wide serif-font">Recommended Adjustments</h2>
              <ul className="space-y-2 text-xs md:text-sm text-gray-300 list-disc list-inside">
                {getRecommendedAdjustments(advisoryInputs).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 15. The Lion's Verdict — final card */}
          <div
            className="bg-[#0D3A1D] p-6 md:p-8 rounded-sm border border-[#FFCC6A]/20 shadow-2xl"
            style={{ opacity: canSeeVerdict ? 1 : 0.55 }}
          >
            <h2 className="text-sm md:text-lg font-bold mb-4 font-serif text-[#FFCC6A] uppercase tracking-wide">
              THE LION&apos;S VERDICT
            </h2>
            {showLionActive ? (
              <LionVerdictActive
                user={lionAccessUser}
                userId={lionSeedUserId}
                reportType="capital_stress"
                tier={lionTierLabel}
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
            ) : (
              <LionVerdictLocked tierLabel={lionTierLabel} score={lionScore} />
            )}
          </div>
          </div>
          )}

          {/* FOOTER */}
          <div className="flex flex-col items-center py-14 sm:py-16 lg:py-24 text-center">
            <div className="mb-8 space-y-2">
              <p className="text-[10px] md:text-[11px] font-bold text-[#FFCC6A] uppercase tracking-widest">Please save or print a copy for your records.</p>
            </div>
            <button
              onClick={handlePrint}
              className="cb-gold-outline-cta group !rounded-sm px-10 py-2.5 font-black uppercase tracking-tight text-[10px] md:text-sm no-print"
            >
              <PrinterIcon />
              Save or Print Report
            </button>
          </div>

        </section>
      </main>
      <div className="fixed bottom-8 left-8 md:bottom-10 md:left-10 z-[9998] no-print drop-shadow-[0_4px_14px_rgba(0,0,0,0.4)]">
        <button
          onClick={runCalculation}
          disabled={isRunning}
          className="cb-gold-primary-cta !rounded-sm py-3 px-3 font-black uppercase tracking-tight text-[10px] md:text-xs flex flex-col items-center gap-0.5 md:px-4 disabled:opacity-60"
        >
          {isRunning ? 'Running…' : 'Run Simulation'}
        </button>
      </div>
      </div>
      </div>

      {mcResult != null && (() => {
        const returnRange = upperPct - lowerPct;
        const returnSens = Math.min(100, Math.max(0, (returnRange - 5) * 10));
        const withdrawalSens = investment > 0 ? Math.min(100, (withdrawal / investment) * 500) : 0;
        const inflationSens = Math.min(100, effectiveInflation * 25);
        const volSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2);
        const drawdownSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2.5);
        const fragilityIndex = Math.round((returnSens + withdrawalSens + inflationSens + volSens + drawdownSens) / 5);
        const fiTier = getFragilityIndexTier(fragilityIndex);
        const depletionPill = depletionBarOutput?.pillLabel ?? 'Stable';
        const healthStatus = getCapitalHealthStatus(mcResult.tier, fiTier, depletionPill);
        const advisoryInputs = {
          capitalResilienceScore: mcResult.capitalResilienceScore,
          tier: mcResult.tier,
          fragilityIndicator: depletionPill,
          initialCapital: investment,
          withdrawalAmount: withdrawal,
          timeHorizonYears: years,
          simulatedAverageOutcome: mcResult.simulatedAverage,
          maximumDrawdownPct: mcResult.maxDrawdownPctAvg,
          worstCaseOutcome: mcResult.percentile5,
        };
        const lionEnginePrint = canSeeVerdict ? runLionVerdictEngineStress(advisoryInputs, formatCurrency) : null;
        const verdict = lionEnginePrint ? toVerdictNarrative(lionEnginePrint) : null;
        return (
          <PrintReport
            mcResult={mcResult}
            depletionBarOutput={depletionBarOutput}
            investment={investment}
            withdrawal={withdrawal}
            years={years}
            confidence={confidence}
            lowerPct={lowerPct}
            upperPct={upperPct}
            effectiveInflation={effectiveInflation}
            stressScenarioResults={stressScenarioResults}
            adjustmentResults={adjustmentResults}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            formatPercentSmall={formatPercentSmall}
            formatSignedPct={formatSignedPct}
            healthStatus={healthStatus}
            fragilityIndex={fragilityIndex}
            fiTier={fiTier}
            verdict={verdict}
            lionVerdictOutput={lionEnginePrint}
            stressAdvisoryInputs={canSeeVerdict && advisoryInputs ? advisoryInputs : null}
            keyTakeaways={canSeeVerdict ? getKeyTakeaways(advisoryInputs) : []}
            recommendedAdjustments={canSeeVerdict ? getRecommendedAdjustments(advisoryInputs) : []}
            microSignals={canSeeVerdict ? getMicroDiagnosticSignals(advisoryInputs) : []}
            medianPathYearly={mcResult.medianPathYearly}
            reportClientDisplayName={reportClientDisplayName}
          />
        );
      })()}
              </>
            );
          }}
        </DepletionBarConsumers>
      </DepletionBarProvider>
    </>
  );
});

export default App;
