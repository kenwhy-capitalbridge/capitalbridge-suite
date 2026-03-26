/**
 * Builds the client-facing Lion’s Verdict JSON from Capital Stress advisory inputs.
 * Public status and score are derived only from the technical resilience index (monotone mapping).
 */

import type { LionStressAdvisoryInputs } from './types';
import type {
  LionClientCapitalUnlockDecision,
  LionClientGoalGap,
  LionClientVerdictStatus,
  LionVerdictClientReport,
} from './clientVerdictTypes';
import {
  type LionStressGoalStrongSnapshot,
  lionPublicStatusFromScore0to100,
  lionStrongEligibilityFromStressInputs,
  technicalResilienceToLion0to100,
} from './lionScoreMapping';

/** Optional monthly income + annual return % to populate goal_gap / progress (stress model). */
export type ClientVerdictGoalContext = {
  desiredMonthlyIncome?: number | null;
  expectedAnnualReturnPct?: number | null;
};

export type BuildClientVerdictOptions = {
  /** e.g. (n) => `RM ${...}` — required for currency in strengths copy */
  formatCurrency: (n: number) => string;
  goalContext?: ClientVerdictGoalContext;
};

const CLIENT_STATUS_RANK: Record<LionClientVerdictStatus, number> = {
  NOT_SUSTAINABLE: 1,
  AT_RISK: 2,
  FRAGILE: 3,
  STABLE: 4,
  STRONG: 5,
};

/** Pick the stricter (more risk-forward) client label — lower rank = worse. */
export function pickStricterClientVerdictStatus(
  a: LionClientVerdictStatus,
  b: LionClientVerdictStatus,
): LionClientVerdictStatus {
  return CLIENT_STATUS_RANK[a] <= CLIENT_STATUS_RANK[b] ? a : b;
}

/** @deprecated Prefer `lionPublicStatusFromScore0to100` with goal snapshot for STRONG gate. */
export function resolveClientVerdictStatusForStress(
  inputs: LionStressAdvisoryInputs,
  score0to100: number,
): LionClientVerdictStatus {
  return lionPublicStatusFromScore0to100(score0to100, lionStrongEligibilityFromStressInputs(inputs));
}

/** @deprecated Use `lionPublicStatusFromScore0to100` after mapping technical score. */
export function clientVerdictStatusFromStress(_inputs: LionStressAdvisoryInputs): LionClientVerdictStatus {
  return 'STABLE';
}

export function clientVerdictStatusFromScore0to100(score: number): LionClientVerdictStatus {
  return lionPublicStatusFromScore0to100(score);
}

function verdictSummary(status: LionClientVerdictStatus, avgBelowStart: boolean): string {
  switch (status) {
    case 'NOT_SUSTAINABLE':
      return 'Your structure is under heavy strain; prompt adjustment is needed to avoid lasting damage.';
    case 'AT_RISK':
      return avgBelowStart
        ? 'Your structure is under clear pressure; capital is declining on average and needs a plan.'
        : 'Your structure shows meaningful strain; reinforcement is needed before shocks bite harder.';
    case 'FRAGILE':
      return avgBelowStart
        ? 'Your structure is stable for now, but your capital is slowly declining and needs adjustment.'
        : 'Your structure is stable for now, but shocks could still pressure your plan without reinforcement.';
    case 'STABLE':
      return avgBelowStart
        ? 'Your structure is stable for now, but your capital is slowly declining and needs adjustment.'
        : 'Your structure is reasonably balanced; small refinements can still improve long-term resilience.';
    case 'STRONG':
      return 'Your capital structure is in a solid position for the assumptions you have chosen.';
    default:
      return 'Check assumptions and stress paths to confirm sustainability.';
  }
}

function closingLine(status: LionClientVerdictStatus, avgBelowStart: boolean): string {
  switch (status) {
    case 'NOT_SUSTAINABLE':
      return 'Act on at least one lever soon. Delay raises the cost of recovery.';
    case 'AT_RISK':
      return 'Address the weakest lever now—small moves early beat forced moves later.';
    case 'FRAGILE':
      return avgBelowStart
        ? 'You are stable today, but without adjustments, your position will weaken over time.'
        : 'You are stable today, but keep assumptions honest so pressure does not build unnoticed.';
    case 'STABLE':
      return avgBelowStart
        ? 'You are stable today, but without adjustments, your position will weaken over time.'
        : 'Small, early moves tend to outperform late, forced ones—pick one improvement to test.';
    case 'STRONG':
      return 'Stay disciplined: strength today depends on tomorrow’s assumptions staying realistic.';
    default:
      return 'Review when markets, taxes, or spending shift in a material way.';
  }
}

