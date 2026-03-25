/**
 * Canonical sustainability evaluation for withdrawal plans.
 * Single pure, deterministic simulation: blended monthly return, cap_t evolution, stopping at depletion.
 * Use for banner status, depletion month, coverage months, and sustainable monthly (heuristic).
 */

const EPS = 1e-9;
const MAX_COVERAGE_MONTHS = 1200;

export type PlanStatus = 'Capital Preserved' | 'Capital Depleted';

export type EvaluatePlanInput = {
  startingCapital: number;
  desiredMonthlyWithdrawal: number;
  aprExpected: number;
  monthlyTopUp: number;
  timeHorizonMonths: number;
  cashBufferPct: number;
  cashApr: number;
  indexWithdrawalsToInflation: boolean;
  inflationApr: number;
  feesApr?: number;
  taxDragApr?: number;
};

export type EvaluatePlanOutput = {
  status: PlanStatus;
  depletionMonth: number | null;
  coverageMonths: number;
  sustainableMonthly: number;
  isSustainableNow: boolean;
  /** Monthly blended portfolio return (for analytics). */
  r_portfolio: number;
  notes: string[];
};

function monthlyRate(annualRate: number): number {
  return Math.pow(1 + Math.max(0, annualRate), 1 / 12) - 1;
}

/**
 * Pure function: evaluates withdrawal plan using blended portfolio return and
 * month-by-month capital evolution. Never classifies as Preserved from heuristic alone.
 */
export function evaluatePlan(inputs: EvaluatePlanInput): EvaluatePlanOutput {
  const with_ = {
    ...inputs,
    feesApr: inputs.feesApr ?? 0,
    taxDragApr: inputs.taxDragApr ?? 0,
  };

  const r_asset = monthlyRate(
    with_.aprExpected - with_.feesApr - with_.taxDragApr
  );
  const r_cash = monthlyRate(with_.cashApr);
  const r_infl = monthlyRate(with_.inflationApr);

  const assetWeight = 1 - with_.cashBufferPct / 100;
  const r_portfolio = assetWeight * r_asset + (1 - assetWeight) * r_cash;

  const sustainableMonthly =
    with_.startingCapital * r_portfolio + with_.monthlyTopUp;
  const isSustainableNow =
    with_.desiredMonthlyWithdrawal <= sustainableMonthly + EPS;

  // O(1) guardrail: no capital, withdrawal > 0, no top-up
  if (
    with_.startingCapital <= 0 + EPS &&
    with_.desiredMonthlyWithdrawal > EPS &&
    with_.monthlyTopUp <= EPS
  ) {
    return {
      status: 'Capital Depleted',
      depletionMonth: 1,
      coverageMonths: 1,
      sustainableMonthly,
      isSustainableNow: false,
      r_portfolio,
      notes: ['No capital and no top-ups; withdrawal cannot be funded.'],
    };
  }

  // Zero withdrawal → Preserved by definition
  if (with_.desiredMonthlyWithdrawal <= EPS) {
    let cap = with_.startingCapital;
    let coverage = with_.timeHorizonMonths;
    for (let t = 0; t < with_.timeHorizonMonths; t++) {
      cap = cap * (1 + r_portfolio) + with_.monthlyTopUp;
    }
    while (cap > EPS && coverage < MAX_COVERAGE_MONTHS) {
      coverage += 1;
      cap = cap * (1 + r_portfolio) + with_.monthlyTopUp;
    }
    return {
      status: 'Capital Preserved',
      depletionMonth: null,
      coverageMonths: coverage,
      sustainableMonthly,
      isSustainableNow: true,
      r_portfolio,
      notes: [
        'Plan remains funded across the selected horizon.',
        `Sustainable monthly (today): ${sustainableMonthly}`,
      ],
    };
  }

  // Month-by-month simulation
  let cap = with_.startingCapital;
  let t = 0;

  while (t < with_.timeHorizonMonths) {
    t += 1;
    const withdrawal =
      with_.indexWithdrawalsToInflation
        ? with_.desiredMonthlyWithdrawal * Math.pow(1 + r_infl, t - 1)
        : with_.desiredMonthlyWithdrawal;

    cap = cap * (1 + r_portfolio) + with_.monthlyTopUp - withdrawal;

    if (cap <= 0) {
      return {
        status: 'Capital Depleted',
        depletionMonth: t,
        coverageMonths: t,
        sustainableMonthly,
        isSustainableNow,
        r_portfolio,
        notes: [
          `Withdrawals exceed growth after month ${t}.`,
          isSustainableNow
            ? 'Initially near-sustainable, but inflation/compounding breaks it.'
            : 'Current withdrawal exceeds sustainable monthly income.',
        ],
      };
    }
  }

  // Preserved for requested horizon; extend to estimate coverage (max t such that cap_t > 0)
  let coverage = with_.timeHorizonMonths;
  let cap_ext = cap;

  while (cap_ext > EPS && coverage < MAX_COVERAGE_MONTHS) {
    coverage += 1;
    const withdrawal_ext = with_.indexWithdrawalsToInflation
      ? with_.desiredMonthlyWithdrawal * Math.pow(1 + r_infl, coverage - 1)
      : with_.desiredMonthlyWithdrawal;
    cap_ext =
      cap_ext * (1 + r_portfolio) + with_.monthlyTopUp - withdrawal_ext;
  }
  // If we broke because cap_ext <= 0, last month with positive capital is coverage - 1
  const coverageMonths =
    cap_ext <= EPS && coverage > with_.timeHorizonMonths
      ? coverage - 1
      : coverage;

  return {
    status: 'Capital Preserved',
    depletionMonth: null,
    coverageMonths,
    sustainableMonthly,
    isSustainableNow,
    r_portfolio,
    notes: [
      'Plan remains funded across the selected horizon.',
      `Sustainable monthly (today): ${sustainableMonthly}`,
    ],
  };
}

/**
 * Map CalculatorInputs (withdrawal mode) to EvaluatePlanInput.
 * All rates in decimal (e.g. 0.08 for 8%).
 */
export function inputsToEvaluatePlan(inputs: {
  startingCapital: number;
  targetMonthlyIncome: number;
  expectedAnnualReturnPct: number;
  monthlyTopUp: number;
  timeHorizonYears: number;
  cashBufferPct: number;
  cashAPY: number;
  inflationEnabled: boolean;
  inflationPct: number;
}): EvaluatePlanInput {
  const timeHorizonMonths = Math.max(
    1,
    Math.round(inputs.timeHorizonYears * 12)
  );
  // When inflation indexing is ON, use real return (expected − inflation) and constant withdrawal (real terms)
  const effectiveReturnPct = inputs.inflationEnabled
    ? Math.max(0, inputs.expectedAnnualReturnPct - inputs.inflationPct)
    : inputs.expectedAnnualReturnPct;
  return {
    startingCapital: inputs.startingCapital,
    desiredMonthlyWithdrawal: inputs.targetMonthlyIncome,
    aprExpected: effectiveReturnPct / 100,
    monthlyTopUp: inputs.monthlyTopUp,
    timeHorizonMonths,
    cashBufferPct: inputs.cashBufferPct,
    cashApr: inputs.cashAPY / 100,
    indexWithdrawalsToInflation: false,
    inflationApr: inputs.inflationPct / 100,
    feesApr: 0,
    taxDragApr: 0,
  };
}
