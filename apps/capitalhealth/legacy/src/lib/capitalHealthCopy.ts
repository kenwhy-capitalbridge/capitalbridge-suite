/**
 * Capital Health Platform — locked terminology and dynamic microcopy.
 * One sentence per metric; no hardcoded percentages; concise, no jargon.
 */

/** App name used in header, report title, and (manually) in index.html <title>. */
export const APP_NAME = 'Capital Health Model';

/** Section titles (exact naming). */
export const SECTIONS = {
  top: 'Capital Health',
  healthScore: 'Capital Strength Score',
  survivalProbability: 'Survival Probability',
  /** Header label in growth mode: desired future capital amount. */
  desiredCapital: 'Desired Capital',
  /** Header label in withdrawal mode: desired monthly income amount. */
  monthlyWithdrawal: 'Monthly Withdrawal',
  riskLevel: 'Capital Risk Level',
  capitalHorizon: 'Selected Horizon',
  downsideHorizon: 'Capital Runway',
  /** Growth mode: compounded starting capital at expected return over horizon. */
  estReturnCompounded: 'Est. Return',
  capitalPreservationConfidence: 'Capital Preservation',
  /** Header: user-selected expected annual return. */
  estReturnsPct: 'Expected Returns',
  diagnostics: {
    incomeCoverage: 'Income Coverage',
    withdrawalPressure: 'Withdrawal Pressure',
    stabilityScore: 'Stability Score',
    earlyLossRisk: 'Early Loss Risk',
  },
  solver: {
    title: 'Outcome Optimiser',
    balancedAdjustment: 'Balanced Adjustment',
    reduceIncome: 'Reduce Income',
    addCapital: 'Add Capital',
    increaseReturn: 'Increase Return',
  },
} as const;

/** Dynamic microcopy: one sentence per metric. Values can be injected where needed. */
export function getHealthScoreCopy(): string {
  return 'Overall strength of your Capital Plan based on your desired income, monthly withdrawal and investment return assumptions.';
}

export function getSurvivalProbabilityCopy(_horizonMonths: number): string {
  return 'Chance that your capital lasts for the full selected period.';
}

export function getDownsideHorizonCopy(): string {
  return 'How long your capital may last in poor market conditions.';
}

export function getCapitalPreservationConfidenceCopy(): string {
  return 'Chance that capital remains above starting amount at the end of the period.';
}

export function getIncomeCoverageCopy(): string {
  return 'How much of your target income is covered by sustainable income from your plan.';
}

export function getWithdrawalPressureCopy(): string {
  return 'Degree to which withdrawals strain your capital relative to sustainable level.';
}

export function getStabilityScoreCopy(): string {
  return 'Stability of your plan over the selected horizon.';
}

export function getEarlyLossRiskCopy(): string {
  return 'Risk of capital falling below starting level early in the period.';
}
