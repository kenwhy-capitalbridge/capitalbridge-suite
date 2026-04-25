/**
 * Client Lion’s Verdict JSON for Income Engineering — score from coverage technicals + light sustainability nudge.
 */

import type { LionClientCapitalUnlockDecision, LionVerdictClientReport } from './clientVerdictTypes';
import {
  getLionMigrationConfig,
  inputSignature,
  recordLionMismatch,
  runLionPipeline,
  shouldServeCanonicalLion,
  toLegacyClientReport,
} from '@cb/lion-verdict';
import {
  incomeEngineeringCoverageToLion0to100,
  lionPublicStatusFromScore0to100,
  lionStrongEligibilityFromIncomeEngineering,
} from './lionScoreMapping';

export type IncomeEngineeringSustainabilityStatus = 'green' | 'amber' | 'red' | 'invalid';

export type IncomeEngineeringClientVerdictInputs = {
  medianCoveragePct: number;
  worstMonthCoveragePct: number;
  sustainabilityStatus: IncomeEngineeringSustainabilityStatus;
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  monthlyNetCashflow: number;
  totalCapital: number;
};

export type BuildIncomeEngineeringClientVerdictOptions = {
  formatCurrency: (n: number) => string;
  userId?: string;
};

function incomeEngineeringCanonicalRun(input: IncomeEngineeringClientVerdictInputs) {
  const signature = inputSignature({
    model_key: 'income-engineering-model',
    input,
  });

  return runLionPipeline(
    [
      input.sustainabilityStatus === 'invalid'
        ? {
            model_key: 'income-engineering-model',
            status: 'invalid_preconditions' as const,
            output_normalized: {
              metrics: null,
              reason: ['preconditions_not_met'],
            },
          }
        : {
            model_key: 'income-engineering-model',
            status: 'completed' as const,
            output_normalized: {
              metrics: {
                cashflow_coverage_ratio: String(
                  Math.min(input.medianCoveragePct, input.worstMonthCoveragePct) / 100,
                ),
                income_gap_monthly: String(input.monthlyNetCashflow),
              },
            },
          },
    ],
    {
      capital_graph_id: `income_engineering:${signature}`,
      version: 0,
      model_key: 'income_engineering',
      tier: 'STRATEGIC',
    },
  );
}

function resolveIncomeEngineeringMigrationOutput(args: {
  input: IncomeEngineeringClientVerdictInputs;
  options: BuildIncomeEngineeringClientVerdictOptions;
  legacyOutput: LionVerdictClientReport;
}): LionVerdictClientReport {
  const signature = inputSignature({
    model_key: 'income-engineering-model',
    input: args.input,
  });
  const canonical = incomeEngineeringCanonicalRun(args.input);

  recordLionMismatch({
    model_keys_used: ['income_engineering'],
    legacy_status: args.legacyOutput.verdict.status,
    canonical_status: canonical.verdict.lion_status,
    agreement_level: canonical.verdict.agreement_level,
    canonical_signals: canonical.verdict.signal_summary,
    legacy_summary: args.legacyOutput.verdict.summary,
    reasons: canonical.verdict.reason,
    input_signature: signature,
    legacy_invalid_preconditions: args.input.sustainabilityStatus === 'invalid',
    canonical_invalid_preconditions: canonical.verdict.reason.length > 0,
  });

  const migration = getLionMigrationConfig();

  if (migration.state === 'SHADOW') {
    return args.legacyOutput;
  }

  if (migration.state === 'FULL') {
    return toLegacyClientReport(canonical.verdict) as LionVerdictClientReport;
  }

  if (
    migration.state === 'PARTIAL' &&
    shouldServeCanonicalLion(args.options.userId ?? signature, migration)
  ) {
    return toLegacyClientReport(canonical.verdict) as LionVerdictClientReport;
  }

  return args.legacyOutput;
}

