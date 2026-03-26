/**
 * Lion's Verdict Engine — SINGLE SOURCE OF TRUTH
 *
 * Owns: score (0–100), status tier, fragility, narrative blocks, strategic options,
 * capital-unlock guidance, scenario actions, priority actions, and "if you do nothing".
 * Apps adapt domain state into LionStressAdvisoryInputs / health / forever inputs; they must not
 * re-score or re-tier elsewhere.
 */

import type {
  ForeverLionInputs,
  LionFragilityLevel,
  LionHealthVariables,
  LionScoreTier,
  LionStressAdvisoryInputs,
  LionVerdictOutput,
  MicroSignal,
  VerdictNarrative,
} from './types';

const LION_OPENING: Record<LionScoreTier, string> = {
  Critical: 'The lion roars. The structure cannot bear the load.',
  Weak: 'The lion warns. The structure shows visible strain.',
  Moderate: 'The lion watches. The structure stands but pressure remains.',
  Strong: 'The lion stands firm. The structure holds its ground.',
  'Very Strong': 'The lion reigns. The structure is fortified and resilient.',
};

const KEYWORDS: Record<LionScoreTier, string[]> = {
  Critical: ['fragile', 'unsustainable', 'structural failure', 'capital depletion risk', 'high instability'],
  Weak: ['strain', 'structural pressure', 'vulnerability', 'reinforcement required'],
  Moderate: ['balanced structure', 'moderate resilience', 'volatility exposure', 'reinforcement opportunity'],
  Strong: ['stable', 'durable', 'resilient', 'well structured'],
  'Very Strong': ['robust', 'fortified', 'structurally sound', 'exceptional durability'],
};

/** Map Monte Carlo resilience score (roughly −100…+100) to display 0–100. */
export function stressScoreToDisplay0to100(capitalResilienceScore: number): number {
  const v = 50 + capitalResilienceScore / 2;
  return Math.round(Math.min(100, Math.max(0, v)));
}

function tierOrder(t: LionScoreTier): number {
  const o: Record<LionScoreTier, number> = {
    Critical: 0,
    Weak: 1,
    Moderate: 2,
    Strong: 3,
    'Very Strong': 4,
  };
  return o[t];
}

/** Health risk tier 1 (best) … 5 (worst) → Lion tier + base score. */
export function healthTierToLion(tier: 1 | 2 | 3 | 4 | 5): { status: LionScoreTier; score0to100: number } {
  const map: Record<number, { status: LionScoreTier; score0to100: number }> = {
    1: { status: 'Very Strong', score0to100: 92 },
    2: { status: 'Strong', score0to100: 78 },
    3: { status: 'Moderate', score0to100: 55 },
    4: { status: 'Weak', score0to100: 34 },
    5: { status: 'Critical', score0to100: 14 },
  };
  return map[tier] ?? map[3];
}

function defaultFragilityForTier(t: LionScoreTier): LionFragilityLevel {
  if (t === 'Critical') return 'Critical';
  if (t === 'Weak') return 'Fragile';
  if (t === 'Moderate') return 'Vulnerable';
  if (t === 'Strong') return 'Watchful';
  return 'Stable';
}

function strategicOptionsFor(
  tier: LionScoreTier,
  fragile: boolean,
  withdrawalHigh: boolean,
): string[] {
  const base: string[] = [
    'Re-test assumptions with a lower expected return and higher inflation to stress the plan.',
    'Model a phased reduction in withdrawals or lifestyle spend over 12–24 months.',
    'Evaluate whether additional capital or deferred draws improves runway without changing risk tolerance.',
  ];
  if (tierOrder(tier) <= tierOrder('Strong')) {
    return [
      'Maintain documented assumptions and review annually or after major life events.',
      'Keep a liquidity buffer sized for 12–24 months of core spending outside volatile assets.',
      'Optionally explore modest capital unlock only after confirming sustainable withdrawal coverage.',
    ];
  }
  if (withdrawalHigh) {
    base.unshift('Treat withdrawal rate as the primary lever: small cuts compound into large runway gains.');
  }
  if (fragile) {
    base.push('Prioritise survival of capital over optimisation until fragility improves.');
  }
  return base.slice(0, 5);
}

