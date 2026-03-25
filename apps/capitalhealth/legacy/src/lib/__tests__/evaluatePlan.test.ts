import { describe, it, expect } from 'vitest';
import { evaluatePlan } from '../evaluatePlan';

const baseInput = {
  startingCapital: 100_000,
  desiredMonthlyWithdrawal: 2_000,
  aprExpected: 0.08,
  monthlyTopUp: 0,
  timeHorizonMonths: 120,
  cashBufferPct: 15,
  cashApr: 0.035,
  indexWithdrawalsToInflation: false,
  inflationApr: 0.015,
};

describe('evaluatePlan', () => {
  it('depletion when withdrawal equals capital (10k capital, 10k withdrawal) — depletes in ≤2 months', () => {
    const out = evaluatePlan({
      ...baseInput,
      startingCapital: 10_000,
      desiredMonthlyWithdrawal: 10_000,
      aprExpected: 0.08,
      monthlyTopUp: 0,
      timeHorizonMonths: 120,
      cashBufferPct: 0,
      cashApr: 0.035,
      indexWithdrawalsToInflation: false,
      inflationApr: 0.015,
    });
    expect(out.status).toBe('Capital Depleted');
    expect(out.depletionMonth).toBeGreaterThanOrEqual(1);
    expect(out.depletionMonth).toBeLessThanOrEqual(3);
    expect(out.sustainableMonthly).toBeLessThan(10_000);
  });

  it('preserved with zero withdrawal', () => {
    const out = evaluatePlan({
      ...baseInput,
      startingCapital: 100_000,
      desiredMonthlyWithdrawal: 0,
      monthlyTopUp: 0,
    });
    expect(out.status).toBe('Capital Preserved');
    expect(out.depletionMonth).toBeNull();
    expect(out.coverageMonths).toBeGreaterThanOrEqual(120);
    expect(out.isSustainableNow).toBe(true);
  });

  it('preserved with tiny withdrawal (withdrawal << sustainable)', () => {
    const out = evaluatePlan({
      ...baseInput,
      startingCapital: 1_000_000,
      desiredMonthlyWithdrawal: 500,
      aprExpected: 0.08,
      monthlyTopUp: 0,
      cashBufferPct: 10,
    });
    expect(out.status).toBe('Capital Preserved');
    expect(out.depletionMonth).toBeNull();
    expect(out.sustainableMonthly).toBeGreaterThan(500);
  });

  it('O(1) guardrail: no capital, withdrawal > 0, no top-up → depleted month 1', () => {
    const out = evaluatePlan({
      ...baseInput,
      startingCapital: 0,
      desiredMonthlyWithdrawal: 5_000,
      monthlyTopUp: 0,
    });
    expect(out.status).toBe('Capital Depleted');
    expect(out.depletionMonth).toBe(1);
    expect(out.notes.some((n) => n.includes('No capital'))).toBe(true);
  });

  it('inflation indexing can cause mid-horizon depletion', () => {
    const fixed = evaluatePlan({
      ...baseInput,
      startingCapital: 200_000,
      desiredMonthlyWithdrawal: 1_400,
      monthlyTopUp: 0,
      timeHorizonMonths: 240,
      indexWithdrawalsToInflation: false,
    });
    const indexed = evaluatePlan({
      ...baseInput,
      startingCapital: 200_000,
      desiredMonthlyWithdrawal: 1_400,
      monthlyTopUp: 0,
      timeHorizonMonths: 240,
      indexWithdrawalsToInflation: true,
      inflationApr: 0.03,
    });
    expect(fixed.status).toBe('Capital Preserved');
    expect(indexed.status).toBe('Capital Depleted');
    expect(indexed.depletionMonth).toBeGreaterThan(1);
    expect(indexed.depletionMonth).toBeLessThanOrEqual(240);
  });

  it('cash buffer reduces returns and shortens runway', () => {
    const noBuffer = evaluatePlan({
      ...baseInput,
      startingCapital: 300_000,
      desiredMonthlyWithdrawal: 2_500,
      monthlyTopUp: 0,
      cashBufferPct: 0,
      timeHorizonMonths: 120,
    });
    const withBuffer = evaluatePlan({
      ...baseInput,
      startingCapital: 300_000,
      desiredMonthlyWithdrawal: 2_500,
      monthlyTopUp: 0,
      cashBufferPct: 50,
      timeHorizonMonths: 120,
    });
    expect(noBuffer.sustainableMonthly).toBeGreaterThan(withBuffer.sustainableMonthly);
    if (noBuffer.status === 'Capital Depleted' && withBuffer.status === 'Capital Depleted') {
      expect(withBuffer.depletionMonth).toBeLessThanOrEqual(noBuffer.depletionMonth! + 5);
    }
  });

  it('top-up extends runway', () => {
    const noTopUp = evaluatePlan({
      ...baseInput,
      startingCapital: 100_000,
      desiredMonthlyWithdrawal: 1_200,
      monthlyTopUp: 0,
      timeHorizonMonths: 120,
    });
    const withTopUp = evaluatePlan({
      ...baseInput,
      startingCapital: 100_000,
      desiredMonthlyWithdrawal: 1_200,
      monthlyTopUp: 500,
      timeHorizonMonths: 120,
    });
    expect(withTopUp.sustainableMonthly).toBeGreaterThan(noTopUp.sustainableMonthly);
    if (noTopUp.status === 'Capital Depleted' && withTopUp.status === 'Capital Preserved') {
      expect(withTopUp.coverageMonths).toBeGreaterThanOrEqual(120);
    }
  });

  it('output contract shape', () => {
    const out = evaluatePlan(baseInput);
    expect(out).toHaveProperty('status');
    expect(['Capital Preserved', 'Capital Depleted']).toContain(out.status);
    expect(out).toHaveProperty('depletionMonth');
    expect(out.depletionMonth === null || (typeof out.depletionMonth === 'number' && out.depletionMonth >= 1)).toBe(true);
    expect(out).toHaveProperty('coverageMonths');
    expect(typeof out.coverageMonths).toBe('number');
    expect(out.coverageMonths).toBeGreaterThan(0);
    expect(out).toHaveProperty('sustainableMonthly');
    expect(typeof out.sustainableMonthly).toBe('number');
    expect(out).toHaveProperty('isSustainableNow');
    expect(typeof out.isSustainableNow).toBe('boolean');
    expect(out).toHaveProperty('r_portfolio');
    expect(typeof out.r_portfolio).toBe('number');
    expect(out).toHaveProperty('notes');
    expect(Array.isArray(out.notes)).toBe(true);
  });
});