function progressTailByStatus(status: LionClientVerdictStatus): string {
  if (status === 'NOT_SUSTAINABLE') {
    return 'The path needs change before long-term comfort improves.';
  }
  if (status === 'AT_RISK') {
    return 'There is limited margin—tighten structure before stress paths dominate.';
  }
  if (status === 'FRAGILE' || status === 'STABLE') {
    return 'Structure is not yet set for long-term stability.';
  }
  return 'Alignment with your assumptions looks solid. Keep reviews on a calendar.';
}

function buildGoalGap(
  inputs: LionStressAdvisoryInputs,
  fmt: (n: number) => string,
  goalContext?: ClientVerdictGoalContext,
): LionClientGoalGap {
  const desiredRaw = goalContext?.desiredMonthlyIncome;
  const desired_monthly_income =
    desiredRaw != null && Number.isFinite(desiredRaw) && desiredRaw > 0 ? desiredRaw : 0;

  const retRaw = goalContext?.expectedAnnualReturnPct;
  const expectedReturn =
    retRaw != null && Number.isFinite(retRaw) && retRaw > 0 ? retRaw : null;

  let current_sustainable_income = 0;
  if (expectedReturn != null && inputs.initialCapital > 0) {
    current_sustainable_income = (inputs.initialCapital * (expectedReturn / 100)) / 12;
  } else if (inputs.withdrawalAmount > 0) {
    current_sustainable_income = inputs.withdrawalAmount / 12;
  }

  let target_capital_required = 0;
  if (desired_monthly_income > 0 && expectedReturn != null) {
    const annualDesired = desired_monthly_income * 12;
    target_capital_required = annualDesired / (expectedReturn / 100);
  }

  let monthly_gap = 0;
  if (desired_monthly_income > 0 && current_sustainable_income > 0) {
    monthly_gap = desired_monthly_income - current_sustainable_income;
  }

  let summary: string;
  if (desired_monthly_income <= 0) {
    summary =
      'Target capital cannot be calculated without a defined income goal. Set a target monthly income in goal settings to estimate gap and target capital.';
    if (current_sustainable_income > 0) {
      if (expectedReturn != null) {
        summary += ` At your stated return, about ${fmt(current_sustainable_income)} per month is implied before tax.`;
      } else {
        summary += ` Your modeled withdrawal is about ${fmt(current_sustainable_income)} per month.`;
      }
    }
  } else if (current_sustainable_income <= 0) {
    summary =
      'Your sustainable income cannot be determined from current inputs (need capital and return, or withdrawal). Numeric gap fields are set to zero until inputs are complete.';
  } else {
    summary = `Your target spend is ${fmt(desired_monthly_income)} per month. We estimate about ${fmt(current_sustainable_income)} per month from current inputs.`;
    if (monthly_gap > 0) {
      summary += ` That leaves about ${fmt(monthly_gap)} per month to close.`;
    } else {
      summary += ' On these estimates, spending fits what capital can support.';
    }
    if (target_capital_required > 0) {
      summary += ` Illustrative target capital is about ${fmt(target_capital_required)} at this return.`;
    }
  }

  return {
    desired_monthly_income,
    current_sustainable_income,
    monthly_gap,
    target_capital_required,
    summary,
  };
}

function buildProgress(
  inputs: LionStressAdvisoryInputs,
  fmt: (n: number) => string,
  status: LionClientVerdictStatus,
  goalGap: LionClientGoalGap,
): LionVerdictClientReport['progress'] {
  const target_capital = goalGap.target_capital_required;
  let progress_percentage = 0;
  if (target_capital > 0) {
    progress_percentage = Math.min(100, Math.round((inputs.initialCapital / target_capital) * 100));
  }

  const tail = progressTailByStatus(status);
  let summary: string;
  if (target_capital > 0) {
    summary = `You hold ${fmt(inputs.initialCapital)} toward an illustrative target of ${fmt(target_capital)} (${progress_percentage}% of target). ${tail}`;
  } else {
    summary = `${fmt(inputs.initialCapital)} is your capital base in this view. Progress toward a dollar target is not shown until a target capital can be calculated from your income goal and return assumption. ${tail}`;
  }

  return {
    current_capital: inputs.initialCapital,
    target_capital,
    progress_percentage,
    summary,
  };
}

function strategicOptionsTriple(): LionVerdictClientReport['strategic_options'] {
  return [
    {
      type: 'CONSERVATIVE',
      action: 'Reduce your withdrawal rate slightly',
      impact: 'This slows capital decline and improves long-term stability',
      trade_off: 'You may need to adjust your lifestyle',
    },
    {
      type: 'BALANCED',
      action: 'Improve your investment allocation to increase returns',
      impact: 'This strengthens your capital and reduces long-term pressure',
      trade_off: 'Requires portfolio adjustments and discipline',
    },
    {
      type: 'AGGRESSIVE',
      action: 'Use leverage or capital unlock to increase investment exposure',
      impact: 'Strong markets lift returns. Weak markets deepen losses.',
      trade_off: 'This increases your financial risk if markets weaken',
    },
  ];
}

