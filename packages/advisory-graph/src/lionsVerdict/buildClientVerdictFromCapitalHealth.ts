/**
 * Client Lion's Verdict JSON for Capital Health — single score from `runLionVerdictEngineCapitalHealth` + public band gate.
 */

import type { LionHealthVariables } from './types';
import type {
  LionClientCapitalUnlockDecision,
  LionVerdictClientReport,
} from './clientVerdictTypes';
import {
  formatLionPublicStatusLabel,
  lionPublicStatusFromScore0to100,
  lionStrongEligibilityFromHealthTier,
} from './lionScoreMapping';
import { runLionVerdictEngineCapitalHealth } from './engine';

export type CapitalHealthClientVerdictInputs = {
  mode: 'withdrawal' | 'growth';
  tier: 1 | 2 | 3 | 4 | 5;
  vars: LionHealthVariables;
  startingCapital: number;
  targetMonthlyIncome: number;
  targetFutureCapital: number;
  passiveIncomeMonthly: number;
  nominalCapitalAtHorizon: number;
  coveragePct: number;
};

export type BuildCapitalHealthClientVerdictOptions = {
  formatCurrency: (n: number) => string;
};

function strategicOptionsFromEngine(engine: ReturnType<typeof runLionVerdictEngineCapitalHealth>): LionVerdictClientReport['strategic_options'] {
  const s = engine.strategicOptions;
  return [
    {
      type: 'CONSERVATIVE',
      action: s[0] ?? 'Lower withdrawal or capital target before increasing risk.',
      impact: 'Reduces structural pressure on the base',
      trade_off: 'Lifestyle or goal trade-offs',
    },
    {
      type: 'BALANCED',
      action: s[1] ?? 'Revisit return, horizon, and inflation assumptions with discipline.',
      impact: 'More realistic targets reduce surprise decisions',
      trade_off: 'Takes time and honest inputs',
    },
    {
      type: 'AGGRESSIVE',
      action: s[2] ?? 'Add capital or extend earning years if buffers are thin.',
      impact: 'Can close gaps faster when executed safely',
      trade_off: 'Liquidity or complexity',
    },
  ];
}

function scenarioFromEngine(engine: ReturnType<typeof runLionVerdictEngineCapitalHealth>): LionVerdictClientReport['scenario_actions'] {
  const [a, b] = engine.scenarioActions;
  return {
    bull: a ?? 'Model slightly higher returns to see how coverage or the goal buffer changes.',
    base: b ?? a ?? 'Hold assumptions flat and rerun after any material life or market change.',
    bear: 'Stress lower returns or higher spending to see when the plan moves into reactive territory.',
  };
}