function capitalUnlockGuidanceFor(tier: LionScoreTier, withdrawalHigh: boolean): string[] {
  if (tierOrder(tier) >= tierOrder('Moderate')) {
    return [
      'Capital unlock (refinance, line of credit, or asset-backed liquidity) should follow a sustainable income proof, not replace it.',
      'Any unlock should leave post-debt service coverage consistent with your stress-tested plan.',
    ];
  }
  return [
    'Defer structural leverage or large liquidity events until withdrawal pressure and drawdown risk are contained.',
    'If unlock is still required, cap proceeds to what preserves at least 12 months of stress-tested coverage.',
    withdrawalHigh
      ? 'Pair any unlock with a written plan to reduce withdrawals within two review cycles.'
      : 'Pair any unlock with explicit triggers to stop drawing if coverage falls below your minimum threshold.',
  ];
}

function scenarioActionsFor(withdrawalHigh: boolean, drawdownHigh: boolean, avgBelowStart: boolean): string[] {
  const a: string[] = ['Run the model again after changing only one variable (return, inflation, or withdrawal).'];
  if (avgBelowStart) a.push('Compare median vs worst-case paths to see erosion timing, not just averages.');
  if (drawdownHigh) a.push('Add a “deep drawdown” scenario (−35% to −45% first three years) if not already modelled.');
  if (withdrawalHigh) a.push('Scenario: hold returns flat and reduce withdrawals 10%; note the runway delta.');
  return a.slice(0, 5);
}

function priorityActionsFromStress(
  tier: LionScoreTier,
  fragilityIndicator: LionFragilityLevel,
  withdrawalPct: number,
): string[] {
  const low =
    tier === 'Critical' ||
    tier === 'Weak' ||
    fragilityIndicator === 'Fragile' ||
    fragilityIndicator === 'Critical';
  const recs: string[] = [];
  if (low) {
    if (withdrawalPct > 4) recs.push('Reduce withdrawal pressure to improve sustainability.');
    recs.push('Increase capital base to absorb volatility and extend runway.');
    recs.push('Extend investment horizon to allow recovery from drawdowns.');
    recs.push('Review return assumptions with an advisor; avoid chasing yield to fix a structural gap.');
  } else {
    recs.push('Maintain a capital buffer for unexpected stress.');
    recs.push('Revisit assumptions if circumstances change.');
    if (withdrawalPct > 5) recs.push('Monitor withdrawal rate relative to portfolio performance.');
    recs.push('Optimise allocation for long-term resilience within your risk tolerance.');
  }
  return recs.slice(0, 5);
}

function ifYouDoNothingStress(tier: LionScoreTier, fragile: boolean, avgBelowStart: boolean): string {
  if (tier === 'Critical' || fragile) {
    return 'If you do nothing, erosion and stress paths are likely to dominate: runway shortens, drawdowns hurt more, and optional goals may become unreachable. The lion is asking for at least one lever—capital, time, return realism, or spending—to move within the next review cycle.';
  }
  if (tier === 'Weak' || tier === 'Moderate') {
    return 'If you do nothing, the structure may hold in base cases but remain exposed to sequence and inflation risk. Small shocks could push you into reactive decisions; incremental reinforcement now is cheaper than emergency repair later.';
  }
  if (avgBelowStart) {
    return 'If you do nothing while average outcomes sit below starting capital, you are implicitly accepting a slow grind on principal in unfavourable paths. That may be tolerable only if other assets or income backstop the gap.';
  }
  return 'If you do nothing, a well-tested structure can remain sound—but assumptions drift, taxes change, and health and markets move. Calendar an annual check even when the score looks strong.';
}

