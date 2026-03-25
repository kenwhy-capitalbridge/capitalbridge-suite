/**
 * Advisory Engine — Dynamically generates The Lion's Verdict narratives
 * for the Capital Stress-Test Model. Combines simulation outcomes and user
 * inputs with tier-based keyword pools and outcome-based logic.
 */

import type { ScoreTier, FragilityLevel, AdvisoryInputs } from '../types';

const LION_OPENING: Record<ScoreTier, string> = {
  Critical: 'The lion roars. The structure cannot bear the load.',
  Weak: 'The lion warns. The structure shows visible strain.',
  Moderate: 'The lion watches. The structure stands but pressure remains.',
  Strong: 'The lion stands firm. The structure holds its ground.',
  'Very Strong': 'The lion reigns. The structure is fortified and resilient.',
};

const KEYWORDS_CRITICAL = ['fragile', 'unsustainable', 'structural failure', 'capital depletion risk', 'high instability'];
const KEYWORDS_WEAK = ['strain', 'structural pressure', 'vulnerability', 'reinforcement required'];
const KEYWORDS_MODERATE = ['balanced structure', 'moderate resilience', 'volatility exposure', 'reinforcement opportunity'];
const KEYWORDS_STRONG = ['stable', 'durable', 'resilient', 'well structured'];
const KEYWORDS_VERY_STRONG = ['robust', 'fortified', 'structurally sound', 'exceptional durability'];

function getKeywordsForTier(tier: ScoreTier): string[] {
  switch (tier) {
    case 'Critical': return KEYWORDS_CRITICAL;
    case 'Weak': return KEYWORDS_WEAK;
    case 'Moderate': return KEYWORDS_MODERATE;
    case 'Strong': return KEYWORDS_STRONG;
    case 'Very Strong': return KEYWORDS_VERY_STRONG;
    default: return KEYWORDS_MODERATE;
  }
}

export function getLionOpening(tier: ScoreTier): string {
  return LION_OPENING[tier] ?? LION_OPENING.Moderate;
}

export interface VerdictNarrative {
  opening: string;
  interpretation: string;
  outcomeSummary: string;
  riskExplanation: string;
  advisoryRecommendation: string;
  fullNarrative: string;
}

function formatCurrency(value: number, locale = 'en-MY', code = 'MYR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(value);
}

export function generateLionsVerdict(inputs: AdvisoryInputs, formatMoney: (n: number) => string = (n) => formatCurrency(n)): VerdictNarrative {
  const {
    capitalResilienceScore,
    tier,
    fragilityIndicator,
    initialCapital,
    withdrawalAmount,
    timeHorizonYears,
    simulatedAverageOutcome,
    maximumDrawdownPct,
    worstCaseOutcome,
  } = inputs;

  const opening = getLionOpening(tier);
  const keywords = getKeywordsForTier(tier);

  const avgBelowStart = simulatedAverageOutcome < initialCapital;
  const drawdownHigh = maximumDrawdownPct > 40;
  const withdrawalPct = initialCapital > 0 ? (withdrawalAmount / initialCapital) * 100 : 0;
  const withdrawalHigh = withdrawalPct > 6;
  const fragileOrCritical = fragilityIndicator === 'Fragile' || fragilityIndicator === 'Critical';

  const interpretation = `Your Resilience Score of ${capitalResilienceScore} (${tier}) indicates ${tier.toLowerCase()} resilience over the ${timeHorizonYears}-year horizon. The score reflects ${keywords[0] ?? 'risk'} in the current capital structure.`;

  let outcomeSummary: string;
  if (avgBelowStart) {
    outcomeSummary = `The simulated average outcome of ${formatMoney(simulatedAverageOutcome)} falls below initial capital of ${formatMoney(initialCapital)}, suggesting capital erosion risk across many scenarios.`;
  } else {
    outcomeSummary = `The simulated average outcome is ${formatMoney(simulatedAverageOutcome)}, with a worst-case floor of ${formatMoney(worstCaseOutcome)}.`;
  }

  const riskParts: string[] = [];
  if (drawdownHigh) riskParts.push('Volatility risk is elevated: maximum drawdown exceeds safe thresholds in many paths.');
  if (withdrawalHigh) riskParts.push('Withdrawal pressure is high relative to the capital base.');
  if (fragileOrCritical) riskParts.push('Structural fragility is elevated; the capital structure is close to breaking under stress.');
  if (tier === 'Strong' || tier === 'Very Strong') riskParts.push('Structural risks remain manageable within the assumed horizon.');
  const riskExplanation = riskParts.length > 0 ? riskParts.join(' ') : 'Risks are within typical bounds for the chosen assumptions.';

  let advisoryRecommendation: string;
  if (tier === 'Critical' || fragileOrCritical) {
    advisoryRecommendation = 'Recommend structural reinforcement: reduce withdrawals, extend the horizon, or add capital. Consider reviewing the plan with an advisor.';
  } else if (tier === 'Weak') {
    advisoryRecommendation = 'Reinforcement is advised: lowering withdrawal pressure or increasing capital allocation could improve long-term resilience.';
  } else if (tier === 'Moderate') {
    advisoryRecommendation = 'Moderate resilience suggests scope to improve: reducing withdrawal pressure or adding capital could strengthen the structure.';
  } else {
    advisoryRecommendation = 'The structure appears well positioned. Maintain a buffer for unexpected stress and revisit assumptions if circumstances change.';
  }

  const fullNarrative = [interpretation, outcomeSummary, riskExplanation, advisoryRecommendation].join(' ');

  return {
    opening,
    interpretation,
    outcomeSummary,
    riskExplanation,
    advisoryRecommendation,
    fullNarrative,
  };
}

