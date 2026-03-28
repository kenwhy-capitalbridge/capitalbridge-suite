/**
 * Pure calculator pipeline (same outputs as useCalculatorResults) for headless PDF / scripts.
 */

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
import { sustainableIncomeAtHorizonMonthly } from '../lib/returns';
import { evaluatePlan, inputsToEvaluatePlan, type PlanStatus } from '../lib/evaluatePlan';
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
  targetSeries: { month: number; total: number }[];
  makeItSustainable: MakeItSustainable | null;
  coverageSolvers: CoverageSolvers | null;
  goalStatusKey: GoalStatusKey;
  statusCopy: GoalStatusCopy;
  compoundingProgressPct: number;
  goalDelta: number;
  teaserIncomeMonthly: number;
  progressToGoalText: string;
  cashBufferHelperText: string;
  planStatus: PlanStatus | null;
  planDepletionMonth: number | null;
  planCoverageMonths: number;
  planIsSustainableNow: boolean;
  riskMetrics: RiskMetrics;
  scenarioAdjustments: ScenarioAdjustments | null;
};

export function buildCalculatorResults(inputs: CalculatorInputs): CalculatorResults {
  const result = runSimulation(inputs);

  const targetPath =
    inputs.mode !== 'withdrawal'
      ? null
      : simulateTargetWithdrawal({
          startCapital: inputs.startingCapital,
          months: Math.round(inputs.timeHorizonYears * MONTHS_PER_YEAR) || 1,
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

  const targetSeries = (targetPath?.series ?? []).map((p) => ({ month: p.month, total: p.total }));

  const planOutput =
    inputs.mode !== 'withdrawal'
      ? null
      : evaluatePlan(
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
          }),
        );

  const commonSolver =
    inputs.mode !== 'withdrawal'
      ? null
      : {
          months: Math.round(inputs.timeHorizonYears * MONTHS_PER_YEAR) || 1,
          targetIncomeMonthly: inputs.targetMonthlyIncome,
          inflationAnnualPct: inputs.inflationEnabled ? inputs.inflationPct : 0,
          cashAnnualPct: inputs.cashAPY,
          cashBufferPct: inputs.cashBufferPct,
          withdrawFrom: 'cashFirst' as const,
          topUpTo: 'invested' as const,
          applyInflationToIncome: inputs.inflationEnabled,
        };

  const makeItSustainable: MakeItSustainable | null = !commonSolver
    ? null
    : (() => {
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
      })();

  const coverageSolvers: CoverageSolvers | null =
    inputs.mode !== 'withdrawal' || inputs.targetMonthlyIncome <= 0
      ? null
      : (() => {
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
        })();

  const sustainableIncomeMonthly =
    inputs.mode === 'withdrawal' && planOutput
      ? planOutput.sustainableMonthly
      : inputs.mode === 'growth'
        ? (result.passiveIncomeMonthly ?? 0)
        : 0;
  const targetIncome = inputs.mode === 'withdrawal' ? inputs.targetMonthlyIncome : 0;
  const coveragePct =
    inputs.mode === 'withdrawal'
      ? targetIncome > 0
        ? (sustainableIncomeMonthly / targetIncome) * 100
        : 0
      : result.coveragePct;
  const shortfallMonthly =
    inputs.mode === 'withdrawal' ? Math.max(0, inputs.targetMonthlyIncome - sustainableIncomeMonthly) : 0;
  const depletedOnTarget = planOutput?.status === 'Capital Depleted';
  const targetDepletionMonths = planOutput?.depletionMonth != null ? planOutput.depletionMonth : null;

  const capitalAtHorizon = result.nominalCapitalAtHorizon;
  const targetCapital = inputs.mode === 'growth' ? inputs.targetFutureCapital : 0;
  const compoundingProgressPct =
    inputs.mode === 'growth' && targetCapital > 0 ? (capitalAtHorizon / targetCapital) * 100 : 0;
  const goalStatusKey =
    inputs.mode === 'growth' ? classifyStatus(compoundingProgressPct) : classifyStatus(coveragePct);
  const goalDelta = inputs.mode === 'growth' ? capitalAtHorizon - targetCapital : 0;
  const teaserIncomeMonthly =
    inputs.mode === 'growth'
      ? sustainableIncomeAtHorizonMonthly(
          capitalAtHorizon,
          inputs.expectedAnnualReturnPct,
          inputs.cashAPY,
          inputs.cashBufferPct,
        )
      : 0;

  const progressToGoalText =
    inputs.mode === 'growth' && targetCapital > 0
      ? `Progress to goal: ${compoundingProgressPct.toFixed(1)}%`
      : '';

  const cashBufferHelperText = `Returns reflect ${inputs.cashBufferPct}% held in cash at ${inputs.cashAPY}% and ${100 - inputs.cashBufferPct}% invested at ${inputs.expectedAnnualReturnPct}%.`;

  const horizonMonths = Math.round(inputs.timeHorizonYears * MONTHS_PER_YEAR) || 1;
  const preserved = planOutput?.status === 'Capital Preserved';
  const survivalProbabilityDisplay =
    inputs.mode === 'withdrawal'
      ? inputs.targetMonthlyIncome <= 0
        ? 100
        : Math.min(100, Math.max(0, coveragePct))
      : inputs.targetFutureCapital <= 0
        ? 100
        : Math.min(100, Math.max(0, compoundingProgressPct));
  const capitalPreservationConfidenceDisplay =
    inputs.mode === 'withdrawal'
      ? inputs.targetMonthlyIncome <= 0
        ? 100
        : Math.min(100, Math.max(0, coveragePct))
      : inputs.targetFutureCapital <= 0
        ? 100
        : Math.min(100, Math.max(0, compoundingProgressPct));
  const riskTierResult = getRiskTier(survivalProbabilityDisplay);
  const displayDownsideMonths =
    inputs.mode === 'withdrawal'
      ? result.formulaSustainable || result.runwayPhrase.startsWith('Forever Income')
        ? null
        : (result.depletionMonth ?? result.formulaDepletionMonthsWhole ?? null)
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
    stabilityScore:
      inputs.mode === 'withdrawal'
        ? preserved
          ? Math.min(100, coveragePct)
          : Math.max(0, coveragePct * 0.5)
        : Math.min(100, compoundingProgressPct),
    earlyLossRisk: 0,
  };

  const riskTierKey = Math.min(5, Math.max(1, riskTierResult.tier)) as RiskTierKey;
  const statusCopy = STATUS_COPY[inputs.mode][riskTierKey];

  const scenarioAdjustments: ScenarioAdjustments | null =
    inputs.mode !== 'withdrawal' || inputs.targetMonthlyIncome <= 0
      ? null
      : (() => {
          const target = inputs.targetMonthlyIncome;
          const sustainable = sustainableIncomeMonthly;
          const cov = coverageSolvers;
          const reduceIncomeFeasible = target > sustainable && sustainable > 0;
          const incomeReductionPct =
            target > 0 && target > sustainable
              ? Math.min(BALANCED_CAP_PCT, ((target - sustainable) / target) * 100)
              : 0;
          const startCap = inputs.startingCapital;
          const capitalIncreasePct =
            cov?.byStartCapital.feasible && startCap > 0 && cov.byStartCapital.requiredStart > startCap
              ? Math.min(
                  BALANCED_CAP_PCT,
                  ((cov.byStartCapital.requiredStart - startCap) / startCap) * 100,
                )
              : 0;
          const returnIncreasePct =
            cov?.byExpectedReturn.feasible && inputs.expectedAnnualReturnPct > 0
              ? Math.max(
                  0,
                  (cov.byExpectedReturn.requiredInvestedAnnualPct - inputs.expectedAnnualReturnPct) /
                    inputs.expectedAnnualReturnPct *
                    100,
                )
              : 0;
          const balancedFeasible =
            reduceIncomeFeasible || cov?.byStartCapital.feasible || cov?.byExpectedReturn.feasible;
          return {
            reduceIncome: { targetMonthly: sustainable, feasible: reduceIncomeFeasible },
            addCapital: cov
              ? { requiredStart: cov.byStartCapital.requiredStart, feasible: cov.byStartCapital.feasible }
              : { requiredStart: 0, feasible: false },
            increaseReturn: cov
              ? {
                  requiredAnnualPct: cov.byExpectedReturn.requiredInvestedAnnualPct,
                  feasible: cov.byExpectedReturn.feasible,
                }
              : { requiredAnnualPct: 0, feasible: false },
            balancedAdjustment: {
              incomeReductionPct,
              capitalIncreasePct,
              returnIncreasePct,
              feasible: !!balancedFeasible,
            },
          };
        })();

  const DEPLETION_EPS = 1;
  const EFFECTIVE_DEPLETION_PCT = 0.005;
  const chartAlignedDepletionMonths = (() => {
    if (inputs.mode !== 'withdrawal') return null;
    const snap = result.monthlySnapshots;
    if (snap.length === 0) return result.depletionMonth ?? null;
    const threshold = Math.max(DEPLETION_EPS, (inputs.startingCapital || 0) * EFFECTIVE_DEPLETION_PCT);
    const isDepleted = (s: { totalCapital: number }) => s.totalCapital <= 0 || s.totalCapital < threshold;
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

  const displayTargetDepletionMonths = inputs.mode === 'withdrawal' ? chartAlignedDepletionMonths : null;

  return {
    ...result,
    runwayPhrase: displayRunwayPhrase,
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
