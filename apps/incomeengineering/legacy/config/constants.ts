/** Time horizon range (years) */
export const TIME_HORIZON_MIN = 1;
export const TIME_HORIZON_MAX = 30;
export const TIME_HORIZON_DEFAULT = 15;

/** Return sliders: 0% to 15%, step 0.1% */
export const RETURN_MIN = 0;
export const RETURN_MAX = 15;
export const RETURN_STEP = 0.1;

/** High return threshold for caution banner (non-blocking) */
export const HIGH_RETURN_THRESHOLD = 12;

/** Assumed annual return (%) on freed-up capital from existing assets when reinvested */
export const REINVEST_ASSUMPTION_PERCENT = 7.5;

/** Default Est. Investment Return % for each Unlocking Capital asset (slider default) */
export const DEFAULT_UNLOCK_EST_INVESTMENT_RETURN_PERCENT = 8;

/** Coverage thresholds for sustainability badge */
export const COVERAGE_GREEN = 0.98;   // Sustainable
export const COVERAGE_AMBER = 0.75;   // Below this = Red; between Amber and Green = Amber

/** Estimated inflation: 0% to 10%, step 0.1%, default 1.5% */
export const INFLATION_MIN = 0;
export const INFLATION_MAX = 10;
export const INFLATION_DEFAULT = 1.5;
export const INFLATION_STEP = 0.1;

/** Guardrails */
export const LEVERAGE_WARNING_PCT = 0.65;      // Combined loans / total assets
export const SINGLE_BUCKET_WARNING_PCT = 0.7;  // Any single bucket
export const LOW_COVERAGE_MONTHS_PCT = 0.25;  // Months with coverage < 1.0
export const MARGIN_BUFFER_WARNING_PCT = 10;   // Margin buffer below this %
