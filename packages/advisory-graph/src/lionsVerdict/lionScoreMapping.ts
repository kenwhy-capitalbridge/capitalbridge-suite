/**
 * Technical model outputs → public Lion score (0–100) and public status labels.
 *
 * Stress: normalised linear map from resilience index [min,max] → [0,100].
 * Forever: progress 0–100 (or 0) + optional bounded context nudge (±10).
 * Health: risk tier 1…5 linear on [1,5] → [100,0] (tier 1 = best).
 *
 * Public bands (classification only — score numbers unchanged):
 * NOT_SUSTAINABLE 0–34, AT_RISK 35–54, FRAGILE 55–69, STABLE 70–84, STRONG 85–100.
 * STRONG requires explicit eligibility; otherwise downgraded to STABLE.
 */

import type { ForeverLionInputs, LionHealthVariables, LionStressAdvisoryInputs, LionScoreTier } from './types';

/** Monte Carlo resilience index domain (must match model design). */
export const STRESS_RESILIENCE_TECH_MIN = -100;
export const STRESS_RESILIENCE_TECH_MAX = 100;

/**
 * Lion score = ((technical − min) / (max − min)) × 100, clamped.
 * Monotone increasing in `capitalResilienceScore`.
 */
export function technicalResilienceToLion0to100(capitalResilienceScore: number): number {
  const span = STRESS_RESILIENCE_TECH_MAX - STRESS_RESILIENCE_TECH_MIN;
  if (span <= 0) return 0;
  const r = (capitalResilienceScore - STRESS_RESILIENCE_TECH_MIN) / span;
  return Math.round(Math.min(100, Math.max(0, r * 100)));
}

/** Health risk tier: technical position 1 = best … 5 = worst → Lion 0–100 linear. */
export const HEALTH_TIER_TECH_MIN = 1;
export const HEALTH_TIER_TECH_MAX = 5;

export function healthRiskTierTechnicalToLion0to100(tier: 1 | 2 | 3 | 4 | 5): number {
  const t = Math.min(HEALTH_TIER_TECH_MAX, Math.max(HEALTH_TIER_TECH_MIN, tier));
  const span = HEALTH_TIER_TECH_MAX - HEALTH_TIER_TECH_MIN;
  const r = (HEALTH_TIER_TECH_MAX - t) / span;
  return Math.round(Math.min(100, Math.max(0, r * 100)));
}

/** @deprecated Use `healthRiskTierTechnicalToLion0to100` — same linear map. */
export const healthRiskTierToLion0to100 = healthRiskTierTechnicalToLion0to100;

/** @deprecated Use `technicalResilienceToLion0to100` — alias kept for imports. */
export const stressScoreToDisplay0to100 = technicalResilienceToLion0to100;

/** Single public API / UI status set (score bands). */
export type LionPublicVerdictStatus =
  | 'STRONG'
  | 'STABLE'
  | 'FRAGILE'
  | 'AT_RISK'
  | 'NOT_SUSTAINABLE';

/** All must be true to keep STRONG (score alone is not enough). */
export type LionStrongEligibility = {
  incomeGapOk: boolean;
  capitalSufficientVsTarget: boolean;
  sustainabilityLongTermOrPerpetual: boolean;
  noMajorDownsideRisk: boolean;
};

export function lionStrongEligible(e: LionStrongEligibility): boolean {
  return e.incomeGapOk && e.capitalSufficientVsTarget && e.sustainabilityLongTermOrPerpetual && e.noMajorDownsideRisk;
}

/** Optional goal snapshot for Capital Stress STRONG gate (from client goal context). */
export type LionStressGoalStrongSnapshot = {
  hasIncomeGoal: boolean;
  monthlyGap: number;
  targetCapitalRequired: number;
};

/**
 * Map 0–100 score → public band (non-linear interpretation: wider FRAGILE mid-band).
 * If the band is STRONG, requires `strongEligibility` with all checks true; otherwise returns STABLE.
 * Omit `strongEligibility` when score ≥ 85 → STRONG is not allowed (trust-first).
 */
export function lionPublicStatusFromScore0to100(
  score: number,
  strongEligibility?: LionStrongEligibility,
): LionPublicVerdictStatus {
  const s = Math.round(Math.min(100, Math.max(0, score)));
  let band: LionPublicVerdictStatus;
  if (s >= 85) band = 'STRONG';
  else if (s >= 70) band = 'STABLE';
  else if (s >= 55) band = 'FRAGILE';
  else if (s >= 35) band = 'AT_RISK';
  else band = 'NOT_SUSTAINABLE';

  if (band === 'STRONG') {
    if (!strongEligibility || !lionStrongEligible(strongEligibility)) return 'STABLE';
  }
  return band;
}

