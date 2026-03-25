import { describe, it, expect } from 'vitest';
import { getRiskTier } from '../riskTier';

describe('getRiskTier', () => {
  it('SurvivalProbability = 100 → Tier I Very Strong', () => {
    expect(getRiskTier(100)).toEqual({ tier: 1, label: 'Very Strong' });
  });

  it('SurvivalProbability = 80 → Tier II Strong', () => {
    expect(getRiskTier(80)).toEqual({ tier: 2, label: 'Strong' });
  });

  it('SurvivalProbability = 60 → Tier III Moderate', () => {
    expect(getRiskTier(60)).toEqual({ tier: 3, label: 'Moderate' });
  });

  it('SurvivalProbability = 40 → Tier IV Weak', () => {
    expect(getRiskTier(40)).toEqual({ tier: 4, label: 'Weak' });
  });

  it('SurvivalProbability = 0 → Tier V Critical', () => {
    expect(getRiskTier(0)).toEqual({ tier: 5, label: 'Critical' });
  });

  it('boundary 90 → Tier I', () => {
    expect(getRiskTier(90)).toEqual({ tier: 1, label: 'Very Strong' });
  });

  it('boundary 75 → Tier II', () => {
    expect(getRiskTier(75)).toEqual({ tier: 2, label: 'Strong' });
  });

  it('boundary 55 → Tier III', () => {
    expect(getRiskTier(55)).toEqual({ tier: 3, label: 'Moderate' });
  });

  it('boundary 30 → Tier IV', () => {
    expect(getRiskTier(30)).toEqual({ tier: 4, label: 'Weak' });
  });

  it('below 30 → Tier V', () => {
    expect(getRiskTier(29)).toEqual({ tier: 5, label: 'Critical' });
  });

  it('NaN or non-finite → Tier V Critical', () => {
    expect(getRiskTier(NaN)).toEqual({ tier: 5, label: 'Critical' });
    expect(getRiskTier(undefined as unknown as number)).toEqual({ tier: 5, label: 'Critical' });
    expect(getRiskTier(Infinity)).toEqual({ tier: 5, label: 'Critical' });
  });
});
