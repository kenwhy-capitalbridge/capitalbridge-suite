import { describe, expect, it } from 'vitest';
import {
  lionPublicStatusFromScore0to100,
  lionStrongEligible,
  lionStrongEligibilityFromStressInputs,
  type LionStrongEligibility,
} from '../src/lionsVerdict/lionScoreMapping';

const allStrong: LionStrongEligibility = {
  incomeGapOk: true,
  capitalSufficientVsTarget: true,
  sustainabilityLongTermOrPerpetual: true,
  noMajorDownsideRisk: true,
};

describe('lionPublicStatusFromScore0to100 bands (no score math change)', () => {
  it('maps thresholds: 0–38, 39–56, 57–76, 77–89, 90–100', () => {
    expect(lionPublicStatusFromScore0to100(0, allStrong)).toBe('NOT_SUSTAINABLE');
    expect(lionPublicStatusFromScore0to100(38, allStrong)).toBe('NOT_SUSTAINABLE');
    expect(lionPublicStatusFromScore0to100(39, allStrong)).toBe('AT_RISK');
    expect(lionPublicStatusFromScore0to100(56, allStrong)).toBe('AT_RISK');
    expect(lionPublicStatusFromScore0to100(57, allStrong)).toBe('FRAGILE');
    expect(lionPublicStatusFromScore0to100(76, allStrong)).toBe('FRAGILE');
    expect(lionPublicStatusFromScore0to100(77, allStrong)).toBe('STABLE');
    expect(lionPublicStatusFromScore0to100(89, allStrong)).toBe('STABLE');
    expect(lionPublicStatusFromScore0to100(90, allStrong)).toBe('STRONG');
    expect(lionPublicStatusFromScore0to100(100, allStrong)).toBe('STRONG');
  });

  it('downgrades STRONG to STABLE without eligibility or failed gate', () => {
    expect(lionPublicStatusFromScore0to100(92)).toBe('STABLE');
    expect(lionPublicStatusFromScore0to100(92, { ...allStrong, incomeGapOk: false })).toBe('STABLE');
  });

  it('small capital vs big goal: high score cannot be STRONG', () => {
    const inputs = {
      capitalResilienceScore: 80,
      tier: 'Very Strong' as const,
      fragilityIndicator: 'Stable' as const,
      initialCapital: 200_000,
      withdrawalAmount: 10_000,
      timeHorizonYears: 25,
      simulatedAverageOutcome: 250_000,
      maximumDrawdownPct: 28,
      worstCaseOutcome: 120_000,
    };
    const goal = {
      hasIncomeGoal: true,
      monthlyGap: 0,
      targetCapitalRequired: 2_000_000,
    };
    const e = lionStrongEligibilityFromStressInputs(inputs, goal);
    expect(e.capitalSufficientVsTarget).toBe(false);
    expect(lionPublicStatusFromScore0to100(90, e)).toBe('STABLE');
  });

  it('strong capital + no gap + long horizon + clean risk: STRONG allowed at 90+', () => {
    const inputs = {
      capitalResilienceScore: 80,
      tier: 'Very Strong' as const,
      fragilityIndicator: 'Stable' as const,
      initialCapital: 2_400_000,
      withdrawalAmount: 96_000,
      timeHorizonYears: 25,
      simulatedAverageOutcome: 2_500_000,
      maximumDrawdownPct: 25,
      worstCaseOutcome: 1_200_000,
    };
    const goal = {
      hasIncomeGoal: true,
      monthlyGap: -500,
      targetCapitalRequired: 2_000_000,
    };
    const e = lionStrongEligibilityFromStressInputs(inputs, goal);
    expect(lionStrongEligible(e)).toBe(true);
    expect(lionPublicStatusFromScore0to100(90, e)).toBe('STRONG');
  });
});