/** Capital Stress: STRONG gate from Monte Carlo inputs ± optional income/capital goal snapshot. */
export function lionStrongEligibilityFromStressInputs(
  inputs: LionStressAdvisoryInputs,
  goal?: LionStressGoalStrongSnapshot | null,
): LionStrongEligibility {
  const withdrawalPct = inputs.initialCapital > 0 ? (inputs.withdrawalAmount / inputs.initialCapital) * 100 : 0;
  const fragile = inputs.fragilityIndicator === 'Fragile' || inputs.fragilityIndicator === 'Critical';
  const topTier = inputs.tier === 'Strong' || inputs.tier === 'Very Strong';

  const incomeGapOk = goal?.hasIncomeGoal
    ? goal.monthlyGap <= 0
    : inputs.simulatedAverageOutcome >= inputs.initialCapital && withdrawalPct <= 4.5;

  const capitalSufficientVsTarget = goal?.hasIncomeGoal
    ? goal.targetCapitalRequired > 0
      ? inputs.initialCapital >= goal.targetCapitalRequired
      : false
    : inputs.simulatedAverageOutcome >= inputs.initialCapital &&
      inputs.worstCaseOutcome >= inputs.initialCapital * 0.35;

  const sustainabilityLongTermOrPerpetual = inputs.timeHorizonYears >= 20;

  const noMajorDownsideRisk =
    inputs.maximumDrawdownPct <= 32 &&
    !fragile &&
    topTier &&
    inputs.simulatedAverageOutcome >= inputs.initialCapital;

  return {
    incomeGapOk,
    capitalSufficientVsTarget,
    sustainabilityLongTermOrPerpetual,
    noMajorDownsideRisk,
  };
}

/** Forever Income: STRONG only with surplus, funded target, long horizon, and moderate model risk. */
export function lionStrongEligibilityFromForeverInput(input: ForeverLionInputs): LionStrongEligibility {
  const perpetual = input.perpetualRunway === true || /^perpetual$/i.test(input.runwayLabel.trim());
  const runwayLong = input.runwayYears != null && Number.isFinite(input.runwayYears) && input.runwayYears >= 20;
  const desiredMonthly = input.annualExpense > 0 ? input.annualExpense / 12 : 0;
  let sustainableMonthly = 0;
  if (input.isSustainable && input.currentAssets > 0 && input.realReturnRate > 0) {
    sustainableMonthly = (input.currentAssets * (input.realReturnRate / 100)) / 12;
  }
  const monthlyGap = desiredMonthly > 0 && sustainableMonthly > 0 ? desiredMonthly - sustainableMonthly : 0;

  const incomeGapOk = input.isSustainable && monthlyGap <= 0;
  const capitalSufficientVsTarget =
    input.isSustainable &&
    input.capitalNeeded > 0 &&
    input.currentAssets >= input.capitalNeeded &&
    input.gap <= 0;
  const sustainabilityLongTermOrPerpetual = perpetual || runwayLong;
  const gapRatio =
    input.isSustainable && Number.isFinite(input.capitalNeeded) && input.capitalNeeded > 0
      ? input.gap / input.capitalNeeded
      : NaN;
  const noMajorDownsideRisk =
    input.isSustainable &&
    input.realReturnRate >= 3 &&
    input.gap <= 0 &&
    (!Number.isFinite(gapRatio) || gapRatio <= 0.1);

  return {
    incomeGapOk,
    capitalSufficientVsTarget,
    sustainabilityLongTermOrPerpetual,
    noMajorDownsideRisk,
  };
}

/** Income Engineering: no formal capital target in-model → STRONG is never eligible (capital gate false). */
export function lionStrongEligibilityFromIncomeEngineering(ctx: {
  monthlyNetCashflow: number;
  sustainabilityStatus: 'green' | 'amber' | 'red' | 'invalid';
  worstMonthCoveragePct: number;
  medianCoveragePct: number;
}): LionStrongEligibility {
  const green = ctx.sustainabilityStatus === 'green';
  return {
    incomeGapOk: green && ctx.monthlyNetCashflow >= 0,
    capitalSufficientVsTarget: false,
    sustainabilityLongTermOrPerpetual: green && ctx.medianCoveragePct >= 108 && ctx.worstMonthCoveragePct >= 100,
    noMajorDownsideRisk: green && ctx.worstMonthCoveragePct >= 100 && ctx.medianCoveragePct >= 105,
  };
}