function buildCoreNarrativeStress(
  inputs: LionStressAdvisoryInputs,
  formatMoney: (n: number) => string,
): Pick<
  LionVerdictOutput,
  'interpretation' | 'outcomeSummary' | 'riskExplanation' | 'advisoryRecommendation'
> {
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

  const keywords = KEYWORDS[tier] ?? KEYWORDS.Moderate;
  const avgBelowStart = simulatedAverageOutcome < initialCapital;
  const drawdownHigh = maximumDrawdownPct > 40;
  const withdrawalPct = initialCapital > 0 ? (withdrawalAmount / initialCapital) * 100 : 0;
  const withdrawalHigh = withdrawalPct > 6;
  const fragileOrCritical = fragilityIndicator === 'Fragile' || fragilityIndicator === 'Critical';

  const interpretation = `Your Lion Structural Score is ${stressScoreToDisplay0to100(capitalResilienceScore)} / 100 (${tier}). The score reflects ${keywords[0] ?? 'risk'} in the current capital structure over the ${timeHorizonYears}-year horizon.`;

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
  const riskExplanation =
    riskParts.length > 0 ? riskParts.join(' ') : 'Risks are within typical bounds for the chosen assumptions.';

  let advisoryRecommendation: string;
  if (tier === 'Critical' || fragileOrCritical) {
    advisoryRecommendation =
      'Recommend structural reinforcement: reduce withdrawals, extend the horizon, or add capital. Consider reviewing the plan with an advisor.';
  } else if (tier === 'Weak') {
    advisoryRecommendation =
      'Reinforcement is advised: lowering withdrawal pressure or increasing capital allocation could improve long-term resilience.';
  } else if (tier === 'Moderate') {
    advisoryRecommendation =
      'Moderate resilience suggests scope to improve: reducing withdrawal pressure or adding capital could strengthen the structure.';
  } else {
    advisoryRecommendation =
      'The structure appears well positioned. Maintain a buffer for unexpected stress and revisit assumptions if circumstances change.';
  }

  return { interpretation, outcomeSummary, riskExplanation, advisoryRecommendation };
}

export function runLionVerdictEngineStress(
  inputs: LionStressAdvisoryInputs,
  formatMoney: (n: number) => string,
): LionVerdictOutput {
  const opening = LION_OPENING[inputs.tier] ?? LION_OPENING.Moderate;
  const score0to100 = stressScoreToDisplay0to100(inputs.capitalResilienceScore);
  const withdrawalPct = inputs.initialCapital > 0 ? (inputs.withdrawalAmount / inputs.initialCapital) * 100 : 0;
  const withdrawalHigh = withdrawalPct > 6;
  const drawdownHigh = inputs.maximumDrawdownPct > 40;
  const avgBelowStart = inputs.simulatedAverageOutcome < inputs.initialCapital;
  const fragile =
    inputs.fragilityIndicator === 'Fragile' ||
    inputs.fragilityIndicator === 'Critical' ||
    inputs.tier === 'Critical' ||
    inputs.tier === 'Weak';

  const core = buildCoreNarrativeStress(inputs, formatMoney);
  const strategicOptions = strategicOptionsFor(inputs.tier, fragile, withdrawalHigh);
  const capitalUnlockGuidance = capitalUnlockGuidanceFor(inputs.tier, withdrawalHigh);
  const scenarioActions = scenarioActionsFor(withdrawalHigh, drawdownHigh, avgBelowStart);
  const priorityActions = priorityActionsFromStress(inputs.tier, inputs.fragilityIndicator, withdrawalPct);
  const ifYouDoNothing = ifYouDoNothingStress(inputs.tier, fragile, avgBelowStart);

  const fullNarrative = [
    core.interpretation,
    core.outcomeSummary,
    core.riskExplanation,
    core.advisoryRecommendation,
    `Strategic options: ${strategicOptions[0]}`,
    `If you do nothing: ${ifYouDoNothing}`,
  ].join(' ');

  return {
    score0to100,
    status: inputs.tier,
    fragility: inputs.fragilityIndicator,
    opening,
    ...core,
    strategicOptions,
    capitalUnlockGuidance,
    scenarioActions,
    priorityActions,
    ifYouDoNothing,
    fullNarrative,
  };
}

