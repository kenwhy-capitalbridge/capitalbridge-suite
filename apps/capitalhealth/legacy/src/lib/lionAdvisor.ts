/**
 * Lion Intelligence Engine — dynamic advisory generator for THE LION'S VERDICT.
 * Produces varied advisory language using user inputs and tier.
 */

export type LionVariables = {
  withdrawal?: string;
  desiredCapital?: string;
  horizon: string;
  runway?: string;
  expectedReturn: string;
  estimatedReturn?: string;
};

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function replaceVars(text: string, vars: LionVariables): string {
  return text
    .replaceAll('{withdrawal}', vars.withdrawal ?? '')
    .replaceAll('{desiredCapital}', vars.desiredCapital ?? '')
    .replaceAll('{horizon}', vars.horizon)
    .replaceAll('{runway}', vars.runway ?? '')
    .replaceAll('{expectedReturn}', vars.expectedReturn)
    .replaceAll('{estimatedReturn}', vars.estimatedReturn ?? '');
}

export type AdvisoryBlock = {
  opening: string[];
  insight: string[];
  philosophy: string[];
  guidance: string[];
  closing: string[];
};

export type AdvisoryMode = Record<1 | 2 | 3 | 4 | 5, AdvisoryBlock>;

const withdrawalTier1: AdvisoryBlock = {
  opening: [
    'The lion rests. The structure holds.',
    'The lion is still. Income is carried by returns.',
    'The lion surveys a structure built to last.',
  ],
  insight: [
    'A withdrawal of {withdrawal} across {horizon} years is fully supported by an expected return of {expectedReturn}.',
    'Your capital runway extends beyond the horizon; the lion sees no strain.',
    'With {withdrawal} and {expectedReturn} returns, the foundation remains solid.',
  ],
  philosophy: [
    'The best structures outlive the builder. Capital that sustains income does both.',
    'Strength is not speed. It is endurance under pressure.',
    'Wise builders reinforce before cracks appear.',
  ],
  guidance: [
    'Maintain discipline. Optional top-ups or modestly higher returns can deepen resilience.',
    'The structure is sound. Consider locking in gains or diversifying only with care.',
    'Capital preserved is capital that can compound or cushion later.',
  ],
  closing: [
    'The ground is firm. Walk with confidence.',
    'Structures last longest when pressure is managed early.',
    'Strength grows from balance, not speed.',
  ],
};

const withdrawalTier2: AdvisoryBlock = {
  opening: [
    'The lion stands steady. The load is well borne.',
    'The lion watches the balance between income and time.',
    'The lion notes strength with limited buffer.',
  ],
  insight: [
    'A withdrawal of {withdrawal} over {horizon} years is sustainable with an expected return of {expectedReturn}.',
    'With {withdrawal} withdrawn monthly and {expectedReturn} returns, the structure holds but has little margin.',
    'Your runway of about {runway} years suggests one pillar could be strengthened.',
  ],
  philosophy: [
    'Consumers ask what they can afford monthly. Investors ask what their capital can sustain annually.',
    'A small buffer today can prevent a large shortfall tomorrow.',
    'Wealth grows when capital survives longer than the person using it.',
  ],
  guidance: [
    'Strengthen one pillar — slightly higher returns, more time, or additional capital — to add durability.',
    'A modest increase in top-ups or a trim in withdrawals can extend the structure.',
    'Disciplined structures rarely fail suddenly. They weaken slowly when ignored.',
  ],
  closing: [
    'The load is bearable. Do not add to it.',
    'Balance holds. Preserve it.',
    'Strength grows from balance, not speed.',
  ],
};

const withdrawalTier3: AdvisoryBlock = {
  opening: [
    'The lion studies your structure carefully.',
    'The lion pauses, measuring strength against time.',
    'The lion observes the balance between income and endurance.',
  ],
  insight: [
    'A withdrawal of {withdrawal} across {horizon} years approaches the limits supported by an expected return of {expectedReturn}.',
    'With {withdrawal} withdrawn monthly and an expected return of {expectedReturn}, the structure begins to feel pressure.',
    'At the current pace, your capital runway of about {runway} years reveals where strain begins to form.',
  ],
  philosophy: [
    'Consumers ask what they can afford monthly. Investors ask what their capital can sustain annually.',
    'Capital behaves like fire. Controlled, it powers the engine. Neglected, it consumes the structure.',
    'Wealth grows when capital survives longer than the person using it.',
  ],
  guidance: [
    'A modest adjustment may restore balance — slightly reduced withdrawals, stronger returns, or additional capital.',
    "Reinforcing one pillar — time, return, or capital — can extend the structure's endurance.",
    'Disciplined structures rarely fail suddenly. They weaken slowly when ignored.',
  ],
  closing: [
    'Wise builders reinforce before cracks appear.',
    "Structures last longest when pressure is managed early.",
    'Strength grows from balance, not speed.',
  ],
};

