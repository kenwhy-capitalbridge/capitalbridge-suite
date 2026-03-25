import {
  ForecastRow,
  StatsResult,
  RegressionResult,
  MonteCarloPathResult,
  MonteCarloResult,
  StressSeverity,
  ScoreTier,
  FragilityLevel,
  StressScenarioResult,
} from '../types';

const DAYS_PER_YEAR = 252;

/** Dynamic scenario count: number of days in selected time horizon (calendar days). */
export function getSimulationCount(years: number): number {
  return Math.max(365, Math.round(years * 365));
}

export const Z_LOOKUP: Record<number, number> = {
  99: 2.576,
  98: 2.326,
  95: 1.960,
  90: 1.645
};

export const generateForecast = (
  startingInvestment: number,
  lowerReturnAnnual: number,
  upperReturnAnnual: number,
  totalMonths: number,
  yearlyWithdrawal: number = 0
): ForecastRow[] => {
  const data: ForecastRow[] = [];
  let currentValue = startingInvestment;
  
  // Annual to Monthly scaling
  const monthlyLower = lowerReturnAnnual / 12;
  const monthlyUpper = upperReturnAnnual / 12;

  // Add initial state (Month 0)
  data.push({
    period: 0,
    returnPct: 0,
    value: startingInvestment
  });

  for (let i = 1; i <= totalMonths; i++) {
    // Generate a random monthly return within the boundaries
    const returnPct = Math.random() * (monthlyUpper - monthlyLower) + monthlyLower;
    
    // Growth calculation
    currentValue = currentValue * (1 + returnPct / 100);
    
    // Subtraction of yearly withdrawal at the end of each 12-month cycle
    if (i % 12 === 0) {
      currentValue -= yearlyWithdrawal;
    }
    
    // Zero-bound check
    currentValue = Math.max(0, currentValue);
    
    data.push({
      period: i,
      returnPct: returnPct,
      value: currentValue
    });
  }
  return data;
};

