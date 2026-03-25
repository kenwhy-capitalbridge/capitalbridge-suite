/**
 * Horizon-safe solvers ("Make it last"): find minimum value of one variable at a time
 * so that the target withdrawal path does not deplete capital within horizon.
 */

import {
  simulateTargetWithdrawal,
  type TargetSimInput,
  type TargetSimResult,
} from './simulateTargetWithdrawal';

export type SolveCommon = Omit<
  TargetSimInput,
  'startCapital' | 'monthlyTopUp' | 'investedAnnualPct' | 'captureSeries'
>;

type SolveResultBase = {
  feasible: boolean;
  iterations: number;
};

export type SolveStartingCapitalResult = SolveResultBase & {
  requiredStart: number;
};

export type SolveMonthlyTopUpResult = SolveResultBase & {
  requiredTopUp: number;
};

export type SolveExpectedReturnResult = SolveResultBase & {
  requiredInvestedAnnualPct: number;
};

const MAX_ITERS = 80;

function notDepleted(res: TargetSimResult): boolean {
  return res.depleted === false;
}

function binarySearch(
  check: (x: number) => boolean,
  lo: number,
  hi: number,
  tol = 1e-6,
  maxIter = MAX_ITERS
): { feasible: boolean; value: number; iterations: number } {
  let feasibleHi = hi;
  let feasible = false;

  if (!check(hi)) {
    return { feasible: false, value: NaN, iterations: 1 };
  }

  let iterations = 0;
  while (hi - lo > tol && iterations < maxIter) {
    iterations++;
    const mid = lo + (hi - lo) / 2;
    if (check(mid)) {
      feasible = true;
      hi = mid;
      feasibleHi = mid;
    } else {
      lo = mid;
    }
  }

  return { feasible, value: feasibleHi, iterations };
}

export function solveStartingCapital(
  common: SolveCommon & {
    monthlyTopUp: number;
    investedAnnualPct: number;
    startGuess?: number;
  }
): SolveStartingCapitalResult {
  const lo = 0;
  const hi = 1_000_000_000;

  const check = (startCapital: number) => {
    const res = simulateTargetWithdrawal({
      ...common,
      startCapital,
      monthlyTopUp: common.monthlyTopUp,
      investedAnnualPct: common.investedAnnualPct,
      captureSeries: false,
    });
    return notDepleted(res);
  };

  const { feasible, value, iterations } = binarySearch(check, lo, hi);
  return { feasible, requiredStart: value, iterations };
}

export function solveMonthlyTopUp(
  common: SolveCommon & {
    startCapital: number;
    investedAnnualPct: number;
    topUpGuess?: number;
  }
): SolveMonthlyTopUpResult {
  const lo = 0;
  const hi = 5_000_000;

  const check = (monthlyTopUp: number) => {
    const res = simulateTargetWithdrawal({
      ...common,
      startCapital: common.startCapital,
      monthlyTopUp,
      investedAnnualPct: common.investedAnnualPct,
      captureSeries: false,
    });
    return notDepleted(res);
  };

  const { feasible, value, iterations } = binarySearch(check, lo, hi);
  return { feasible, requiredTopUp: value, iterations };
}

export function solveExpectedReturn(
  common: SolveCommon & {
    startCapital: number;
    monthlyTopUp: number;
    returnGuessPct?: number;
  }
): SolveExpectedReturnResult {
  const lo = 0.1;
  const hi = 40;

  const check = (investedAnnualPct: number) => {
    const res = simulateTargetWithdrawal({
      ...common,
      startCapital: common.startCapital,
      monthlyTopUp: common.monthlyTopUp,
      investedAnnualPct,
      captureSeries: false,
    });
    return notDepleted(res);
  };

  const { feasible, value, iterations } = binarySearch(check, lo, hi);
  return { feasible, requiredInvestedAnnualPct: value, iterations };
}