const withdrawalTier4: AdvisoryBlock = {
  opening: [
    'The lion signals caution. Strain is visible.',
    'The lion shifts. The ground feels uncertain.',
    'The lion sees pressure on the structure.',
  ],
  insight: [
    'A withdrawal of {withdrawal} over {horizon} years is not fully supported by {expectedReturn} returns.',
    'With a runway of about {runway} years, the structure risks depletion before the horizon.',
    'At current settings, capital may not sustain {withdrawal} for the full {horizon} years.',
  ],
  philosophy: [
    'Income that exceeds what capital can sustain will consume the structure.',
    'Hope is not a strategy. Adjust before depletion forces your hand.',
    'The lion warns before the fall.',
  ],
  guidance: [
    'Reduce withdrawals, add capital or top-ups, or improve returns to restore stability.',
    'One meaningful change — lower income target, more capital, or higher return — can shift the outcome.',
    'Act now to avoid forced cuts later.',
  ],
  closing: [
    'Reinforce before the ground gives.',
    'Caution today preserves options tomorrow.',
    'Walk with confidence.',
  ],
};

const withdrawalTier5: AdvisoryBlock = {
  opening: [
    'The lion warns. Reinforce before strain.',
    'The lion rises. The structure is under threat.',
    'The lion sees depletion on the path.',
  ],
  insight: [
    'A withdrawal of {withdrawal} with {expectedReturn} returns over {horizon} years is highly unsustainable.',
    'Your runway of about {runway} years leaves little room for error or market shock.',
    'At this pace, capital will deplete well before the horizon.',
  ],
  philosophy: [
    'Survival comes first. Income that destroys capital destroys future income.',
    'A structure without pillars will fail. Rebuild the footing first.',
    'The lion speaks when the den is at risk.',
  ],
  guidance: [
    'Substantial reductions in withdrawals and/or material increases in capital or returns are required.',
    'Consider a lower income target, a shorter horizon, or a different return assumption.',
    'The structure requires meaningful reinforcement before it can bear the load.',
  ],
  closing: [
    'Act decisively. The path ahead is clear.',
    'Reinforce now, or the structure may not hold.',
    'Walk with confidence.',
  ],
};

const growthTier1: AdvisoryBlock = {
  opening: [
    'The lion rests. The ground is firm.',
    'The lion is still. The target is in sight.',
    'The lion sees a path to the goal.',
  ],
  insight: [
    'With {estimatedReturn} expected return and {horizon} years, you are on course to reach {desiredCapital}.',
    'The structure holds; capital is growing toward the target.',
    'At the current pace, the horizon goal is achievable.',
  ],
  philosophy: [
    'On course is better than off course. Maintain discipline and avoid unnecessary strain.',
    'The best growth is sustainable growth.',
    'Strength is not speed. It is endurance.',
  ],
  guidance: [
    'Stay the course. Optional top-ups can accelerate; avoid overreaching.',
    'The structure is sound. Consider locking in discipline rather than chasing return.',
    'Capital that compounds steadily outlasts capital that swings.',
  ],
  closing: [
    'The ground is firm. Walk with confidence.',
    'On target. Hold the line.',
    'Walk with confidence.',
  ],
};

const growthTier2: AdvisoryBlock = {
  opening: [
    'The lion stands watch. The structure is sound.',
    'The lion observes healthy progress toward the goal.',
    'The lion notes a well-positioned path.',
  ],
  insight: [
    'With {estimatedReturn} and {horizon} years, you are well positioned to approach {desiredCapital}.',
    'Healthy buffers support the target. Small lifts can add resilience.',
    'The runway to goal is clear with limited margin.',
  ],
  philosophy: [
    'Well positioned is not guaranteed. Small lifts compound into strength.',
    'Time, return, and capital work together. Improve one and the rest follow.',
    'Wealth grows when the structure is sound.',
  ],
  guidance: [
    'Small lifts in top-ups, returns, or time will add resilience.',
    'Consider modestly increasing contributions or extending the horizon to lock in the target.',
    'One pillar strengthened can reduce risk without changing the goal.',
  ],
  closing: [
    'The structure is sound. Keep building.',
    'Balance holds. Preserve it.',
    'Walk with confidence.',
  ],
};