export const calculateStats = (data: ForecastRow[], zStar: number): StatsResult => {
  // We exclude the starting period (0) for variance/mean stats to focus on the outcome path
  const activeData = data.slice(1);
  const values = activeData.map(d => d.value);
  const n = values.length;
  
  if (n === 0) {
     return {
        average: 0, stdDev: 0, sampleSize: 0, moe: 0, upperBound: 0, lowerBound: 0,
        max: 0, min: 0, range: 0, median: 0, mode: 'N/A'
     };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / n;
  
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquareDiff = n > 1 ? squareDiffs.reduce((a, b) => a + b, 0) / (n - 1) : 0;
  const stdDev = Math.sqrt(avgSquareDiff);
  
  const moe = n > 0 ? (zStar * stdDev) / Math.sqrt(n) : 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const median = n % 2 !== 0 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  
  const counts = new Map<number, number>();
  values.forEach(v => counts.set(Math.round(v), (counts.get(Math.round(v)) || 0) + 1));
  let maxCount = 0;
  counts.forEach(c => { if (c > maxCount) maxCount = c; });
  const modes = Array.from(counts.entries()).filter(([_, c]) => c === maxCount && c > 1).map(([v]) => v);
  
  const max = Math.max(...values);
  const min = Math.min(...values);

  return {
    average: avg,
    stdDev: stdDev,
    sampleSize: n,
    moe: moe,
    upperBound: avg + moe,
    lowerBound: avg - moe,
    max,
    min,
    range: max - min,
    median,
    mode: modes.length > 0 ? modes.join(', ') : 'N/A'
  };
};

// --- Daily Monte Carlo engine ---

function stressShockPct(severity: StressSeverity): number {
  switch (severity) {
    case 'moderate': return -15;
    case 'bear': return -30;
    case 'crisis': return -45;
    default: return 0;
  }
}

type MarketRegime = 'bull' | 'normal' | 'bear';

const REGIME_PROB = { bull: 0.5, normal: 0.35, bear: 0.15 };
const REGIME_PERSISTENCE = 0.7;
/** Cap daily return to plausible range for diversified portfolio (limit extreme tails). */
const DAILY_RETURN_CAP_POSITIVE = 0.04;
const DAILY_RETURN_CAP_NEGATIVE = -0.04;
/** Mean reversion: if year return below this (e.g. -15%), boost recovery probability next year. */
const BAD_YEAR_THRESHOLD = -0.12;
/** Bias daily return sampling toward upper end of user range (0 = no bias, higher = more optimistic within range). */
const RETURN_TILT_WITHIN_RANGE = 0.40;

function drawRegime(prevRegime: MarketRegime | null, forceRecovery = false): MarketRegime {
  if (forceRecovery) {
    const u = Math.random();
    if (u < 0.55) return 'bull';
    if (u < 0.85) return 'normal';
    return 'bear';
  }
  if (prevRegime != null && Math.random() < REGIME_PERSISTENCE) return prevRegime;
  const u = Math.random();
  if (u < REGIME_PROB.bull) return 'bull';
  if (u < REGIME_PROB.bull + REGIME_PROB.normal) return 'normal';
  return 'bear';
}

/** Sample daily return for a given regime; then clamp to avoid extreme tails. Tilt biases toward upper end of user range. */
function dailyReturnForRegime(
  regime: MarketRegime,
  dailyReturnLower: number,
  dailyReturnUpper: number
): number {
  const range = dailyReturnUpper - dailyReturnLower;
  let u = Math.random();
  let frac: number;
  switch (regime) {
    case 'bull':
      frac = 0.5 + 0.45 * u;
      break;
    case 'normal':
      frac = 0.25 + 0.5 * u;
      break;
    case 'bear':
      frac = 0.05 + 0.4 * u;
      break;
    default:
      frac = u;
  }
  frac = Math.min(1, frac + RETURN_TILT_WITHIN_RANGE);
  const dailyReturn = dailyReturnLower + range * frac;
  return Math.max(DAILY_RETURN_CAP_NEGATIVE, Math.min(DAILY_RETURN_CAP_POSITIVE, dailyReturn));
}

/** Run one daily path with regime-based simulation, mean reversion, and capped tails. */
function runSingleDailyPath(
  years: number,
  initialCapital: number,
  yearlyWithdrawal: number,
  dailyReturnLower: number,
  dailyReturnUpper: number,
  stressSeverity: StressSeverity
): MonteCarloPathResult {
  const shockPct = stressShockPct(stressSeverity);
  const stressYear = stressSeverity !== 'none' && years >= 2
    ? Math.floor(Math.random() * (years - 1)) + 1
    : -1;
  const stressDayInYear = stressSeverity !== 'none' ? Math.floor(Math.random() * DAYS_PER_YEAR) : -1;

  let currentRegime: MarketRegime = drawRegime(null, false);

  let balance = initialCapital;
  let peak = balance;
  let maxDrawdownPct = 0;
  const yearlyBalances: number[] = [initialCapital];

  for (let y = 0; y < years; y++) {
    const balanceStartYear = balance;
    for (let d = 0; d < DAYS_PER_YEAR; d++) {
      const isStressDay = stressYear === y && d === stressDayInYear;
      if (isStressDay && shockPct !== 0) {
        const shockReturn = Math.max(DAILY_RETURN_CAP_NEGATIVE, Math.min(0, shockPct / 100));
        balance = balance * (1 + shockReturn);
      } else {
        const dailyReturn = dailyReturnForRegime(currentRegime, dailyReturnLower, dailyReturnUpper);
        balance = balance * (1 + dailyReturn);
      }
      balance = Math.max(0, balance);
      peak = Math.max(peak, balance);
      const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    }
    balance -= yearlyWithdrawal;
    balance = Math.max(0, balance);
    yearlyBalances.push(balance);

    if (y < years - 1) {
      const balanceBeforeWithdrawal = balance + yearlyWithdrawal;
      const yearReturn = balanceStartYear > 0 ? (balanceBeforeWithdrawal - balanceStartYear) / balanceStartYear : 0;
      const forceRecovery = yearReturn < BAD_YEAR_THRESHOLD;
      currentRegime = drawRegime(currentRegime, forceRecovery);
    }
  }

  const finalCapital = yearlyBalances[yearlyBalances.length - 1];
  const survived = finalCapital > 0;

  return {
    finalCapital,
    yearlyBalances,
    maxDrawdownPct,
    survived,
  };
}

/** Tiers: Critical < 30, Weak 30–50, Moderate 50–70, Strong 70–90, Very Strong ≥ 90 */
function getScoreTier(score: number): ScoreTier {
  if (score < 30) return 'Critical';
  if (score < 50) return 'Weak';
  if (score < 70) return 'Moderate';
  if (score < 90) return 'Strong';
  return 'Very Strong';
}

/**
 * Resilience Score: percentage-of-success anchored to the selected time horizon.
 * Success = capital > 0 at end of horizon. Score can be negative.
 * Base: (successRate - 0.5) * 200 so 0% success → -100, 50% → 0, 100% → 100.
 * Blended (when avgStructuralStressRate provided): 70% survival probability + 30% capital stability.
 * Stability = 1 - avg structural stress rate (structural stress = capital below 50% of initial).
 * Penalties (so score is lower for):
 * - Higher confidence selected (stricter bar): subtract (confidence - 90) * 0.2
 * - Market shock event: subtract 5–15 depending on severity
 * - Capital erosion: if simulated average outcome < initial capital, subtract up to 40 points
 * - Withdrawal rate: high withdrawal as % of initial capital directly reduces score (e.g. 10% → significant penalty).
 */
function computeCapitalResilienceScore(
  survivalProbability: number,
  confidenceLevel: number,
  stressSeverity: StressSeverity,
  initialCapital: number,
  simulatedAverageOutcome: number,
  withdrawalPctOfInitial: number,
  avgStructuralStressRate: number | null
): number {
  const stabilityComponent = avgStructuralStressRate != null ? 1 - avgStructuralStressRate : 1;
  const blendedSurvival = avgStructuralStressRate != null
    ? 0.7 * survivalProbability + 0.3 * stabilityComponent
    : survivalProbability;
  const base = (blendedSurvival - 0.5) * 200; // -100 to 100
  const confidencePenalty = (confidenceLevel - 90) * 0.2; // 90% → 0, 99% → -1.8
  const stressPenalty =
    stressSeverity === 'crisis' ? 15 :
    stressSeverity === 'bear' ? 10 :
    stressSeverity === 'moderate' ? 5 : 0;
  const erosionPct = initialCapital > 0 ? Math.max(0, ((initialCapital - simulatedAverageOutcome) / initialCapital) * 100) : 0;
  const erosionPenalty = Math.min(40, erosionPct * 1.0); // 10% below start → -10 points; cap -40
  // Withdrawal penalty: e.g. 5% → 0, 10% → -12.5, 15% → -27.5 (capped). So $1M + $100k/year hits score strongly.
  const withdrawalPenalty = Math.min(35, Math.max(0, withdrawalPctOfInitial - 5) * 2.5);
  const score = base - confidencePenalty - stressPenalty - erosionPenalty - withdrawalPenalty;
  return Math.round(Math.max(-100, Math.min(100, score)));
}

/**
 * Capital Depletion Probability (net pressure): combines depletion risk with structure signals.
 * Range: [-25, +25], where:
 * - Negative = surplus / buffer (lower depletion pressure)
 * - Positive = depletion pressure (higher risk)
 */
function computeDepletionPressurePct(
  survivalProbability: number,
  maxDrawdownPctAvg: number,
  withdrawalPctOfInitial: number,
  initialCapital: number,
  simulatedAverageOutcome: number
): number {
  const CAP = 125;
  const depletionProbPct = (1 - survivalProbability) * 100; // 0..100
  const avgDeltaPct = initialCapital > 0 ? ((simulatedAverageOutcome - initialCapital) / initialCapital) * 100 : 0; // can be +/- 

  // Scale components so typical outputs land within [-25, 25] before clamping.
  const base = (depletionProbPct - 10) * 0.25; // 10% depletion → 0, 50% → +10, 100% → +22.5
  const drawdownAdj = (maxDrawdownPctAvg - 25) * 0.30; // 25% → 0, 50% → +7.5, 15% → -3
  // Withdrawal weight increased so 10% of initial (e.g. $100k on $1M) has a strong effect on depletion pressure.
  const withdrawalAdj = (withdrawalPctOfInitial - 5) * 2.0; // 5% → 0, 10% → +10, 15% → +20, 0% → -10
  const erosionAdj = -avgDeltaPct * 0.40; // avg below start (negative) → positive pressure; surplus → negative pressure

  const raw = base + drawdownAdj + withdrawalAdj + erosionAdj;
  const capped = Math.max(-CAP, Math.min(CAP, raw));
  return Math.round(capped * 10) / 10; // one decimal
}

/** Policy B: pressure-based segment index (0=CRITICAL .. 4=STABLE). Only source for pillLabel. */
const SEGMENT_INDEX_TO_LABEL: FragilityLevel[] = ['Critical', 'Fragile', 'Vulnerable', 'Watchful', 'Stable'];

/**
 * Policy B thresholds (pressure in percentage points, e.g. 10 = 10%).
 * 4=STABLE if pressure < 0; 3=WATCHFUL if 0≤p<10; 2=VULNERABLE if 10≤p<30; 1=FRAGILE if 30≤p<60; 0=CRITICAL if p≥60.
 */
function segmentIndexFromPressure(depletionPressurePct: number): number {
  if (depletionPressurePct < 0) return 4;
  if (depletionPressurePct < 10) return 3;
  if (depletionPressurePct < 30) return 2;
  if (depletionPressurePct < 60) return 1;
  return 0;
}

/** Bar output: single source of truth. All consumers use only segmentIndex and pillLabel from this. instanceId set by provider. */
export interface DepletionBarOutput {
  displayValue: number;
  pos: number;
  pressure: number;
  segmentIndex: number;
  pillLabel: FragilityLevel;
  /** Policy B: bar positions [0, pos(60), pos(30), pos(10), pos(0), 100] for gradient, ticks, and label centering. */
  segmentStops: number[];
  instanceId?: number;
}

/** Bar position for marker only (0–100). Unchanged formula; visual only. */
function depletionBarPosition(depletionPressurePct: number): number {
  return Math.max(0, Math.min(100, ((125 - depletionPressurePct) / 250) * 100));
}

/** Policy B pressure thresholds (percentage points) mapped to bar position for segment boundaries. */
function getSegmentStops(): number[] {
  const cutFragile = depletionBarPosition(60);
  const cutVulnerable = depletionBarPosition(30);
  const cutWatchful = depletionBarPosition(10);
  const cutStable = depletionBarPosition(0);
  return [0, cutFragile, cutVulnerable, cutWatchful, cutStable, 100];
}

/**
 * Single export for Capital Depletion Pressure block (Policy B).
 * Flow: pressure → segmentIndex → pillLabel; pos from pressure for marker only.
 * segmentStops align gradient, ticks, and labels with pressure thresholds (0, 10, 30, 60).
 */
export function getDepletionBarOutput(depletionPressurePct: number): DepletionBarOutput {
  const pressure = Math.round(depletionPressurePct * 10) / 10;
  const segmentIndex = segmentIndexFromPressure(depletionPressurePct);
  const pillLabel = SEGMENT_INDEX_TO_LABEL[segmentIndex];
  const pos = depletionBarPosition(depletionPressurePct);
  const segmentStops = getSegmentStops();
  return {
    displayValue: pressure,
    pos,
    pressure,
    segmentIndex,
    pillLabel,
    segmentStops,
  };
}

/** Fragility: distance-to-failure from drawdown, worst case, withdrawal pressure, depletion risk */
function computeFragility(
  maxDrawdownPctAvg: number,
  worstCaseEnding: number,
  initialCapital: number,
  survivalProbability: number,
  withdrawalPctOfInitial: number
): FragilityLevel {
  const depletionRisk = 1 - survivalProbability;
  const worstCaseBelowStart = worstCaseEnding < initialCapital * 0.5;
  if (maxDrawdownPctAvg > 50 || worstCaseBelowStart || depletionRisk > 0.3) return 'Critical';
  if (maxDrawdownPctAvg > 40 || worstCaseEnding < initialCapital || depletionRisk > 0.15) return 'Fragile';
  if (maxDrawdownPctAvg > 30 || withdrawalPctOfInitial > 8 || depletionRisk > 0.05) return 'Vulnerable';
  if (maxDrawdownPctAvg > 20 || withdrawalPctOfInitial > 5) return 'Watchful';
  return 'Stable';
}

/** Percentile from sorted array (0-1 -> value) */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (i - lo) * (sorted[hi] - sorted[lo]);
}

