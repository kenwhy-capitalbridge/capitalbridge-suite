/**
 * Coverage-based solvers: find inputs so that Coverage ≥ 100%
 * (Sustainable income ≥ Target income), using the same blended-return definition as the app.
 */

import { blendedAnnualReturn } from './returns';

export type CoverageSolveCommon = {
  targetIncomeMonthly: number;
  startCapital: number;
  investedAnnualPct: number;
  cashAnnualPct: number;
  cashBufferPct: number;
};

/**
 * Sustainable income (same definition as app): SI_monthly = startCapital * (blended/100) / 12.
 * For Coverage ≥ 100%: SI_monthly >= targetIncomeMonthly
 * => requiredStart = targetIncomeMonthly * 12 / (blended/100) = (targetIncomeMonthly * 12 * 100) / blended.
 * Uses blended p.a. % (cash buffer + invested), not invested-only.
 */
export function solveStartCapitalForCoverage(
  c: Omit<CoverageSolveCommon, 'startCapital'>
): { feasible: boolean; requiredStart: number } {
  const blended = blendedAnnualReturn(
    c.investedAnnualPct,
    c.cashAnnualPct,
    c.cashBufferPct
  );
  if (!Number.isFinite(blended) || blended <= 0) {
    return { feasible: false, requiredStart: NaN };
  }
  const requiredStart = (c.targetIncomeMonthly * 12 * 100) / blended;
  return { feasible: true, requiredStart };
}

/**
 * Solve expected invested return (p.a.) so that Coverage ≥ 100% with startCapital fixed.
 * blended = cb * cash + (1 - cb) * invested => invested = (blendedNeeded - cb * cash) / (1 - cb)
 */
export function solveInvestedReturnForCoverage(
  c: Omit<CoverageSolveCommon, 'investedAnnualPct'>
): { feasible: boolean; requiredInvestedAnnualPct: number } {
  const { targetIncomeMonthly, startCapital, cashAnnualPct, cashBufferPct } = c;
  if (startCapital <= 0 || targetIncomeMonthly <= 0) {
    return { feasible: false, requiredInvestedAnnualPct: NaN };
  }
  const cb = Math.max(0, Math.min(100, cashBufferPct)) / 100;
  const blendedNeeded = (targetIncomeMonthly * 12 * 100) / startCapital;
  const denom = 1 - cb;

  let requiredInvestedAnnualPct: number;
  if (denom <= 0) {
    requiredInvestedAnnualPct = Infinity;
  } else {
    requiredInvestedAnnualPct = (blendedNeeded - cb * cashAnnualPct) / denom;
  }

  const feasible =
    Number.isFinite(requiredInvestedAnnualPct) && requiredInvestedAnnualPct >= 0;
  return { feasible, requiredInvestedAnnualPct };
}
