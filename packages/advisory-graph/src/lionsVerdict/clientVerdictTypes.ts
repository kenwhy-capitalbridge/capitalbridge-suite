/**
 * Client-facing Lion’s Verdict payload (dashboard / API / PDF consumer).
 * Exact top-level keys; numeric fields are always numbers (use 0 when not applicable — see `summary` strings).
 */

import type { LionPublicVerdictStatus } from './lionScoreMapping';

export type LionClientVerdictStatus = LionPublicVerdictStatus;

export type LionClientStrategicOptionType = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';

/** Unlock stance for clients. Prefer IMPROVES / NEUTRAL / WORSENS; legacy values kept for old saved JSON. */
export type LionClientCapitalUnlockDecision =
  | 'IMPROVES'
  | 'NEUTRAL'
  | 'WORSENS'
  | 'AVOID'
  | 'CONDITIONAL'
  | 'FAVOURABLE';

export type LionClientVerdictBlock = {
  status: LionClientVerdictStatus;
  score: number;
  summary: string;
};

export type LionClientGoalGap = {
  desired_monthly_income: number;
  current_sustainable_income: number;
  monthly_gap: number;
  target_capital_required: number;
  /** Plain-English read; explains zeros when metrics are not applicable. */
  summary: string;
};

export type LionClientProgress = {
  current_capital: number;
  target_capital: number;
  progress_percentage: number;
  /** Plain-English read; explains zeros when targets are unknown. */
  summary: string;
};

export type LionClientStrategicOption = {
  type: LionClientStrategicOptionType;
  action: string;
  impact: string;
  trade_off: string;
};

export type LionClientCapitalUnlock = {
  available: boolean;
  amount_unlockable: number;
  new_monthly_commitment: number;
  expected_return: number;
  net_impact: number;
  decision: LionClientCapitalUnlockDecision;
  summary: string;
};

export type LionClientScenarioActions = {
  bull: string;
  base: string;
  bear: string;
};

/** Root object — no additional properties. */
export type LionVerdictClientReport = {
  verdict: LionClientVerdictBlock;
  strengths: string[];
  risks: string[];
  goal_gap: LionClientGoalGap;
  progress: LionClientProgress;
  strategic_options: LionClientStrategicOption[];
  capital_unlock: LionClientCapitalUnlock;
  scenario_actions: LionClientScenarioActions;
  priority_actions: string[];
  do_nothing_outcome: string;
  closing_line: string;
};