export function toVerdictNarrative(o: LionVerdictOutput): VerdictNarrative {
  return {
    opening: o.opening,
    interpretation: o.interpretation,
    outcomeSummary: o.outcomeSummary,
    riskExplanation: o.riskExplanation,
    advisoryRecommendation: o.advisoryRecommendation,
    fullNarrative: o.fullNarrative,
  };
}

export function generateLionsVerdict(
  inputs: LionStressAdvisoryInputs,
  formatMoney: (n: number) => string,
): VerdictNarrative {
  return toVerdictNarrative(runLionVerdictEngineStress(inputs, formatMoney));
}

export function getLionOpening(tier: LionScoreTier): string {
  return LION_OPENING[tier] ?? LION_OPENING.Moderate;
}

export function getMicroDiagnosticSignals(inputs: LionStressAdvisoryInputs): MicroSignal[] {
  const signals: MicroSignal[] = [];
  const withdrawalPct = inputs.initialCapital > 0 ? (inputs.withdrawalAmount / inputs.initialCapital) * 100 : 0;

  if (withdrawalPct > 6) signals.push({ type: 'warn', text: 'Withdrawal pressure is high relative to capital base' });
  if (inputs.maximumDrawdownPct > 40) signals.push({ type: 'warn', text: 'Drawdown risk exceeds safe thresholds' });
  if (inputs.simulatedAverageOutcome < inputs.initialCapital)
    signals.push({ type: 'warn', text: 'Capital erosion possible under severe market cycles' });
  if (inputs.fragilityIndicator === 'Fragile' || inputs.fragilityIndicator === 'Critical')
    signals.push({ type: 'warn', text: 'Structural reinforcement recommended' });

  if (inputs.maximumDrawdownPct <= 30) signals.push({ type: 'ok', text: 'Capital structure absorbs moderate volatility' });
  if (withdrawalPct <= 4) signals.push({ type: 'ok', text: 'Withdrawal structure remains sustainable' });

  return signals;
}

export function getKeyTakeaways(inputs: LionStressAdvisoryInputs): string[] {
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

  if (fragilityIndicator === 'Fragile' || fragilityIndicator === 'Critical') {
    takeaways.push('Fragility indicator is elevated—prioritise reinforcement over optimisation.');
  }

  return takeaways.slice(0, 5);
}

export function getRecommendedAdjustments(inputs: LionStressAdvisoryInputs): string[] {
  return runLionVerdictEngineStress(inputs, () => '').priorityActions.slice(0, 4);
}

function replaceVars(text: string, vars: LionHealthVariables): string {
  return text
    .replaceAll('{withdrawal}', vars.withdrawal ?? '')
    .replaceAll('{desiredCapital}', vars.desiredCapital ?? '')
    .replaceAll('{horizon}', vars.horizon)
    .replaceAll('{runway}', vars.runway ?? '')
    .replaceAll('{expectedReturn}', vars.expectedReturn)
    .replaceAll('{estimatedReturn}', vars.estimatedReturn ?? vars.expectedReturn);
}