export interface MicroSignal {
  type: 'warn' | 'ok';
  text: string;
}

export function getMicroDiagnosticSignals(inputs: AdvisoryInputs): MicroSignal[] {
  const signals: MicroSignal[] = [];
  const withdrawalPct = inputs.initialCapital > 0 ? (inputs.withdrawalAmount / inputs.initialCapital) * 100 : 0;

  if (withdrawalPct > 6) signals.push({ type: 'warn', text: 'Withdrawal pressure is high relative to capital base' });
  if (inputs.maximumDrawdownPct > 40) signals.push({ type: 'warn', text: 'Drawdown risk exceeds safe thresholds' });
  if (inputs.simulatedAverageOutcome < inputs.initialCapital) signals.push({ type: 'warn', text: 'Capital erosion possible under severe market cycles' });
  if (inputs.fragilityIndicator === 'Fragile' || inputs.fragilityIndicator === 'Critical') signals.push({ type: 'warn', text: 'Structural reinforcement recommended' });

  if (inputs.maximumDrawdownPct <= 30) signals.push({ type: 'ok', text: 'Capital structure absorbs moderate volatility' });
  if (withdrawalPct <= 4) signals.push({ type: 'ok', text: 'Withdrawal structure remains sustainable' });

  return signals;
}

/** Key Takeaways: 3–5 concise insights derived from the simulation. */
export function getKeyTakeaways(inputs: AdvisoryInputs): string[] {
  const {
    tier,
    fragilityIndicator,
    simulatedAverageOutcome,
    initialCapital,
    withdrawalAmount,
    timeHorizonYears,
    maximumDrawdownPct,
  } = inputs;
  const withdrawalPct = initialCapital > 0 ? (withdrawalAmount / initialCapital) * 100 : 0;
  const takeaways: string[] = [];

  if (tier === 'Critical' || tier === 'Weak') {
    takeaways.push('Capital structure shows material vulnerability under stress.');
  } else if (tier === 'Moderate') {
    takeaways.push('Capital structure demonstrates moderate resilience with scope for improvement.');
  }

  if (withdrawalAmount > 0) {
    takeaways.push('Withdrawal pressure increases fragility over longer horizons.');
  }
  if (maximumDrawdownPct > 25) {
    takeaways.push('Drawdown exposure increases during severe volatility cycles.');
  }
  if (simulatedAverageOutcome >= initialCapital) {
    takeaways.push('Median outcomes suggest capital preservation or growth under the assumed return range.');
  } else {
    takeaways.push('Simulated average below initial capital indicates erosion risk under current assumptions.');
  }
  takeaways.push(`The ${timeHorizonYears}-year horizon and return assumptions drive the dispersion of outcomes.`);

  return takeaways.slice(0, 5);
}

/** Recommended Adjustments: 3–4 actionable recommendations. Low scores → reinforcement; high → optimization. */
export function getRecommendedAdjustments(inputs: AdvisoryInputs): string[] {
  const { tier, fragilityIndicator, withdrawalAmount, initialCapital } = inputs;
  const withdrawalPct = initialCapital > 0 ? (withdrawalAmount / initialCapital) * 100 : 0;
  const lowScore = tier === 'Critical' || tier === 'Weak' || fragilityIndicator === 'Fragile' || fragilityIndicator === 'Critical';
  const recs: string[] = [];

  if (lowScore) {
    if (withdrawalPct > 4) recs.push('Reduce withdrawal pressure to improve sustainability.');
    recs.push('Increase capital base to absorb volatility and extend runway.');
    recs.push('Extend investment horizon to allow recovery from drawdowns.');
    recs.push('Consider improving return efficiency within risk tolerance.');
  } else {
    recs.push('Maintain a capital buffer for unexpected stress.');
    recs.push('Revisit assumptions if circumstances change.');
    if (withdrawalPct > 5) recs.push('Monitor withdrawal rate relative to portfolio performance.');
    recs.push('Optimize allocation for long-term resilience.');
  }

  return recs.slice(0, 4);
}