export function buildLionVerdictClientReportFromIncomeEngineering(
  input: IncomeEngineeringClientVerdictInputs,
  options: BuildIncomeEngineeringClientVerdictOptions,
): LionVerdictClientReport {
  const fmt = options.formatCurrency;
  const score = incomeEngineeringCoverageToLion0to100({
    medianCoveragePct: input.medianCoveragePct,
    worstMonthCoveragePct: input.worstMonthCoveragePct,
    sustainabilityStatus: input.sustainabilityStatus,
  });
  const status = lionPublicStatusFromScore0to100(
    score,
    lionStrongEligibilityFromIncomeEngineering({
      monthlyNetCashflow: input.monthlyNetCashflow,
      sustainabilityStatus: input.sustainabilityStatus,
      worstMonthCoveragePct: input.worstMonthCoveragePct,
      medianCoveragePct: input.medianCoveragePct,
    }),
  );

  const desired_monthly_income = Math.max(0, input.totalMonthlyExpenses);
  const current_sustainable_income = Math.max(0, input.totalMonthlyIncome);
  const monthly_gap = desired_monthly_income - current_sustainable_income;
  const target_capital_required = 0;

  let goalSummary: string;
  if (input.sustainabilityStatus === 'invalid') {
    goalSummary =
      'Inputs are outside allowed ranges, so monthly coverage cannot be scored. Fix validation errors and re-run. Numeric gap uses expenses minus income for display only.';
  } else {
    goalSummary = `Monthly expenses are ${fmt(desired_monthly_income)} and recurring income plus modeled investment income is ${fmt(current_sustainable_income)}. Net cashflow is ${fmt(input.monthlyNetCashflow)} per month. Target capital is not estimated in this model — use Capital Health or Forever Income for capital targets.`;
  }

  const progress_percentage =
    desired_monthly_income > 0
      ? Math.min(100, Math.round((current_sustainable_income / desired_monthly_income) * 100))
      : 0;
  const progressSummary = `${fmt(input.totalCapital)} is total capital in this view. Monthly income covers about ${progress_percentage}% of monthly outflows on average; worst-month coverage is ${input.worstMonthCoveragePct.toFixed(1)}%.`;

  const verdictSummary =
    input.sustainabilityStatus === 'invalid'
      ? 'The Income Engineering model cannot produce a score until inputs are within limits. Adjust spending or allocations and try again.'
      : input.monthlyNetCashflow >= 0
        ? `Your monthly structure shows a surplus of ${fmt(input.monthlyNetCashflow)} on average under your assumptions. Median coverage is ${input.medianCoveragePct.toFixed(1)}% and the weakest month is ${input.worstMonthCoveragePct.toFixed(1)}%.`
        : `Your monthly structure shows a deficit of ${fmt(Math.abs(input.monthlyNetCashflow))} on average. Median coverage is ${input.medianCoveragePct.toFixed(1)}% and the weakest month is ${input.worstMonthCoveragePct.toFixed(1)}%.`;

  const strengths: string[] = [
    `Total capital recorded: ${fmt(input.totalCapital)}`,
    `Average monthly coverage of expenses: ${input.medianCoveragePct.toFixed(1)}%`,
  ];
  if (input.sustainabilityStatus === 'green') {
    strengths.push('Sustainability flag is green — income and modeled returns cover obligations in baseline paths');
  } else if (input.sustainabilityStatus !== 'invalid') {
    strengths.push('The model surfaces where margin is thin so you can adjust before stress arrives');
  } else {
    strengths.push('Once inputs validate, you will get a full Lion score and narrative');
  }

  const risks: string[] = [];
  if (input.sustainabilityStatus === 'invalid') {
    risks.push('Invalid inputs hide true risk — normalize figures to see coverage');
  } else {
    if (input.worstMonthCoveragePct < 100) {
      risks.push(`Worst-month coverage is ${input.worstMonthCoveragePct.toFixed(1)}% — shocks can bite in thin months`);
    }
    if (input.sustainabilityStatus === 'amber') {
      risks.push('Amber status means little buffer if income or returns disappoint');
    }
    if (input.sustainabilityStatus === 'red') {
      risks.push('Red status means outflows exceed sustainable inflows on these assumptions');
    }
    if (risks.length === 0) {
      risks.push('Assumptions can still drift — review monthly until buffers are clearly comfortable');
    }
  }

  let unlockDecision: LionClientCapitalUnlockDecision = 'NEUTRAL';
  if (status === 'NOT_SUSTAINABLE' || status === 'AT_RISK') unlockDecision = 'WORSENS';
  else if (status === 'STRONG') unlockDecision = 'IMPROVES';

  const legacyOutput: LionVerdictClientReport = {
    verdict: {
      status,
      score,
      summary: verdictSummary,
    },
    strengths,
    risks: risks.slice(0, 4),
    goal_gap: {
      desired_monthly_income,
      current_sustainable_income,
      monthly_gap,
      target_capital_required,
      summary: goalSummary,
    },
    progress: {
      current_capital: input.totalCapital,
      target_capital: 0,
      progress_percentage,
      summary: progressSummary,
    },
    strategic_options: [
      {
        type: 'CONSERVATIVE',
        action: 'Trim discretionary expenses until worst-month coverage clears 100%',
        impact: 'Raises margin without changing income assumptions',
        trade_off: 'Short-term lifestyle trade-offs',
      },
      {
        type: 'BALANCED',
        action: 'Re-check investment return assumptions and income stability',
        impact: 'More realistic numbers reduce surprise and bad decisions',
        trade_off: 'Takes time and honest inputs',
      },
      {
        type: 'AGGRESSIVE',
        action: 'Add income streams or carefully unlock liquidity only if debt service stays safe',
        impact: 'Can close a structural gap faster when executed with discipline',
        trade_off: 'Higher complexity or leverage risk',
      },
    ],
    capital_unlock: {
      available: input.sustainabilityStatus !== 'invalid' && status !== 'NOT_SUSTAINABLE',
      amount_unlockable: 0,
      new_monthly_commitment: 0,
      expected_return: 0,
      net_impact: 0,
      decision: unlockDecision,
      summary:
        unlockDecision === 'WORSENS'
          ? 'Do not add leverage while monthly coverage is weak — fix cashflow first.'
          : unlockDecision === 'IMPROVES'
            ? 'Unlocking can help only if post-commitment coverage stays clearly above stress-tested minimums.'
            : 'Treat any unlock as conditional on sustainable monthly coverage after all costs.',
    },
    scenario_actions: {
      bull: 'Model higher investment income or bonus income to see how fast coverage improves.',
      base: 'Hold assumptions flat and monitor worst-month coverage monthly.',
      bear: 'Stress lower income or higher loan rates to see when coverage breaks.',
    },
    priority_actions: [
      'Write down minimum monthly outflows vs comfortable outflows',
      'Target worst-month coverage above 100% before increasing discretionary spend',
      'Review investment return assumptions when markets or allocations change',
      'Rebuild emergency liquidity if you draw it down',
      'Re-run after any material income or expense change',
    ],
    do_nothing_outcome:
      input.sustainabilityStatus === 'invalid'
        ? 'Until inputs are valid, you cannot rely on this view for decisions.'
        : input.monthlyNetCashflow < 0
          ? 'If nothing changes, deficits compound and buffers erode — adjust spend, income, or assumptions.'
          : 'If nothing changes, a workable month-to-month picture can still crack if income or returns slip.',
    closing_line: 'Strength Behind Every Structure — keep assumptions visible and rerun after major changes.',
  };

  return resolveIncomeEngineeringMigrationOutput({
    input,
    options,
    legacyOutput,
  });
}
