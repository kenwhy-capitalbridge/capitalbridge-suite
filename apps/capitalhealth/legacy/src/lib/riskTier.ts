/**
 * 5-tier risk classification from survival probability.
 * Pure mapping; no financial math. Do not modify survival probability calculation.
 */

export interface RiskTierResult {
  tier: number;
  label: string;
}

/**
 * Maps raw survival probability (0–100) to tier and label.
 * NaN/undefined → Tier V (Critical). No overlapping conditions; no rounding.
 */
export function getRiskTier(survivalProbability: number): RiskTierResult {
  const sp = Number(survivalProbability);
  if (typeof sp !== 'number' || !Number.isFinite(sp)) {
    return { tier: 5, label: 'Critical' };
  }
  if (sp >= 90) return { tier: 1, label: 'Very Strong' };
  if (sp >= 75) return { tier: 2, label: 'Strong' };
  if (sp >= 55) return { tier: 3, label: 'Moderate' };
  if (sp >= 30) return { tier: 4, label: 'Weak' };
  return { tier: 5, label: 'Critical' };
}
