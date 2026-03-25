/**
 * Combined calculator results: sustainable path (existing) + target withdrawal path (explicit depletion) + solver suggestions.
 * Includes shared goal status (on_track / close / off_target) and status copy for both modes, plus growth teaser.
 */

import { useMemo, useEffect } from 'react';
import type { CalculatorInputs, SimulationResult } from '../../calculator-types';
import { runSimulation } from '../../calculator-engine';
import { simulateTargetWithdrawal } from '../lib/simulateTargetWithdrawal';
import {
  solveStartingCapital,
  solveMonthlyTopUp,
  solveExpectedReturn,
} from '../lib/solver';
import {
  solveStartCapitalForCoverage,
  solveInvestedReturnForCoverage,
} from '../lib/solverCoverage';
import { classifyStatus, type GoalStatusKey } from '../lib/goalStatus';
import { STATUS_COPY, type RiskTierKey } from '../lib/statusCopy';
import { blendedAnnualReturn, sustainableIncomeAtHorizonMonthly } from '../lib/returns';
import {
  evaluatePlan,
  inputsToEvaluatePlan,
  type PlanStatus,
} from '../lib/evaluatePlan';
import { emitPlanEvaluated } from '../lib/analytics';
import type { RiskMetrics, ScenarioAdjustments } from '../lib/capitalHealthTypes';
import { BALANCED_CAP_PCT } from '../lib/capitalHealthTypes';
import { getRiskTier } from '../lib/riskTier';

const MONTHS_PER_YEAR = 12;

export type MakeItSustainable = {
  byStartingCapital: { requiredStart: number; feasible: boolean };
  byMonthlyTopUp: { requiredTopUp: number; feasible: boolean };
  byExpectedReturn: { requiredInvestedAnnualPct: number; feasible: boolean };
};

export type CoverageSolvers = {
  byStartCapital: { requiredStart: number; feasible: boolean };
  byExpectedReturn: { requiredInvestedAnnualPct: number; feasible: boolean };
};

export type GoalStatusCopy = { short: string; headline: string; long: string };

export type CalculatorResults = SimulationResult & {
  sustainableIncomeMonthly: number;
  coveragePct: number;
  shortfallMonthly: number;
  depletedOnTarget: boolean;
  targetDepletionMonths: number | null;
  /** Target-withdrawal path series for sparkline (withdrawal mode only). */
  targetSeries: { month: number; total: number }[];
  /** Solver suggestions: horizon-safe (no depletion within horizon). Withdrawal mode only. */
  makeItSustainable: MakeItSustainable | null;
  /** Solver suggestions: Coverage ≥ 100% (sustainable income ≥ target). Withdrawal mode only. */
  coverageSolvers: CoverageSolvers | null;
  /** Shared goal status key (on_track | close | off_target) for both modes. */
  goalStatusKey: GoalStatusKey;
  /** Status pill label + one-line guidance from STATUS_COPY. */
  statusCopy: GoalStatusCopy;
  /** Growth mode: progress = capitalAtHorizon / targetFutureCapital * 100. */
  compoundingProgressPct: number;
  /** Growth mode: capitalAtHorizon - targetFutureCapital. */
  goalDelta: number;
  /** Growth mode: illustrative sustainable monthly income at horizon (nominal). */
  teaserIncomeMonthly: number;
  /** Growth mode: "Progress to goal: X%" when target > 0, else "". */
  progressToGoalText: string;
  /** Helper copy: "Returns reflect X% cash at Y% and Z% invested at W%." */
  cashBufferHelperText: string;
  /** Withdrawal only: canonical status from evaluatePlan. */
  planStatus: PlanStatus | null;
  /** Withdrawal only: month capital depletes (1-based); null if preserved. */
  planDepletionMonth: number | null;
  /** Withdrawal only: max months funded (from evaluatePlan). */
  planCoverageMonths: number;
  /** Withdrawal only: heuristic — target ≤ sustainable monthly (for hint copy). */
  planIsSustainableNow: boolean;
  /** Capital Health metrics (Health Score, Survival Probability, Risk Level, etc.). */
  riskMetrics: RiskMetrics;
  /** Capital Decision Paths: Reduce Income, Add Capital, Increase Return, Balanced Adjustment (withdrawal only). */
  scenarioAdjustments: ScenarioAdjustments | null;
};

