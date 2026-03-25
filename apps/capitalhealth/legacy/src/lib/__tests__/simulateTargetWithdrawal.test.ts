import { describe, it, expect } from 'vitest';
import { simulateTargetWithdrawal } from '../simulateTargetWithdrawal';

describe('simulateTargetWithdrawal', () => {
  it('depletes with high target withdrawal', () => {
    const r = simulateTargetWithdrawal({
      startCapital: 500_000,
      months: 120,
      monthlyTopUp: 10_000,
      targetIncomeMonthly: 50_000,
      inflationAnnualPct: 1.5,
      investedAnnualPct: 8,
      cashAnnualPct: 3.5,
      cashBufferPct: 15,
      topUpTo: 'invested',
      withdrawFrom: 'cashFirst',
      applyInflationToIncome: true,
    });
    expect(r.depleted).toBe(true);
    expect(r.depletionMonth).toBeGreaterThanOrEqual(6);
    expect(r.depletionMonth).toBeLessThanOrEqual(36);
  });

  it('does not deplete when withdrawing at a low sustainable-like level', () => {
    const r = simulateTargetWithdrawal({
      startCapital: 1_500_000,
      months: 120,
      monthlyTopUp: 0,
      targetIncomeMonthly: 9_000,
      inflationAnnualPct: 0,
      investedAnnualPct: 8,
      cashAnnualPct: 3.5,
      cashBufferPct: 15,
    });
    expect(r.depleted).toBe(false);
    expect(r.depletionMonth).toBeUndefined();
    expect(r.endingCapital).toBeGreaterThan(0);
  });
});
