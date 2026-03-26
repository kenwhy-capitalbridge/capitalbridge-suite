/**
 * Lion's Verdict Engine — shared types.
 * Single source of truth for score, status, and recommendation scaffolding across models.
 */

export type LionScoreTier = 'Critical' | 'Weak' | 'Moderate' | 'Strong' | 'Very Strong';

export type LionFragilityLevel = 'Stable' | 'Watchful' | 'Vulnerable' | 'Fragile' | 'Critical';

/** Capital Stress Monte Carlo advisory input (same shape as legacy AdvisoryInputs). */
export interface LionStressAdvisoryInputs {
  capitalResilienceScore: number;
  tier: LionScoreTier;
  fragilityIndicator: LionFragilityLevel;
  initialCapital: number;
  withdrawalAmount: number;
  timeHorizonYears: number;
  simulatedAverageOutcome: number;
  maximumDrawdownPct: number;
  worstCaseOutcome: number;
}

/** Variables for Capital Health narrative substitution. */
export interface LionHealthVariables {
  withdrawal?: string;
  desiredCapital?: string;
  horizon: string;
  runway?: string;
  expectedReturn: string;
  estimatedReturn?: string;
}

export interface ForeverLionInputs {
  isSustainable: boolean;
  progressPercent: number;
  gap: number;
  currentAssets: number;
  capitalNeeded: number;
  annualExpense: number;
  runwayLabel: string;
  realReturnRate: number;
  /** Parsed horizon in years (omit when perpetual). Used for client report + score emphasis only. */
  runwayYears?: number | null;
  perpetualRunway?: boolean;
  /** Nominal expected return % (e.g. 7) for client JSON; engine ignores. */
  nominalExpectedReturnPct?: number;
}

/** Full engine output — all UI/PDF surfaces should derive from this. */
export interface LionVerdictOutput {
  /** Canonical 0–100 structural strength score (higher = more resilient). */
  score0to100: number;
  status: LionScoreTier;
  fragility: LionFragilityLevel;
  opening: string;
  interpretation: string;
  outcomeSummary: string;
  riskExplanation: string;
  advisoryRecommendation: string;
  strategicOptions: string[];
  capitalUnlockGuidance: string[];
  scenarioActions: string[];
  priorityActions: string[];
  ifYouDoNothing: string;
  fullNarrative: string;
}

/** Legacy Capital Stress print/UI shape (subset of LionVerdictOutput). */
export interface VerdictNarrative {
  opening: string;
  interpretation: string;
  outcomeSummary: string;
  riskExplanation: string;
  advisoryRecommendation: string;
  fullNarrative: string;
}

export interface MicroSignal {
  type: 'warn' | 'ok';
  text: string;
}
