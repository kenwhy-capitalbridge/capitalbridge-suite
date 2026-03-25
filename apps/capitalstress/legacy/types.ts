export interface ForecastRow {
  period: number;
  returnPct: number;
  value: number;
}

export interface StatsResult {
  average: number;
  stdDev: number;
  sampleSize: number;
  moe: number;
  upperBound: number;
  lowerBound: number;
  max: number;
  min: number;
  range: number;
  median: number;
  mode: string;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
}

/** Single path: year index (0..years) -> balance at end of that year */
export type YearlyPath = number[];

/** Result of one Monte Carlo path: final capital and yearly balances */
export interface MonteCarloPathResult {
  finalCapital: number;
  yearlyBalances: number[];
  maxDrawdownPct: number;
  survived: boolean;
}

/** Stress shock severity */
export type StressSeverity = 'none' | 'moderate' | 'bear' | 'crisis';

/** Tier for resilience score: score can be -100 to 100 (anchored to probability of success over horizon) */
export type ScoreTier = 'Critical' | 'Weak' | 'Moderate' | 'Strong' | 'Very Strong';

/** Capital fragility classification (distance-to-failure) */
export type FragilityLevel = 'Stable' | 'Watchful' | 'Vulnerable' | 'Fragile' | 'Critical';

/** Full result from daily Monte Carlo simulation */
export interface MonteCarloResult {
  paths: MonteCarloPathResult[];
  simulatedAverage: number;
  percentile5: number;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile95: number;
  survivalProbability: number;
  maxDrawdownPctAvg: number;
  /** Resilience score anchored to % success over horizon: can be negative. Lower for lower capital, higher withdrawal, worse return range, higher confidence, market shock. Approx range -100 to 100. */
  capitalResilienceScore: number;
  /**
   * Capital Depletion (net pressure), capped to [-125, +125].
   * Negative = surplus / buffer, positive = depletion pressure.
   * Incorporates depletion risk, drawdown, withdrawal pressure, and erosion vs initial capital.
   */
  depletionPressurePct: number;
  tier: ScoreTier;
  /** Capital fragility indicator (distance-to-failure) */
  fragilityIndicator: FragilityLevel;
  /** For table: worst path (lowest final capital) yearly balances */
  worstPathYearly: number[];
  /** For table: median path yearly balances */
  medianPathYearly: number[];
  /** For table: best path (highest final capital) yearly balances */
  bestPathYearly: number[];
  /** Failure map: per-year failure rate (0-1) - paths below initial capital */
  failureRateByYear: number[];
  /** Per-year probability of capital depletion (balance <= 0) */
  depletionRateByYear: number[];
  /** Per-year probability of structural capital stress (balance < 50% of initial capital) */
  structuralStressRateByYear: number[];
  /** Failure map: per-year average drawdown % */
  avgDrawdownByYear: number[];
  /** Per-year percentile bands (year index 0..years, values at end of year) */
  yearlyPercentileBands: { year: number; p5: number; p25: number; p50: number; p75: number; p95: number }[];
  /** Number of scenarios actually simulated */
  simulationCount: number;
}

/** Inputs for advisory engine */
export interface AdvisoryInputs {
  capitalResilienceScore: number;
  tier: ScoreTier;
  fragilityIndicator: FragilityLevel;
  initialCapital: number;
  withdrawalAmount: number;
  timeHorizonYears: number;
  simulatedAverageOutcome: number;
  maximumDrawdownPct: number;
  worstCaseOutcome: number;
}

/** One stress scenario result for Structural Stress Sensitivity Panel */
export interface StressScenarioResult {
  label: string;
  resilienceScore: number;
  tier: ScoreTier;
  fragility: FragilityLevel;
  /** Net depletion pressure, capped to [-125, +125]. */
  depletionPressurePct: number;
  simulatedEndingCapital: number;
}
