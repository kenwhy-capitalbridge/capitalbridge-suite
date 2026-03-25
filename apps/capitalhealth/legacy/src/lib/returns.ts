/**
 * Blended return and sustainable-income-at-horizon helpers.
 * Uses the same blended return definition as the withdrawal "sustainable income" for consistency.
 */

/**
 * Blended annual return using cash buffer and two annual rates.
 * Example: 15% cash @3.5% and 85% invested @8% => ~7.325% p.a.
 */
export function blendedAnnualReturn(
  investedAnnualPct: number,
  cashAnnualPct: number,
  cashBufferPct: number
): number {
  const cb = Math.max(0, Math.min(100, cashBufferPct)) / 100;
  return cb * cashAnnualPct + (1 - cb) * investedAnnualPct;
}

/**
 * Teaser: sustainable monthly income at horizon using the same blended return
 * as the Monthly Withdrawal "sustainable income" logic.
 * Returns a NOMINAL amount per month (no inflation adjustment).
 * Label as "illustrative" in the UI.
 */
export function sustainableIncomeAtHorizonMonthly(
  capitalAtHorizon: number,
  investedAnnualPct: number,
  cashAnnualPct: number,
  cashBufferPct: number
): number {
  if (!Number.isFinite(capitalAtHorizon) || capitalAtHorizon <= 0) return 0;
  const blended = blendedAnnualReturn(
    investedAnnualPct,
    cashAnnualPct,
    cashBufferPct
  );
  return (capitalAtHorizon * (blended / 100)) / 12;
}