function capitalUnlockBlock(
  inputs: LionStressAdvisoryInputs,
  status: LionClientVerdictStatus,
  expectedReturnPct: number,
): LionVerdictClientReport['capital_unlock'] {
  let decision: LionClientCapitalUnlockDecision = 'NEUTRAL';
  if (status === 'NOT_SUSTAINABLE' || status === 'AT_RISK') decision = 'WORSENS';
  else if (status === 'STRONG') decision = 'IMPROVES';

  let summary: string;
  if (decision === 'WORSENS') {
    summary =
      'Borrowing or unlocking here is likely to worsen pressure. Fix withdrawals and runway first.';
  } else if (decision === 'IMPROVES') {
    summary =
      'Unlocking can help only if the post-loan plan still passes your stress test and costs stay controlled.';
  } else {
    summary =
      'Only proceed if expected return clearly exceeds borrowing cost and your net monthly position improves.';
  }

  return {
    available: inputs.tier !== 'Critical',
    amount_unlockable: 0,
    new_monthly_commitment: 0,
    expected_return: expectedReturnPct,
    net_impact: 0,
    decision,
    summary,
  };
}

function scenarioActions(): LionVerdictClientReport['scenario_actions'] {
  return {
    bull: 'Use strong markets to grow capital and ease future pressure.',
    base: 'Stay consistent. Watch whether capital keeps declining.',
    bear: 'Cut withdrawals early and keep capital to limit long-term harm.',
  };
}

function doNothingOutcome(status: LionClientVerdictStatus, avgBelowStart: boolean): string {
  if (
    avgBelowStart &&
    (status === 'NOT_SUSTAINABLE' || status === 'AT_RISK' || status === 'FRAGILE' || status === 'STABLE')
  ) {
    return 'If nothing changes, capital will keep declining slowly. You risk falling short later.';
  }
  if (status === 'NOT_SUSTAINABLE' || status === 'AT_RISK' || status === 'FRAGILE') {
    return 'If nothing changes, stress paths can dominate and optional goals can slip away.';
  }
  if (status === 'STABLE') {
    return 'If nothing changes, base cases may hold while sequence and inflation risk stay.';
  }
  return 'If nothing changes, a sound plan can still drift as markets, taxes, and spending shift.';
}

function priorityList(_inputs: LionStressAdvisoryInputs, status: LionClientVerdictStatus): string[] {
  const low =
    status === 'NOT_SUSTAINABLE' ||
    status === 'AT_RISK' ||
    status === 'FRAGILE' ||
    status === 'STABLE';
  if (low) {
    return [
      'Review and reduce your withdrawal rate where possible',
      'Improve your investment allocation to lift returns',
      'Avoid new commitments you do not need',
      'Keep a cash buffer for downturns',
      'Review your structure regularly to stop slow decline',
    ];
  }
  return [
    'Keep withdrawal and return assumptions written down',
    'Improve your investment allocation to protect outcomes',
    'Avoid new commitments you do not need',
    'Keep a cash buffer for downturns',
    'Review your structure when markets or taxes move',
  ];
}

function strengthsThree(inputs: LionStressAdvisoryInputs, fmt: (n: number) => string, status: LionClientVerdictStatus): string[] {
  const s: string[] = [
    `You have ${fmt(inputs.initialCapital)} in capital supporting your position`,
    'Your structure holds under normal market conditions',
  ];
  if (status === 'NOT_SUSTAINABLE') {
    s.push('You still have time to act before damage sets in');
  } else if (status === 'AT_RISK' || status === 'FRAGILE' || status === 'STABLE') {
    s.push('Your current risk level is manageable');
  } else {
    s.push('You have meaningful room before stress paths dominate outcomes');
  }
  return s;
}

function risksThree(
  inputs: LionStressAdvisoryInputs,
  avgBelowStart: boolean,
  drawdownHigh: boolean,
  withdrawalHigh: boolean,
): string[] {
  if (avgBelowStart) {
    return [
      'Your capital is gradually decreasing over time',
      'Your structure is sensitive to weaker market returns',
      withdrawalHigh || drawdownHigh || inputs.fragilityIndicator === 'Fragile' || inputs.fragilityIndicator === 'Vulnerable'
        ? 'You have limited buffer if performance drops'
        : 'Size your buffer clearly against your spending',
    ];
  }
  return [
    'Your capital path depends on returns staying near your assumptions',
    'Weaker returns would pressure your structure sooner than averages suggest',
    'You have limited buffer if performance drops',
  ];
}