const growthTier3: AdvisoryBlock = {
  opening: [
    'The lion is alert. Balance holds for now.',
    'The lion watches the gap between here and the goal.',
    'The lion measures progress against the horizon.',
  ],
  insight: [
    'With {estimatedReturn} over {horizon} years, reaching {desiredCapital} is workable but exposed.',
    'The path to goal exists but has little buffer. A shortfall is possible.',
    'At current settings, the target is within reach but not assured.',
  ],
  philosophy: [
    'Workable but exposed is a signal to reinforce, not to relax.',
    'Modest increases in top-ups or return can bridge the gap.',
    'Capital that almost reaches the goal needs one more pillar.',
  ],
  guidance: [
    'Modest increases in top-ups or return, or a longer horizon, can bridge the gap.',
    'Reinforcing one pillar — time, return, or capital — can secure the outcome.',
    'Disciplined structures rarely fail suddenly. They weaken slowly when ignored.',
  ],
  closing: [
    'Balance holds for now. Strengthen it.',
    'A small step can close the gap.',
    'Walk with confidence.',
  ],
};

const growthTier4: AdvisoryBlock = {
  opening: [
    'The lion shifts. The ground begins to give.',
    'The lion signals that the goal is off target.',
    'The lion sees strain on the path to {desiredCapital}.',
  ],
  insight: [
    'With {estimatedReturn} and {horizon} years, {desiredCapital} is off target.',
    'The structure needs reinforcement to reach the goal.',
    'At the current pace, the horizon may end before the target is reached.',
  ],
  philosophy: [
    'Off target is not lost. Reinforce the structure and recalibrate.',
    'Higher top-ups, an extended horizon, or improved returns can shift the outcome.',
    'The lion speaks when the path is uncertain.',
  ],
  guidance: [
    'Reinforce the structure with higher top-ups, an extended horizon, or improved returns.',
    'One meaningful change can put the goal back in reach.',
    'Act now to avoid a larger gap later.',
  ],
  closing: [
    'Reinforce before the gap widens.',
    'The ground can be steadied.',
    'Walk with confidence.',
  ],
};

const growthTier5: AdvisoryBlock = {
  opening: [
    'The lion rises. Survival comes first.',
    'The lion warns. The goal is far from reach.',
    'The lion sees the structure at risk.',
  ],
  insight: [
    'With {estimatedReturn} over {horizon} years, {desiredCapital} is significantly off target.',
    'The structure requires meaningful reinforcement to approach the goal.',
    'At current settings, the path to target is not viable.',
  ],
  philosophy: [
    'Survival comes first. A goal that destroys the plan is no goal.',
    'Meaningful reinforcement — more capital, more time, or lower target — can restore the path.',
    'The lion speaks when the den is at risk.',
  ],
  guidance: [
    'Raise top-ups, extend horizon, or improve returns materially. Or recalibrate the target.',
    'The structure requires meaningful reinforcement before it can bear the load.',
    'Consider a more achievable target or a longer horizon.',
  ],
  closing: [
    'Act decisively. The path ahead is clear.',
    'Reinforce now, or the goal may slip away.',
    'Walk with confidence.',
  ],
};

export const LION_ADVISORY: { withdrawal: AdvisoryMode; growth: AdvisoryMode } = {
  withdrawal: {
    1: withdrawalTier1,
    2: withdrawalTier2,
    3: withdrawalTier3,
    4: withdrawalTier4,
    5: withdrawalTier5,
  },
  growth: {
    1: growthTier1,
    2: growthTier2,
    3: growthTier3,
    4: growthTier4,
    5: growthTier5,
  },
};

export function generateLionVerdict(
  mode: 'withdrawal' | 'growth',
  tier: 1 | 2 | 3 | 4 | 5,
  vars: LionVariables
): string {
  const block = LION_ADVISORY[mode][tier];
  const opening = pick(block.opening);
  const insight = pick(block.insight);
  const philosophy = pick(block.philosophy);
  const guidance = pick(block.guidance);
  const closing = pick(block.closing);
  const text = [
    opening,
    replaceVars(insight, vars),
    philosophy,
    guidance,
    closing,
    'Strength Behind Every Structure.',
  ].join('\n\n');
  return replaceVars(text, vars);
}