/** Capital Health: deterministic narrative from tier + mode (no random picks). */
export function runLionVerdictEngineCapitalHealth(
  mode: 'withdrawal' | 'growth',
  tier: 1 | 2 | 3 | 4 | 5,
  vars: LionHealthVariables,
): LionVerdictOutput {
  const { status, score0to100 } = healthTierToLion(tier);
  const opening = LION_OPENING[status];
  const fragility = defaultFragilityForTier(status);

  const w = mode === 'withdrawal';
  const interpretation = w
    ? replaceVars(
        `Lion Structural Score ${score0to100} / 100 (${status}). Withdrawal mode: target income ${vars.withdrawal ?? '—'} over ${vars.horizon} years at ${vars.expectedReturn} expected return.`,
        vars,
      )
    : replaceVars(
        `Lion Structural Score ${score0to100} / 100 (${status}). Growth mode: target capital ${vars.desiredCapital ?? '—'} over ${vars.horizon} years at ${vars.expectedReturn} expected return.`,
        vars,
      );

  const outcomeSummary = w
    ? replaceVars(
        `Runway context: ${vars.runway ? `approximately ${vars.runway}` : 'horizon-limited'} with the stated withdrawal and return assumptions.`,
        vars,
      )
    : replaceVars(`Path to desired capital is evaluated against ${vars.horizon} years and ${vars.expectedReturn} returns.`, vars);

  const riskExplanation =
    status === 'Critical' || status === 'Weak'
      ? 'Income or goal pressure is high relative to the modelled structure; small assumption changes can move outcomes quickly.'
      : status === 'Moderate'
        ? 'The structure balances income or growth targets with moderate margin for shocks.'
        : 'Under base assumptions, the structure retains meaningful buffer against typical volatility.';

  const advisoryRecommendation =
    status === 'Critical' || status === 'Weak'
      ? replaceVars(
          'Reinforce with one lever soon: lower withdrawal or target, add capital, extend horizon, or revisit return assumptions.',
          vars,
        )
      : replaceVars('Maintain discipline; optional top-ups or prudent return assumptions deepen resilience.', vars);

  const withdrawalHigh = w && (vars.withdrawal?.length ?? 0) > 0 && (status === 'Weak' || status === 'Critical');
  const strategicOptions = strategicOptionsFor(status, status === 'Critical' || status === 'Weak', !!withdrawalHigh);
  const capitalUnlockGuidance = capitalUnlockGuidanceFor(status, !!withdrawalHigh);
  const scenarioActions = [
    w
      ? 'Toggle inflation adjustment and compare runway wording and chart depletion.'
      : 'Stress-test with −1% to −2% return vs base to see goal feasibility.',
    'Change one input at a time and record the score tier before/after.',
  ];
  const priorityActions =
    status === 'Critical' || status === 'Weak'
      ? [
          replaceVars('Align withdrawals or target capital with sustainable return band ({expectedReturn}).', vars),
          'Add capital or extend horizon before increasing lifestyle draw.',
          'Document minimum buffer policy (months of spend in liquid assets).',
        ]
      : [
          'Keep assumptions updated after tax, health, or career changes.',
          replaceVars('Revisit if realised returns diverge from {expectedReturn} for multiple years.', vars),
        ];

  const ifYouDoNothing =
    status === 'Critical' || status === 'Weak'
      ? 'If you do nothing, the model suggests rising probability that withdrawals or the growth goal outpace what the capital base can sustain.'
      : 'If you do nothing, a sound base case can still drift as markets and spending change—schedule at least an annual review.';

  const fullNarrative = [interpretation, outcomeSummary, riskExplanation, advisoryRecommendation, ifYouDoNothing].join(
    ' ',
  );

  return {
    score0to100,
    status,
    fragility,
    opening,
    interpretation,
    outcomeSummary,
    riskExplanation,
    advisoryRecommendation,
    strategicOptions,
    capitalUnlockGuidance,
    scenarioActions,
    priorityActions,
    ifYouDoNothing,
    fullNarrative,
  };
}

/** Multi-paragraph export for PDFs / legacy Health copy (opening + body + tagline). */
export function capitalHealthVerdictExportText(
  mode: 'withdrawal' | 'growth',
  tier: 1 | 2 | 3 | 4 | 5,
  vars: LionHealthVariables,
): string {
  const o = runLionVerdictEngineCapitalHealth(mode, tier, vars);
  return [
    o.opening,
    o.interpretation,
    o.outcomeSummary,
    o.riskExplanation,
    o.advisoryRecommendation,
    ...o.priorityActions.map((p) => `• ${p}`),
    o.ifYouDoNothing,
    'Strength Behind Every Structure.',
  ].join('\n\n');
}