export function buildLionVerdictClientReportFromStress(
  inputs: LionStressAdvisoryInputs,
  options: BuildClientVerdictOptions,
): LionVerdictClientReport {
  const { formatCurrency: fmt, goalContext } = options;
  const score = technicalResilienceToLion0to100(inputs.capitalResilienceScore);
  const avgBelowStart = inputs.simulatedAverageOutcome < inputs.initialCapital;
  const drawdownHigh = inputs.maximumDrawdownPct > 35;
  const withdrawalPct = inputs.initialCapital > 0 ? (inputs.withdrawalAmount / inputs.initialCapital) * 100 : 0;
  const withdrawalHigh = withdrawalPct > 5.5;

  const retRaw = goalContext?.expectedAnnualReturnPct;
  const expectedReturnPct =
    retRaw != null && Number.isFinite(retRaw) && retRaw > 0 ? retRaw : 0;

  const goal_gap = buildGoalGap(inputs, fmt, goalContext);
  const goalSnapshot: LionStressGoalStrongSnapshot | null =
    goal_gap.desired_monthly_income > 0
      ? {
          hasIncomeGoal: true,
          monthlyGap: goal_gap.monthly_gap,
          targetCapitalRequired: goal_gap.target_capital_required,
        }
      : null;
  const status = lionPublicStatusFromScore0to100(
    score,
    lionStrongEligibilityFromStressInputs(inputs, goalSnapshot ?? undefined),
  );
  const progress = buildProgress(inputs, fmt, status, goal_gap);

  return {
    verdict: {
      status,
      score,
      summary: verdictSummary(status, avgBelowStart),
    },
    strengths: strengthsThree(inputs, fmt, status),
    risks: risksThree(inputs, avgBelowStart, drawdownHigh, withdrawalHigh),
    goal_gap,
    progress,
    strategic_options: strategicOptionsTriple(),
    capital_unlock: capitalUnlockBlock(inputs, status, expectedReturnPct),
    scenario_actions: scenarioActions(),
    priority_actions: priorityList(inputs, status),
    do_nothing_outcome: doNothingOutcome(status, avgBelowStart),
    closing_line: closingLine(status, avgBelowStart),
  };
}

const CLIENT_KEYS = [
  'verdict',
  'strengths',
  'risks',
  'goal_gap',
  'progress',
  'strategic_options',
  'capital_unlock',
  'scenario_actions',
  'priority_actions',
  'do_nothing_outcome',
  'closing_line',
] as const;

const CLIENT_STATUSES: readonly LionClientVerdictStatus[] = [
  'STRONG',
  'STABLE',
  'FRAGILE',
  'AT_RISK',
  'NOT_SUSTAINABLE',
];

export function stringifyLionVerdictClientReportCanonical(r: LionVerdictClientReport): string {
  const o: Record<string, unknown> = {};
  for (const k of CLIENT_KEYS) o[k] = r[k as keyof LionVerdictClientReport];
  return `${JSON.stringify(o, null, 2)}\n`;
}

export function isLionVerdictClientReport(x: unknown): x is LionVerdictClientReport {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  for (const k of CLIENT_KEYS) {
    if (!(k in o)) return false;
  }
  const v = o.verdict as Record<string, unknown> | undefined;
  if (!v || typeof v.status !== 'string' || !CLIENT_STATUSES.includes(v.status as LionClientVerdictStatus)) return false;
  const gg = o.goal_gap as Record<string, unknown> | undefined;
  const pr = o.progress as Record<string, unknown> | undefined;
  const cu = o.capital_unlock as Record<string, unknown> | undefined;
  if (!gg || typeof gg.summary !== 'string') return false;
  if (
    typeof gg.desired_monthly_income !== 'number' ||
    typeof gg.current_sustainable_income !== 'number' ||
    typeof gg.monthly_gap !== 'number' ||
    typeof gg.target_capital_required !== 'number'
  ) {
    return false;
  }
  if (!pr || typeof pr.summary !== 'string') return false;
  if (
    typeof pr.current_capital !== 'number' ||
    typeof pr.target_capital !== 'number' ||
    typeof pr.progress_percentage !== 'number'
  ) {
    return false;
  }
  if (
    !cu ||
    typeof cu.amount_unlockable !== 'number' ||
    typeof cu.new_monthly_commitment !== 'number' ||
    typeof cu.expected_return !== 'number' ||
    typeof cu.net_impact !== 'number'
  ) {
    return false;
  }
  return Object.keys(o).length === CLIENT_KEYS.length;
}