export function runMonteCarlo(
  initialCapital: number,
  yearlyWithdrawal: number,
  lowerReturnAnnual: number,
  upperReturnAnnual: number,
  years: number,
  stressSeverity: StressSeverity,
  numPaths?: number,
  confidenceLevel: number = 90
): MonteCarloResult {
  const pathsToRun = numPaths ?? getSimulationCount(years);
  const dailyLower = Math.pow(1 + lowerReturnAnnual / 100, 1 / DAYS_PER_YEAR) - 1;
  const dailyUpper = Math.pow(1 + upperReturnAnnual / 100, 1 / DAYS_PER_YEAR) - 1;

  const paths: MonteCarloPathResult[] = [];
  for (let i = 0; i < pathsToRun; i++) {
    paths.push(
      runSingleDailyPath(
        years,
        initialCapital,
        yearlyWithdrawal,
        dailyLower,
        dailyUpper,
        stressSeverity
      )
    );
  }

  const finals = paths.map(p => p.finalCapital).sort((a, b) => a - b);
  const simulatedAverage = finals.reduce((a, b) => a + b, 0) / pathsToRun;
  const survivalProbability = paths.filter(p => p.survived).length / pathsToRun;
  const avgDrawdown = paths.reduce((s, p) => s + p.maxDrawdownPct, 0) / pathsToRun;

  const p5 = percentile(finals, 5);
  const p25 = percentile(finals, 25);
  const p50 = percentile(finals, 50);
  const p75 = percentile(finals, 75);
  const p95 = percentile(finals, 95);

  const withdrawalPctOfInitial = initialCapital > 0 ? (yearlyWithdrawal / initialCapital) * 100 : 0;
  const depletionPressurePct = computeDepletionPressurePct(
    survivalProbability,
    avgDrawdown,
    withdrawalPctOfInitial,
    initialCapital,
    simulatedAverage
  );

  const worstPath = paths.reduce((best, p) => (p.finalCapital < best.finalCapital ? p : best));
  const bestPath = paths.reduce((best, p) => (p.finalCapital > best.finalCapital ? p : best));
  const sortedByFinal = [...paths].sort((a, b) => a.finalCapital - b.finalCapital);
  const medianPath = sortedByFinal[Math.floor(sortedByFinal.length / 2)];

  const failureRateByYear: number[] = [];
  const depletionRateByYear: number[] = [];
  const structuralStressRateByYear: number[] = [];
  const avgDrawdownByYear: number[] = [];
  const yearlyPercentileBands: { year: number; p5: number; p25: number; p50: number; p75: number; p95: number }[] = [];

  const structuralStressThreshold = initialCapital * 0.5; // Capital below 50% of initial = structural stress

  for (let y = 0; y <= years; y++) {
    let failures = 0;
    let depleted = 0;
    let structuralStress = 0;
    let drawdownSum = 0;
    const balancesAtY = paths.map(p => p.yearlyBalances[y]).sort((a, b) => a - b);
    paths.forEach(p => {
      const bal = p.yearlyBalances[y];
      if (bal < initialCapital) failures++;
      if (bal <= 0) depleted++;
      if (bal < structuralStressThreshold) structuralStress++;
      const peak = Math.max(...p.yearlyBalances.slice(0, y + 1));
      if (peak > 0) drawdownSum += ((peak - bal) / peak) * 100;
    });
    failureRateByYear.push(failures / pathsToRun);
    depletionRateByYear.push(depleted / pathsToRun);
    structuralStressRateByYear.push(structuralStress / pathsToRun);
    avgDrawdownByYear.push(drawdownSum / pathsToRun);
    yearlyPercentileBands.push({
      year: y,
      p5: percentile(balancesAtY, 5),
      p25: percentile(balancesAtY, 25),
      p50: percentile(balancesAtY, 50),
      p75: percentile(balancesAtY, 75),
      p95: percentile(balancesAtY, 95),
    });
  }

  const avgStructuralStressRate = structuralStressRateByYear.length > 0
    ? structuralStressRateByYear.reduce((a, b) => a + b, 0) / structuralStressRateByYear.length
    : 0;
  const capitalResilienceScore = computeCapitalResilienceScore(
    survivalProbability,
    confidenceLevel,
    stressSeverity,
    initialCapital,
    simulatedAverage,
    withdrawalPctOfInitial,
    avgStructuralStressRate
  );
  const tier = getScoreTier(capitalResilienceScore);
  const fragilityIndicator = computeFragility(
    avgDrawdown,
    p5,
    initialCapital,
    survivalProbability,
    withdrawalPctOfInitial
  );

  return {
    paths,
    simulatedAverage,
    percentile5: p5,
    percentile25: p25,
    percentile50: p50,
    percentile75: p75,
    percentile95: p95,
    survivalProbability,
    maxDrawdownPctAvg: avgDrawdown,
    capitalResilienceScore,
    depletionPressurePct,
    tier,
    fragilityIndicator,
    worstPathYearly: worstPath.yearlyBalances,
    medianPathYearly: medianPath.yearlyBalances,
    bestPathYearly: bestPath.yearlyBalances,
    failureRateByYear,
    depletionRateByYear,
    structuralStressRateByYear,
    avgDrawdownByYear,
    yearlyPercentileBands,
    simulationCount: pathsToRun,
  };
}

