/**
 * Client Lion’s Verdict JSON for Forever Income — uses `runLionVerdictEngineForever` only (no duplicate scoring).
 * Public status is derived from the engine’s 0–100 score (monotone in technical progress).
 */

import type { ForeverLionInputs, LionVerdictOutput } from './types';
import type {
  LionClientCapitalUnlockDecision,
  LionClientVerdictStatus,
  LionVerdictClientReport,
} from './clientVerdictTypes';
import { lionPublicStatusFromScore0to100, lionStrongEligibilityFromForeverInput } from './lionScoreMapping';
import { runLionVerdictEngineForever } from './engine';

export type BuildForeverClientVerdictOptions = {
  formatCurrency: (n: number) => string;
};

export function parseForeverRunway(runwayLabel: string): { perpetual: boolean; years: number | null } {
  const t = runwayLabel.trim();
  if (/^perpetual$/i.test(t)) return { perpetual: true, years: null };
  const m = /^([\d.]+)\s*years?$/i.exec(t);
  if (m) return { perpetual: false, years: parseFloat(m[1]) };
  return { perpetual: false, years: null };
}

function sanitizeForeverInputForEngine(input: ForeverLionInputs): ForeverLionInputs {
  return {
    ...input,
    capitalNeeded: Number.isFinite(input.capitalNeeded) ? input.capitalNeeded : 0,
  };
}

function isPerpetualRunway(input: ForeverLionInputs): boolean {
  if (input.perpetualRunway === true) return true;
  return /^perpetual$/i.test(input.runwayLabel.trim());
}

function howLongCapitalLastsPlain(input: ForeverLionInputs): string {
  if (isPerpetualRunway(input) && input.isSustainable) {
    return 'At this spending level and return assumption, your capital can last indefinitely. You are not projected to run out.';
  }
  const y = input.runwayYears;
  if (y != null && Number.isFinite(y)) {
    const label = Number.isInteger(y) ? String(y) : y.toFixed(1);
    return `Your capital can support your lifestyle for about ${label} years at your current spending. After that, you could run out unless something changes.`;
  }
  return `Your sustainability horizon shows ${input.runwayLabel}. Review spending, returns, or capital.`;
}

function gapToForeverPlain(input: ForeverLionInputs, fmt: (n: number) => string): string {
  if (!input.isSustainable) {
    return 'Your spending is above what your return assumption can support. You need lower spend, more capital, or higher returns.';
  }
  if (input.gap > 0) {
    return `To sustain this lifestyle long term, you need about ${fmt(input.gap)} more in capital versus the forever target.`;
  }
  return 'On these numbers you meet or exceed the forever capital target.';
}

function foreverVerdictSummary(
  input: ForeverLionInputs,
  fmt: (n: number) => string,
  urgentGap: boolean,
): string {
  const a = howLongCapitalLastsPlain(input);
  const b = gapToForeverPlain(input, fmt);
  const u = urgentGap ? ' The gap is large relative to the target — treat this as urgent.' : '';
  return `${a} ${b}${u}`;
}

function foreverStrategicOptions(): LionVerdictClientReport['strategic_options'] {
  return [
    {
      type: 'CONSERVATIVE',
      action: 'Lower net spending or increase offsets (family income, salary)',
      impact: 'Reduces withdrawals and extends how long capital lasts',
      trade_off: 'You may need to change your lifestyle',
    },
    {
      type: 'BALANCED',
      action: 'Review return and inflation assumptions with a professional',
      impact: 'More realistic targets reduce surprise and bad decisions',
      trade_off: 'Takes time and honest inputs',
    },
    {
      type: 'AGGRESSIVE',
      action: 'Add capital, extend earning years, or unlock property value carefully',
      impact: 'Closes the forever gap faster when done safely',
      trade_off: 'Can mean less liquidity or more complexity',
    },
  ];
}

