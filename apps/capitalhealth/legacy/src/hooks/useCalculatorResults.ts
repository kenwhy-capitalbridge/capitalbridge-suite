/**
 * Combined calculator results: sustainable path (existing) + target withdrawal path (explicit depletion) + solver suggestions.
 * Includes shared goal status (on_track / close / off_target) and status copy for both modes, plus growth teaser.
 */

import { useMemo, useEffect } from 'react';
import type { CalculatorInputs } from '../../calculator-types';
import { evaluatePlan, inputsToEvaluatePlan } from '../lib/evaluatePlan';
import { emitPlanEvaluated } from '../lib/analytics';
import {
  buildCalculatorResults,
  type CalculatorResults,
  type CoverageSolvers,
  type GoalStatusCopy,
  type MakeItSustainable,
} from './buildCalculatorResults';

export type { CalculatorResults, CoverageSolvers, GoalStatusCopy, MakeItSustainable };

export function useCalculatorResults(inputs: CalculatorInputs): CalculatorResults {
  const output = useMemo(
    () => buildCalculatorResults(inputs),
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
    ],
  );

  useEffect(() => {
    if (inputs.mode !== 'withdrawal') return;
    const planOutput = evaluatePlan(
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
    inputs.startingCapital,
    inputs.expectedAnnualReturnPct,
    inputs.monthlyTopUp,
    inputs.timeHorizonYears,
    inputs.cashBufferPct,
    inputs.cashAPY,
    inputs.inflationPct,
  ]);

  return output;
}
