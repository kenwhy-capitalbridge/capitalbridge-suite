import { describe, it, expect } from 'vitest';
import {
  solveStartCapitalForCoverage,
  solveInvestedReturnForCoverage,
} from '../solverCoverage';
import { blendedAnnualReturn } from '../returns';

describe('solveStartCapitalForCoverage', () => {
  it('start capital for coverage matches back-solved blended (RM 58,333 target, 7.73% invested, 15% cash @ 3.5%)', () => {
    const targetIncomeMonthly = 58_333;
    const investedAnnualPct = 7.73;
    const cashAnnualPct = 3.5;
    const cashBufferPct = 15;

    const { requiredStart, feasible } = solveStartCapitalForCoverage({
      targetIncomeMonthly,
      investedAnnualPct,
      cashAnnualPct,
      cashBufferPct,
    });

    expect(feasible).toBe(true);
    expect(requiredStart).toBeGreaterThan(9_800_000);
    expect(requiredStart).toBeLessThan(9_950_000);

    const blended = blendedAnnualReturn(
      investedAnnualPct,
      cashAnnualPct,
      cashBufferPct
    );
    const si = (requiredStart * (blended / 100)) / 12;
    expect(si).toBeGreaterThanOrEqual(targetIncomeMonthly * 0.999);
  });

  it('returns feasible false when blended is non-finite', () => {
    const r = solveStartCapitalForCoverage({
      targetIncomeMonthly: 10_000,
      investedAnnualPct: NaN,
      cashAnnualPct: 3.5,
      cashBufferPct: 15,
    });
    expect(r.feasible).toBe(false);
  });
});

describe('solveInvestedReturnForCoverage', () => {
  it('invested return required for coverage at fixed start', () => {
    const targetIncomeMonthly = 10_000;
    const startCapital = 1_500_000;
    const cashAnnualPct = 3.5;
    const cashBufferPct = 15;

    const { requiredInvestedAnnualPct, feasible } =
      solveInvestedReturnForCoverage({
        targetIncomeMonthly,
        startCapital,
        cashAnnualPct,
        cashBufferPct,
      });

    expect(feasible).toBe(true);
    expect(requiredInvestedAnnualPct).toBeGreaterThan(4);
    expect(requiredInvestedAnnualPct).toBeLessThan(20);

    const blended = blendedAnnualReturn(
      requiredInvestedAnnualPct,
      cashAnnualPct,
      cashBufferPct
    );
    const si = (startCapital * (blended / 100)) / 12;
    expect(si).toBeGreaterThanOrEqual(targetIncomeMonthly * 0.999);
  });

  it('returns feasible false when start or target is zero', () => {
    expect(
      solveInvestedReturnForCoverage({
        targetIncomeMonthly: 0,
        startCapital: 1_000_000,
        cashAnnualPct: 3.5,
        cashBufferPct: 15,
      }).feasible
    ).toBe(false);
    expect(
      solveInvestedReturnForCoverage({
        targetIncomeMonthly: 10_000,
        startCapital: 0,
        cashAnnualPct: 3.5,
        cashBufferPct: 15,
      }).feasible
    ).toBe(false);
  });
});