function foreverCapitalUnlock(
  status: LionClientVerdictStatus,
  nominalReturn: number,
): LionVerdictClientReport['capital_unlock'] {
  let decision: LionClientCapitalUnlockDecision = 'NEUTRAL';
  if (status === 'NOT_SUSTAINABLE' || status === 'AT_RISK' || status === 'FRAGILE') decision = 'WORSENS';
  else if (status === 'STRONG') decision = 'IMPROVES';

  let summary: string;
  if (decision === 'WORSENS') {
    summary =
      'Unlocking or borrowing before the gap is closed is likely to worsen outcomes. Fix the sustainability picture first.';
  } else if (decision === 'IMPROVES') {
    summary =
      'Property or capital unlock can help only if the extra capital clearly improves your forever-income math.';
  } else {
    summary =
      'Only proceed if expected return clearly exceeds borrowing cost and your net monthly position improves.';
  }

  return {
    available: status !== 'NOT_SUSTAINABLE',
    amount_unlockable: 0,
    new_monthly_commitment: 0,
    expected_return: nominalReturn,
    net_impact: 0,
    decision,
    summary,
  };
}

function buildGoalGapForever(
  input: ForeverLionInputs,
  fmt: (n: number) => string,
): LionVerdictClientReport['goal_gap'] {
  const desired_monthly_income = input.annualExpense > 0 ? input.annualExpense / 12 : 0;

  let current_sustainable_income = 0;
  if (input.isSustainable && input.currentAssets > 0 && input.realReturnRate > 0) {
    current_sustainable_income = (input.currentAssets * (input.realReturnRate / 100)) / 12;
  }

  let monthly_gap = 0;
  if (desired_monthly_income > 0 && current_sustainable_income > 0) {
    monthly_gap = desired_monthly_income - current_sustainable_income;
  }

  let target_capital_required = 0;
  if (input.isSustainable && Number.isFinite(input.capitalNeeded) && input.capitalNeeded > 0) {
    target_capital_required = input.capitalNeeded;
  }

  let summary: string;
  if (desired_monthly_income <= 0 || input.annualExpense <= 0) {
    summary =
      'Target capital cannot be calculated without defined annual spending. Numeric gap fields are zero until spending is entered.';
  } else if (current_sustainable_income <= 0) {
    summary = 'Your sustainable income cannot be determined based on current inputs.';
  } else {
    summary = `Your net strategic withdrawal is about ${fmt(desired_monthly_income)} per month. At your real return assumption, capital supports about ${fmt(current_sustainable_income)} per month before tax effects.`;
    if (monthly_gap > 0) {
      summary += ` That is about ${fmt(monthly_gap)} per month above what capital alone supports at this return.`;
    } else {
      summary += ' Spending is within what this return assumption supports on paper.';
    }
    if (target_capital_required > 0) {
      summary += ` Forever capital target is about ${fmt(target_capital_required)}.`;
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

function buildProgressForever(
  input: ForeverLionInputs,
  fmt: (n: number) => string,
  goal: LionVerdictClientReport['goal_gap'],
): LionVerdictClientReport['progress'] {
  const target_capital = goal.target_capital_required;
  let progress_percentage = 0;
  if (target_capital > 0) {
    progress_percentage = Math.min(100, Math.round((input.currentAssets / target_capital) * 100));
  } else if (input.isSustainable && input.progressPercent > 0) {
    progress_percentage = Math.round(input.progressPercent);
  }

  const tail = isPerpetualRunway(input)
    ? 'You are on a path where capital is not expected to run out at this spend.'
    : input.runwayYears != null && input.runwayYears < 20
      ? 'Horizon is under twenty years — prioritise closing the gap or cutting spend.'
      : 'Keep tracking progress toward the forever capital target.';

  let summary: string;
  if (target_capital > 0) {
    summary = `You hold ${fmt(input.currentAssets)} toward a forever target of ${fmt(target_capital)} (${progress_percentage}% of forever target). ${tail}`;
  } else {
    summary = `${fmt(input.currentAssets)} is your total capital in this view. A percentage toward a dollar target is shown only when a forever capital target is available. ${tail}`;
  }

  return {
    current_capital: input.currentAssets,
    target_capital,
    progress_percentage,
    summary,
  };
}

function foreverStrengths(input: ForeverLionInputs, fmt: (n: number) => string): string[] {
  const s: string[] = [
    `You have ${fmt(input.currentAssets)} in total capital available`,
    `Your net strategic withdrawal is about ${fmt(input.annualExpense)} per year`,
  ];
  if (isPerpetualRunway(input) && input.isSustainable) {
    s.push('Your horizon is open-ended at this spend — you are not projected to run out');
  } else {
    s.push(`Your sustainability horizon reads ${input.runwayLabel}`);
  }
  return s;
}

function foreverRisks(input: ForeverLionInputs, urgentGap: boolean, fmt: (n: number) => string): string[] {
  const r: string[] = [];
  if (!input.isSustainable) {
    r.push('Returns after inflation do not support this spending level');
  }
  if (!isPerpetualRunway(input) && input.runwayYears != null && input.runwayYears < 20) {
    r.push('You may run out of capital within twenty years at this spend');
  }
  if (urgentGap) {
    r.push(`The capital gap is large (${fmt(input.gap)} versus target) — acting sooner reduces risk`);
  }
  if (input.realReturnRate < 2) {
    r.push('Your real return assumption is thin; small misses hit sustainability fast');
  }
  if (r.length === 0) {
    r.push('Markets, taxes, or spending can still drift — review assumptions regularly');
  }
  return r.slice(0, 4);
}

function scenarioFromEngine(engine: LionVerdictOutput): LionVerdictClientReport['scenario_actions'] {
  const [a, b] = engine.scenarioActions;
  return {
    bull: a ?? 'Model slightly higher real returns to see how much room you gain.',
    base: 'Keep assumptions steady and rerun after any large life or market change.',
    bear: b ?? 'Model weaker returns to see where you must cut spend or add capital.',
  };
}

export function buildLionVerdictClientReportFromForever(
  input: ForeverLionInputs,
  options: BuildForeverClientVerdictOptions,
): LionVerdictClientReport {
  const { formatCurrency: fmt } = options;
  const safeInput = sanitizeForeverInputForEngine(input);
  const engine = runLionVerdictEngineForever(safeInput, fmt);

  const gapRatio =
    safeInput.isSustainable &&
    Number.isFinite(safeInput.capitalNeeded) &&
    safeInput.capitalNeeded > 0
      ? safeInput.gap / safeInput.capitalNeeded
      : 0;
  const urgentGap = gapRatio > 0.3 && safeInput.gap > 0;

  const status = lionPublicStatusFromScore0to100(
    engine.score0to100,
    lionStrongEligibilityFromForeverInput(safeInput),
  );

  const goal_gap = buildGoalGapForever(safeInput, fmt);
  const progress = buildProgressForever(safeInput, fmt, goal_gap);

  const nominal =
    safeInput.nominalExpectedReturnPct != null && Number.isFinite(safeInput.nominalExpectedReturnPct)
      ? safeInput.nominalExpectedReturnPct
      : 0;

  const priority_actions =
    engine.priorityActions.length >= 4
      ? engine.priorityActions.slice(0, 5)
      : [
          ...engine.priorityActions,
          'Re-run the model after any large change to spending or assets',
          'Write down the minimum lifestyle you could live with if markets weaken',
        ].slice(0, 5);

  return {
    verdict: {
      status,
      score: engine.score0to100,
      summary: foreverVerdictSummary(safeInput, fmt, urgentGap),
    },
    strengths: foreverStrengths(safeInput, fmt),
    risks: foreverRisks(safeInput, urgentGap, fmt),
    goal_gap,
    progress,
    strategic_options: foreverStrategicOptions(),
    capital_unlock: foreverCapitalUnlock(status, nominal),
    scenario_actions: scenarioFromEngine(engine),
    priority_actions,
    do_nothing_outcome: engine.ifYouDoNothing,
    closing_line:
      'What to change: follow the priority list — usually lower spend, add capital, or fix return assumptions first.',
  };
}