export function buildLionVerdictClientReportFromCapitalHealth(
  input: CapitalHealthClientVerdictInputs,
  options: BuildCapitalHealthClientVerdictOptions,
): LionVerdictClientReport {
  const fmt = options.formatCurrency;
  const engine = runLionVerdictEngineCapitalHealth(input.mode, input.tier, input.vars);
  const status = lionPublicStatusFromScore0to100(
    engine.score0to100,
    lionStrongEligibilityFromHealthTier(input.tier, input.mode, input.vars),
  );
  const publicLabel = formatLionPublicStatusLabel(status);

  const goal_gap: LionVerdictClientReport['goal_gap'] =
    input.mode === 'withdrawal'
      ? {
          desired_monthly_income: Math.max(0, input.targetMonthlyIncome),
          current_sustainable_income: Math.max(0, input.passiveIncomeMonthly),
          monthly_gap: Math.max(0, input.targetMonthlyIncome) - Math.max(0, input.passiveIncomeMonthly),
          target_capital_required: 0,
          summary: `Target draw is ${fmt(Math.max(0, input.targetMonthlyIncome))} per month; modeled sustainable income is ${fmt(Math.max(0, input.passiveIncomeMonthly))} per month (${input.coveragePct.toFixed(1)}% coverage vs target).`,
        }
      : {
          desired_monthly_income: 0,
          current_sustainable_income: 0,
          monthly_gap: 0,
          target_capital_required: Math.max(0, input.targetFutureCapital),
          summary: `Growth mode: desired capital at horizon is ${fmt(Math.max(0, input.targetFutureCapital))}; projected nominal capital is ${fmt(Math.max(0, input.nominalCapitalAtHorizon))}. Monthly income gap fields are not used in this mode.`,
        };

  const progress: LionVerdictClientReport['progress'] =
    input.mode === 'withdrawal'
      ? {
          current_capital: Math.max(0, input.startingCapital),
          target_capital: 0,
          progress_percentage: Math.min(100, Math.max(0, Math.round(input.coveragePct))),
          summary: `Starting capital is ${fmt(Math.max(0, input.startingCapital))}; income coverage versus the stated target is about ${input.coveragePct.toFixed(1)}%.`,
        }
      : (() => {
          const tgt = Math.max(0, input.targetFutureCapital);
          const proj = Math.max(0, input.nominalCapitalAtHorizon);
          const pct = tgt > 0 ? Math.min(100, Math.round((proj / tgt) * 100)) : 0;
          return {
            current_capital: proj,
            target_capital: tgt,
            progress_percentage: pct,
            summary: `Projected capital at horizon is ${fmt(proj)} versus target ${fmt(tgt)} (${pct}% of target).`,
          };
        })();

  const verdictSummary = `${engine.opening} ${engine.outcomeSummary}`.replace(/\s+/g, ' ').trim();

  const strengths: string[] = [
    `Lion score ${engine.score0to100} / 100 (${publicLabel})`,
    input.mode === 'withdrawal'
      ? `Plan coverage versus target income: ${input.coveragePct.toFixed(1)}%`
      : `Progress toward stated capital goal at horizon: ${progress.progress_percentage}%`,
    engine.strategicOptions[0] ?? 'Review assumptions regularly after major life or market events.',
  ];

  const risks: string[] = [engine.riskExplanation];
  if (input.mode === 'withdrawal' && input.coveragePct < 100) {
    risks.push('Coverage is below 100% of target draw — shocks or assumption drift can shorten runway.');
  }
  if (input.mode === 'growth' && progress.progress_percentage < 100) {
    risks.push('Projected capital sits below the stated horizon target on these assumptions.');
  }
  risks.push(engine.advisoryRecommendation);
  const risksTrimmed = risks.slice(0, 4);

  let unlockDecision: LionClientCapitalUnlockDecision = 'NEUTRAL';
  if (status === 'NOT_SUSTAINABLE' || status === 'AT_RISK') unlockDecision = 'WORSENS';
  else if (status === 'STRONG') unlockDecision = 'IMPROVES';

  const unlockSummary =
    engine.capitalUnlockGuidance.length > 0
      ? engine.capitalUnlockGuidance.join(' ')
      : 'Treat any capital unlock as conditional on sustainable coverage after all costs.';

  return {
    verdict: {
      status,
      score: engine.score0to100,
      summary: verdictSummary,
    },
    strengths,
    risks: risksTrimmed,
    goal_gap,
    progress,
    strategic_options: strategicOptionsFromEngine(engine),
    capital_unlock: {
      available: status !== 'NOT_SUSTAINABLE',
      amount_unlockable: 0,
      new_monthly_commitment: 0,
      expected_return: 0,
      net_impact: 0,
      decision: unlockDecision,
      summary: unlockSummary,
    },
    scenario_actions: scenarioFromEngine(engine),
    priority_actions:
      engine.priorityActions.length >= 3
        ? engine.priorityActions.slice(0, 5)
        : [
            ...engine.priorityActions,
            'Re-run after changing only one major assumption at a time',
            'Document minimum liquidity you will not invest',
          ].slice(0, 5),
    do_nothing_outcome: engine.ifYouDoNothing,
    closing_line: 'Strength Behind Every Structure — keep assumptions visible and rerun after material changes.',
  };
}