/** Capital Health: STRONG only for best tier with long runway / growth horizon signals in vars. */
export function lionStrongEligibilityFromHealthTier(
  tier: 1 | 2 | 3 | 4 | 5,
  mode: 'withdrawal' | 'growth',
  vars: LionHealthVariables,
): LionStrongEligibility {
  const runwayStr = (vars.runway ?? '').toLowerCase();
  const perpetualRunway =
    runwayStr.includes('perpetual') ||
    runwayStr.includes('indefinite') ||
    /forever|∞|infinity/i.test(vars.runway ?? '');
  const runwayYearsMatch = vars.runway ? /(\d+(?:\.\d+)?)\s*years?/i.exec(vars.runway) : null;
  const runwayYears = runwayYearsMatch ? parseFloat(runwayYearsMatch[1]) : null;
  const runwayLong = runwayYears != null && runwayYears >= 20;
  const horizonYears = parseFloat(vars.horizon);
  const horizonLong = Number.isFinite(horizonYears) && horizonYears >= 20;

  const incomeGapOk = tier <= 2;
  const capitalSufficientVsTarget = tier <= 2;
  const sustainabilityLongTermOrPerpetual =
    tier === 1 && (mode === 'growth' ? horizonLong : perpetualRunway || runwayLong);
  const noMajorDownsideRisk = tier === 1;

  return {
    incomeGapOk,
    capitalSufficientVsTarget,
    sustainabilityLongTermOrPerpetual,
    noMajorDownsideRisk,
  };
}

export function formatLionPublicStatusLabel(s: LionPublicVerdictStatus): string {
  return s.replaceAll('_', ' ');
}

/**
 * Engine narrative tier from Lion score (internal Lion’s Verdict copy keys).
 * Thresholds match public band breakpoints (classification alignment).
 */
export function lionEngineTierFromLionScore0to100(score: number): LionScoreTier {
  const s = Math.min(100, Math.max(0, score));
  if (s >= 85) return 'Very Strong';
  if (s >= 70) return 'Strong';
  if (s >= 55) return 'Moderate';
  if (s >= 35) return 'Weak';
  return 'Critical';
}

/** Stress: resilience index → engine tier (same pipeline as public score). */
export function lionTierFromTechnicalResilience(capitalResilienceScore: number): LionScoreTier {
  return lionEngineTierFromLionScore0to100(technicalResilienceToLion0to100(capitalResilienceScore));
}

export type ForeverLionScoreContext = {
  isSustainable: boolean;
  perpetualRunway: boolean;
  runwayYears: number | null;
  gapRatio: number;
};

const FOREVER_TECH_MIN = 0;
const FOREVER_TECH_MAX = 100;

/**
 * Forever: normalised base from progress on [0,100], then optional ±10 total nudge.
 * Monotone in `technicalProgress0to100` when context is fixed.
 */
export function foreverProgressTechnicalToLion0to100(
  technicalProgress0to100: number,
  ctx: ForeverLionScoreContext,
): number {
  const span = FOREVER_TECH_MAX - FOREVER_TECH_MIN;
  const raw = ctx.isSustainable
    ? (Math.min(FOREVER_TECH_MAX, Math.max(FOREVER_TECH_MIN, technicalProgress0to100)) - FOREVER_TECH_MIN) /
      span
    : 0;
  let base = Math.round(Math.min(100, Math.max(0, raw * 100)));

  let adj = 0;
  if (ctx.perpetualRunway && ctx.isSustainable) adj += 5;
  if (ctx.isSustainable && ctx.runwayYears != null && Number.isFinite(ctx.runwayYears) && ctx.runwayYears < 20) {
    adj -= 8;
  }
  if (ctx.isSustainable && ctx.gapRatio > 0.3) adj -= 6;
  adj = Math.max(-10, Math.min(10, adj));

  return Math.round(Math.min(100, Math.max(0, base + adj)));
}

/** Income Engineering: coverage technical on [0,100] + light sustainability nudge (±10). */
export type IncomeEngineeringLionContext = {
  medianCoveragePct: number;
  worstMonthCoveragePct: number;
  sustainabilityStatus: 'green' | 'amber' | 'red' | 'invalid';
};

export function incomeEngineeringCoverageToLion0to100(ctx: IncomeEngineeringLionContext): number {
  if (ctx.sustainabilityStatus === 'invalid') return 0;
  const tech = Math.min(100, Math.max(0, (ctx.medianCoveragePct + ctx.worstMonthCoveragePct) / 2));
  let adj = 0;
  if (ctx.sustainabilityStatus === 'green') adj += 5;
  if (ctx.sustainabilityStatus === 'amber') adj -= 3;
  if (ctx.sustainabilityStatus === 'red') adj -= 8;
  adj = Math.max(-10, Math.min(10, adj));
  return Math.round(Math.min(100, Math.max(0, tech + adj)));
}