const STRESS_SCENARIO_PATHS = 400;

/** Run predefined stress scenarios for Structural Stress Sensitivity Panel. */
export function runStressScenarios(
  initialCapital: number,
  yearlyWithdrawal: number,
  lowerReturnAnnual: number,
  upperReturnAnnual: number,
  years: number,
  stressSeverity: StressSeverity
): StressScenarioResult[] {
  const scenarios: { label: string; run: () => MonteCarloResult }[] = [
    { label: 'Return decreases by 1%', run: () => runMonteCarlo(initialCapital, yearlyWithdrawal, lowerReturnAnnual - 1, upperReturnAnnual - 1, years, stressSeverity, STRESS_SCENARIO_PATHS) },
    { label: 'Return decreases by 2%', run: () => runMonteCarlo(initialCapital, yearlyWithdrawal, lowerReturnAnnual - 2, upperReturnAnnual - 2, years, stressSeverity, STRESS_SCENARIO_PATHS) },
    { label: 'Withdrawal increases by 10%', run: () => runMonteCarlo(initialCapital, yearlyWithdrawal * 1.1, lowerReturnAnnual, upperReturnAnnual, years, stressSeverity, STRESS_SCENARIO_PATHS) },
    { label: 'Withdrawal increases by 20%', run: () => runMonteCarlo(initialCapital, yearlyWithdrawal * 1.2, lowerReturnAnnual, upperReturnAnnual, years, stressSeverity, STRESS_SCENARIO_PATHS) },
    { label: 'Inflation increases to 3%', run: () => runMonteCarlo(initialCapital, yearlyWithdrawal, lowerReturnAnnual - 3, upperReturnAnnual - 3, years, stressSeverity, STRESS_SCENARIO_PATHS) },
    { label: 'Inflation increases to 5%', run: () => runMonteCarlo(initialCapital, yearlyWithdrawal, lowerReturnAnnual - 5, upperReturnAnnual - 5, years, stressSeverity, STRESS_SCENARIO_PATHS) },
  ];
  return scenarios.map(({ label, run }) => {
    const r = run();
    return {
      label,
      resilienceScore: r.capitalResilienceScore,
      tier: r.tier,
      fragility: r.fragilityIndicator,
      depletionPressurePct: r.depletionPressurePct,
      simulatedEndingCapital: r.simulatedAverage,
    };
  });
}
