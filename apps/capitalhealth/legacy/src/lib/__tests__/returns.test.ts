import { describe, it, expect } from 'vitest';
import {
  blendedAnnualReturn,
  sustainableIncomeAtHorizonMonthly,
} from '../returns';

describe('blendedAnnualReturn', () => {
  it('computes blended rate: 15% cash @3.5%, 85% invested @8% => ~7.325%', () => {
    expect(blendedAnnualReturn(8, 3.5, 15)).toBeCloseTo(7.325, 3);
  });
});

describe('sustainableIncomeAtHorizonMonthly', () => {
  it('returns nominal monthly income in expected range for 1.79M capital', () => {
    const monthly = sustainableIncomeAtHorizonMonthly(
      1_788_607,
      8,
      3.5,
      15
    );
    expect(monthly).toBeGreaterThan(9_000);
    expect(monthly).toBeLessThan(13_000);
  });

  it('returns 0 for zero or negative capital', () => {
    expect(sustainableIncomeAtHorizonMonthly(0, 8, 3.5, 15)).toBe(0);
    expect(sustainableIncomeAtHorizonMonthly(-1, 8, 3.5, 15)).toBe(0);
  });
});