export function runLionVerdictEngineForever(
  input: ForeverLionInputs,
  formatMoney: (n: number) => string,
): LionVerdictOutput {
  let status: LionScoreTier;
  let score0to100: number;

  if (input.isSustainable && input.gap <= 0) {
    status = 'Very Strong';
    score0to100 = Math.min(98, 85 + Math.round(input.progressPercent / 20));
  } else if (input.isSustainable) {
    status = 'Strong';
    score0to100 = Math.min(88, 70 + Math.round(input.progressPercent / 25));
  } else if (input.progressPercent >= 70) {
    status = 'Moderate';
    score0to100 = 52;
  } else if (input.progressPercent >= 40) {
    status = 'Weak';
    score0to100 = 32;
  } else {
    status = 'Critical';
    score0to100 = 14;
  }

  const opening = LION_OPENING[status];
  const fragility = defaultFragilityForTier(status);
  const interpretation = `Lion Structural Score ${score0to100} / 100 (${status}). Forever Income view: ${input.runwayLabel}; lifestyle load ${formatMoney(input.annualExpense)} per year vs capital base ${formatMoney(input.currentAssets)}.`;

  const outcomeSummary = input.isSustainable
    ? `Under current assumptions, the structure supports the lifestyle target with ${formatMoney(input.capitalNeeded)} capital needed vs ${formatMoney(input.currentAssets)} available.`
    : `The model indicates a gap: approximately ${formatMoney(Math.max(0, input.gap))} separates current assets from the capital implied by your settings.`;

  const riskExplanation =
    input.realReturnRate < 2
      ? 'Real return after inflation is thin; small negative surprises hit sustainability quickly.'
      : input.realReturnRate < 4
        ? 'Real return is moderate; discipline on spending and assumptions matters.'
        : 'Real return assumption provides some cushion, but sequence risk still matters early in retirement.';

  const advisoryRecommendation = input.isSustainable
    ? 'Maintain liquidity, revisit property debt assumptions, and keep family contribution logic explicit in reviews.'
    : 'Prioritise closing the gap: lower spend, raise contributions, extend earning years, or adjust return assumptions with professional input.';

  const strategicOptions = strategicOptionsFor(status, status === 'Critical' || status === 'Weak', !input.isSustainable);
  const capitalUnlockGuidance = capitalUnlockGuidanceFor(status, !input.isSustainable);
  const scenarioActions = [
    'Model −1% / +1% real return bands around your base case.',
    'Stress-test higher property rates or shorter amortisation if debt is material.',
  ];
  const priorityActions = input.isSustainable
    ? ['Document your “minimum viable lifestyle” spend.', 'Set a review trigger if assets fall 15% from today’s level.']
    : [
        `Close the capital gap (${formatMoney(Math.max(0, input.gap))}) by lowering annual spend, raising contributions, or adjusting return assumptions.`,
        'Increase documented family contribution or earned income in the model if applicable.',
        'Recheck property loan rate and horizon—they dominate cash drag in many paths.',
      ];

  const ifYouDoNothing = ifYouDoNothingStress(status, status === 'Critical' || status === 'Weak', !input.isSustainable);

  const fullNarrative = [interpretation, outcomeSummary, riskExplanation, advisoryRecommendation, ifYouDoNothing].join(
    ' ',
  );

  return {
    score0to100,
    status,
    fragility,
    opening,
    interpretation,
    outcomeSummary,
    riskExplanation,
    advisoryRecommendation,
    strategicOptions,
    capitalUnlockGuidance,
    scenarioActions,
    priorityActions,
    ifYouDoNothing,
    fullNarrative,
  };
}