export function useCalculatorResults(inputs: CalculatorInputs): CalculatorResults {
  const result = useMemo(
    () => runSimulation(inputs),
    [
      inputs.mode,
      inputs.targetMonthlyIncome,
      inputs.targetFutureCapital,
      inputs.timeHorizonYears,
      inputs.startingCapital,
      inputs.expectedAnnualReturnPct,
      inputs.monthlyTopUp,
      inputs.riskPreset,
      inputs.cashBufferPct,
      inputs.cashAPY,
      inputs.reinvestmentSplitPct,
      inputs.withdrawalRule,
      inputs.withdrawalPctOfCapital,
      inputs.inflationEnabled,
      inputs.inflationPct,
    ]
  );

  const targetPath = useMemo(() => {
    if (inputs.mode !== 'withdrawal') return null;
    const months = Math.round(inputs.timeHorizonYears * MONTHS_PER_YEAR) || 1;
    return simulateTargetWithdrawal({
      startCapital: inputs.startingCapital,
      months,
      monthlyTopUp: inputs.monthlyTopUp,
      targetIncomeMonthly: inputs.targetMonthlyIncome,
      inflationAnnualPct: inputs.inflationEnabled ? inputs.inflationPct : 0,
      investedAnnualPct: inputs.expectedAnnualReturnPct,
      cashAnnualPct: inputs.cashAPY,
      cashBufferPct: inputs.cashBufferPct,
      topUpTo: 'invested',
      withdrawFrom: 'cashFirst',
      applyInflationToIncome: inputs.inflationEnabled,
      captureSeries: true,
    });
  }, [
    inputs.mode,
    inputs.timeHorizonYears,
    inputs.startingCapital,
    inputs.monthlyTopUp,
    inputs.targetMonthlyIncome,
    inputs.inflationEnabled,
    inputs.inflationPct,
    inputs.expectedAnnualReturnPct,
    inputs.cashAPY,
    inputs.cashBufferPct,
  ]);

  const targetSeries = useMemo(
    () =>
      (targetPath?.series ?? []).map((p) => ({ month: p.month, total: p.total })),
    [targetPath?.series]
  );

  const planOutput = useMemo(() => {
    if (inputs.mode !== 'withdrawal') return null;
    return evaluatePlan(
      inputsToEvaluatePlan({
        startingCapital: inputs.startingCapital,
        targetMonthlyIncome: inputs.targetMonthlyIncome,
        expectedAnnualReturnPct: inputs.expectedAnnualReturnPct,
        monthlyTopUp: inputs.monthlyTopUp,
        timeHorizonYears: inputs.timeHorizonYears,
        cashBufferPct: inputs.cashBufferPct,
        cashAPY: inputs.cashAPY,
        inflationEnabled: inputs.inflationEnabled,
        inflationPct: inputs.inflationPct,
      })
    );
  }, [
    inputs.mode,
    inputs.startingCapital,
    inputs.targetMonthlyIncome,
    inputs.expectedAnnualReturnPct,
    inputs.monthlyTopUp,
    inputs.timeHorizonYears,
    inputs.cashBufferPct,
    inputs.cashAPY,
    inputs.inflationEnabled,
    inputs.inflationPct,
  ]);

  useEffect(() => {
    if (inputs.mode !== 'withdrawal' || !planOutput) return;
    emitPlanEvaluated({
      status: planOutput.status,
      depletionMonth: planOutput.depletionMonth,
      coverageMonths: planOutput.coverageMonths,
      desiredMonthlyWithdrawal: inputs.targetMonthlyIncome,
      sustainableMonthly: planOutput.sustainableMonthly,
      r_portfolio: planOutput.r_portfolio,
      indexWithdrawalsToInflation: inputs.inflationEnabled,
    });
  }, [
    inputs.mode,
    inputs.targetMonthlyIncome,
    inputs.inflationEnabled,
    planOutput,
  ]);

  const commonSolver = useMemo(() => {
    if (inputs.mode !== 'withdrawal') return null;
    const months = Math.round(inputs.timeHorizonYears * MONTHS_PER_YEAR) || 1;
    return {
      months,
      targetIncomeMonthly: inputs.targetMonthlyIncome,
      inflationAnnualPct: inputs.inflationEnabled ? inputs.inflationPct : 0,
      cashAnnualPct: inputs.cashAPY,
      cashBufferPct: inputs.cashBufferPct,
      withdrawFrom: 'cashFirst' as const,
      topUpTo: 'invested' as const,
      applyInflationToIncome: inputs.inflationEnabled,
    };
  }, [
    inputs.mode,
    inputs.timeHorizonYears,
    inputs.targetMonthlyIncome,
    inputs.inflationEnabled,
    inputs.inflationPct,
    inputs.cashAPY,
    inputs.cashBufferPct,
  ]);

  const makeItSustainable = useMemo((): MakeItSustainable | null => {
    if (!commonSolver) return null;
    const byStartingCapital = solveStartingCapital({
      ...commonSolver,
      monthlyTopUp: inputs.monthlyTopUp,
      investedAnnualPct: inputs.expectedAnnualReturnPct,
    });
    const byMonthlyTopUp = solveMonthlyTopUp({
      ...commonSolver,
      startCapital: inputs.startingCapital,
      investedAnnualPct: inputs.expectedAnnualReturnPct,
    });
    const byExpectedReturn = solveExpectedReturn({
      ...commonSolver,
      startCapital: inputs.startingCapital,
      monthlyTopUp: inputs.monthlyTopUp,
    });
    return {
      byStartingCapital: {
        requiredStart: byStartingCapital.requiredStart,
        feasible: byStartingCapital.feasible,
      },
      byMonthlyTopUp: {
        requiredTopUp: byMonthlyTopUp.requiredTopUp,
        feasible: byMonthlyTopUp.feasible,
      },
      byExpectedReturn: {
        requiredInvestedAnnualPct: byExpectedReturn.requiredInvestedAnnualPct,
        feasible: byExpectedReturn.feasible,
      },
    };
  }, [
    commonSolver,
    inputs.monthlyTopUp,
    inputs.expectedAnnualReturnPct,
    inputs.startingCapital,
  ]);

  const coverageSolvers = useMemo((): CoverageSolvers | null => {
    if (inputs.mode !== 'withdrawal' || inputs.targetMonthlyIncome <= 0)
      return null;
    const byStart = solveStartCapitalForCoverage({
      targetIncomeMonthly: inputs.targetMonthlyIncome,
      investedAnnualPct: inputs.expectedAnnualReturnPct,
      cashAnnualPct: inputs.cashAPY,
      cashBufferPct: inputs.cashBufferPct,
    });
    const byRet = solveInvestedReturnForCoverage({
      targetIncomeMonthly: inputs.targetMonthlyIncome,
      startCapital: inputs.startingCapital,
      cashAnnualPct: inputs.cashAPY,
      cashBufferPct: inputs.cashBufferPct,
    });
    return {
      byStartCapital: {
        requiredStart: byStart.requiredStart,
        feasible: byStart.feasible,
      },
      byExpectedReturn: {
        requiredInvestedAnnualPct: byRet.requiredInvestedAnnualPct,
        feasible: byRet.feasible,
      },
    };
  }, [
    inputs.mode,
    inputs.targetMonthlyIncome,
    inputs.expectedAnnualReturnPct,
    inputs.startingCapital,
    inputs.cashAPY,
    inputs.cashBufferPct,
  ]);

  // Withdrawal: use evaluatePlan's sustainableMonthly (canonical) so banner and coverage match
  const sustainableIncomeMonthly =
    inputs.mode === 'withdrawal' && planOutput
      ? planOutput.sustainableMonthly
      : (inputs.mode === 'growth' ? (result.passiveIncomeMonthly ?? 0) : 0);
  const targetIncome = inputs.mode === 'withdrawal' ? inputs.targetMonthlyIncome : 0;
  const coveragePct =
    inputs.mode === 'withdrawal'
      ? targetIncome > 0
        ? (sustainableIncomeMonthly / targetIncome) * 100
        : 0
      : result.coveragePct;
  const shortfallMonthly =
    inputs.mode === 'withdrawal'
      ? Math.max(0, inputs.targetMonthlyIncome - sustainableIncomeMonthly)
      : 0;
  const depletedOnTarget = planOutput?.status === 'Capital Depleted';
  const targetDepletionMonths =
    planOutput?.depletionMonth != null ? planOutput.depletionMonth : null;

  const capitalAtHorizon = result.nominalCapitalAtHorizon;
  const targetCapital =
    inputs.mode === 'growth' ? inputs.targetFutureCapital : 0;
  const compoundingProgressPct =
    inputs.mode === 'growth' && targetCapital > 0
      ? (capitalAtHorizon / targetCapital) * 100
      : 0;
  const goalStatusKey =
    inputs.mode === 'growth'
      ? classifyStatus(compoundingProgressPct)
      : classifyStatus(coveragePct);
  const goalDelta =
    inputs.mode === 'growth' ? capitalAtHorizon - targetCapital : 0;
  const teaserIncomeMonthly =
    inputs.mode === 'growth'
      ? sustainableIncomeAtHorizonMonthly(
          capitalAtHorizon,
          inputs.expectedAnnualReturnPct,
          inputs.cashAPY,
          inputs.cashBufferPct
        )
      : 0;

  const progressToGoalText =
    inputs.mode === 'growth' && targetCapital > 0
      ? `Progress to goal: ${compoundingProgressPct.toFixed(1)}%`
      : '';

  const cashBufferHelperText =
    `Returns reflect ${inputs.cashBufferPct}% held in cash at ${inputs.cashAPY}% and ${100 - inputs.cashBufferPct}% invested at ${inputs.expectedAnnualReturnPct}%.`;

  const horizonMonths = Math.round(inputs.timeHorizonYears * MONTHS_PER_YEAR) || 1;
  const preserved = planOutput?.status === 'Capital Preserved';
  // Display survival probability as continuous 0–100% (coverage / progress) so header shows e.g. 75% not only 0|100.
  // When target is 0, treat as trivially met → 100. Risk tier uses the same value.
  const survivalProbabilityDisplay =
    inputs.mode === 'withdrawal'
      ? inputs.targetMonthlyIncome <= 0
        ? 100
        : Math.min(100, Math.max(0, coveragePct))
      : inputs.targetFutureCapital <= 0
        ? 100
        : Math.min(100, Math.max(0, compoundingProgressPct));
  // Capital preservation confidence: continuous 0–100% proxy (same as survival) so UI shows gradient, not only 0|100.
  const capitalPreservationConfidenceDisplay =
    inputs.mode === 'withdrawal'
      ? inputs.targetMonthlyIncome <= 0
        ? 100
        : Math.min(100, Math.max(0, coveragePct))
      : inputs.targetFutureCapital <= 0
        ? 100
        : Math.min(100, Math.max(0, compoundingProgressPct));
  const riskTierResult = useMemo(() => getRiskTier(survivalProbabilityDisplay), [survivalProbabilityDisplay]);
  // Use same source as "How long your money lasts" (result.runwayPhrase) so header and box never disagree
  const displayDownsideMonths =
    inputs.mode === 'withdrawal'
      ? (result.formulaSustainable || result.runwayPhrase.startsWith('Forever Income')
          ? null
          : (result.depletionMonth ?? result.formulaDepletionMonthsWhole ?? null))
      : null;
  const riskMetrics: RiskMetrics = {
    survivalProbability: Math.round(survivalProbabilityDisplay),
    healthScore: inputs.mode === 'withdrawal' ? coveragePct : compoundingProgressPct,
    riskTier: riskTierResult.tier,
    riskTierLabel: riskTierResult.label,
    capitalHorizonMonths: horizonMonths,
    downsideHorizonMonths: displayDownsideMonths,
    capitalPreservationConfidence: Math.round(capitalPreservationConfidenceDisplay),
    incomeCoveragePct: coveragePct,
    withdrawalPressure: inputs.mode === 'withdrawal' ? Math.max(0, 100 - Math.min(100, coveragePct)) : 0,
    stabilityScore: inputs.mode === 'withdrawal' ? (preserved ? Math.min(100, coveragePct) : Math.max(0, coveragePct * 0.5)) : Math.min(100, compoundingProgressPct),
    earlyLossRisk: 0,
  };

  const riskTierKey = Math.min(5, Math.max(1, riskTierResult.tier)) as RiskTierKey;
  const statusCopy = STATUS_COPY[inputs.mode][riskTierKey];

  const scenarioAdjustments: ScenarioAdjustments | null = useMemo(() => {
    if (inputs.mode !== 'withdrawal' || inputs.targetMonthlyIncome <= 0) return null;
    const target = inputs.targetMonthlyIncome;
    const sustainable = sustainableIncomeMonthly;
    const cov = coverageSolvers;
    const reduceIncomeFeasible = target > sustainable && sustainable > 0;
    const incomeReductionPct = target > 0 && target > sustainable
      ? Math.min(BALANCED_CAP_PCT, ((target - sustainable) / target) * 100)
      : 0;
    const startCap = inputs.startingCapital;
    const capitalIncreasePct = cov?.byStartCapital.feasible && startCap > 0 && cov.byStartCapital.requiredStart > startCap
      ? Math.min(BALANCED_CAP_PCT, ((cov.byStartCapital.requiredStart - startCap) / startCap) * 100)
      : 0;
    const returnIncreasePct = cov?.byExpectedReturn.feasible && inputs.expectedAnnualReturnPct > 0
      ? Math.max(0, (cov.byExpectedReturn.requiredInvestedAnnualPct - inputs.expectedAnnualReturnPct) / inputs.expectedAnnualReturnPct * 100)
      : 0;
    const balancedFeasible = reduceIncomeFeasible || (cov?.byStartCapital.feasible) || (cov?.byExpectedReturn.feasible);
    return {
      reduceIncome: { targetMonthly: sustainable, feasible: reduceIncomeFeasible },
      addCapital: cov ? { requiredStart: cov.byStartCapital.requiredStart, feasible: cov.byStartCapital.feasible } : { requiredStart: 0, feasible: false },
      increaseReturn: cov ? { requiredAnnualPct: cov.byExpectedReturn.requiredInvestedAnnualPct, feasible: cov.byExpectedReturn.feasible } : { requiredAnnualPct: 0, feasible: false },
      balancedAdjustment: { incomeReductionPct, capitalIncreasePct, returnIncreasePct, feasible: balancedFeasible },
    };
  }, [
    inputs.mode,
    inputs.targetMonthlyIncome,
    inputs.startingCapital,
    inputs.expectedAnnualReturnPct,
    sustainableIncomeMonthly,
    coverageSolvers,
  ]);

  // CHART IS THE SOURCE OF TRUTH. Runway phrase and depletion come from chart data (monthlySnapshots).
  // Use the first month capital is "effectively depleted" so header/KEY OUTCOMES match the chart:
  // - With inflation on: capital can be RM 2 at 16.7yr; with monthly top-up, can be ~RM 12k at 26.7yr.
  const DEPLETION_EPS = 1; // treat capital < 1 as depleted (float / rounding)
  const EFFECTIVE_DEPLETION_PCT = 0.005; // 0.5% of starting = effectively gone (e.g. RM 22.5k on 4.5m; catches ~12k at 26.7yr)
  const chartAlignedDepletionMonths = (() => {
    if (inputs.mode !== 'withdrawal') return null;
    const snap = result.monthlySnapshots;
    if (snap.length === 0) return result.depletionMonth ?? null;
    const threshold = Math.max(DEPLETION_EPS, (inputs.startingCapital || 0) * EFFECTIVE_DEPLETION_PCT);
    const isDepleted = (s: { totalCapital: number }) =>
      s.totalCapital <= 0 || s.totalCapital < threshold;
    // First month the chart shows "effectively depleted" (matches tooltip e.g. 16.7 yr / RM 2)
    const firstDepletedIdx = snap.findIndex(isDepleted);
    if (firstDepletedIdx >= 0) return snap[firstDepletedIdx].monthIndex + 1;
    const last = snap[snap.length - 1];
    const lastIsDepleted = last && isDepleted(last);
    if (lastIsDepleted) return last.monthIndex + 1;
    if (snap.length < horizonMonths) return snap.length + 1;
    return result.depletionMonth ?? null;
  })();

  const displayRunwayPhrase =
    inputs.mode === 'withdrawal' && chartAlignedDepletionMonths != null
      ? (() => {
          const mo = chartAlignedDepletionMonths;
          const years = Math.floor(mo / 12);
          const months = mo % 12;
          return `Runs out in ${years} years ${months} months`;
        })()
      : result.runwayPhrase;

  const displayTargetDepletionMonths =
    inputs.mode === 'withdrawal' ? chartAlignedDepletionMonths : null;

  return {
    ...result,
    runwayPhrase: displayRunwayPhrase,
    // So header/KEY OUTCOMES and any code using depletionMonth use chart-aligned value
    depletionMonth:
      inputs.mode === 'withdrawal' && chartAlignedDepletionMonths != null
        ? chartAlignedDepletionMonths
        : result.depletionMonth,
    sustainableIncomeMonthly,
    coveragePct,
    shortfallMonthly,
    depletedOnTarget,
    targetDepletionMonths: displayTargetDepletionMonths ?? targetDepletionMonths,
    targetSeries,
    makeItSustainable,
    coverageSolvers,
    goalStatusKey,
    statusCopy,
    compoundingProgressPct,
    goalDelta,
    teaserIncomeMonthly,
    progressToGoalText,
    cashBufferHelperText,
    planStatus: planOutput?.status ?? null,
    planDepletionMonth: planOutput?.depletionMonth ?? null,
    planCoverageMonths: planOutput?.coverageMonths ?? 0,
    planIsSustainableNow: planOutput?.isSustainableNow ?? false,
    riskMetrics,
    scenarioAdjustments,
  };
}
