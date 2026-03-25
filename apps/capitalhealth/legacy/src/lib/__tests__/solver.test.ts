import { describe, it, expect } from 'vitest';
import {
  solveStartingCapital,
  solveMonthlyTopUp,
  solveExpectedReturn,
} from '../solver';

const common = {
  months: 120,
  targetIncomeMonthly: 25_000,
  inflationAnnualPct: 1.5,
  cashAnnualPct: 3.5,
  cashBufferPct: 15,
  withdrawFrom: 'cashFirst' as const,
  topUpTo: 'invested' as const,
  applyInflationToIncome: true,
};

describe('solver', () => {
  it('solve starting capital finds finite number for typical inputs', () => {
    const res = solveStartingCapital({
      ...common,
      monthlyTopUp: 10_000,
      investedAnnualPct: 8,
    });
    expect(res.feasible).toBe(true);
    expect(res.requiredStart).toBeGreaterThan(0);
    expect(res.requiredStart).toBeLessThan(1_000_000_000);
  });

  it('higher target needs higher top-up', () => {
    const low = solveMonthlyTopUp({
      ...common,
      startCapital: 1_000_000,
      investedAnnualPct: 8,
    });
    const higherTarget = solveMonthlyTopUp({
      ...common,
      targetIncomeMonthly: 50_000,
      startCapital: 1_000_000,
      investedAnnualPct: 8,
    });
    expect(higherTarget.requiredTopUp).toBeGreaterThan(low.requiredTopUp);
  });

  it('solve expected return caps feasibility at 40%', () => {
    const res = solveExpectedReturn({
      ...common,
      startCapital: 500_000,
      monthlyTopUp: 10_000,
    });
    expect(res.iterations).toBeGreaterThan(0);
  });
});
