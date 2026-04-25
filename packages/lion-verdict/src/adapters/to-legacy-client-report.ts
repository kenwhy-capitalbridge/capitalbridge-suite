import type { LionStatus } from "../arbitration";
import type { LionVerdict } from "../verdict";

/**
 * Adapter-only bridge for legacy dashboard/API/PDF client report consumers.
 * It preserves the historical report shape while sourcing status and reasoning
 * exclusively from the canonical Lion verdict.
 */

export type LegacyClientStrategicOptionType =
  | "CONSERVATIVE"
  | "BALANCED"
  | "AGGRESSIVE";

export type LegacyClientCapitalUnlockDecision =
  | "IMPROVES"
  | "NEUTRAL"
  | "WORSENS"
  | "AVOID"
  | "CONDITIONAL"
  | "FAVOURABLE";

export type LegacyLionClientReport = {
  verdict: {
    status: LionStatus;
    score: number;
    summary: string;
  };
  strengths: string[];
  risks: string[];
  goal_gap: {
    desired_monthly_income: number;
    current_sustainable_income: number;
    monthly_gap: number;
    target_capital_required: number;
    summary: string;
  };
  progress: {
    current_capital: number;
    target_capital: number;
    progress_percentage: number;
    summary: string;
  };
  strategic_options: Array<{
    type: LegacyClientStrategicOptionType;
    action: string;
    impact: string;
    trade_off: string;
  }>;
  capital_unlock: {
    available: boolean;
    amount_unlockable: number;
    new_monthly_commitment: number;
    expected_return: number;
    net_impact: number;
    decision: LegacyClientCapitalUnlockDecision;
    summary: string;
  };
  scenario_actions: {
    bull: string;
    base: string;
    bear: string;
  };
  priority_actions: string[];
  do_nothing_outcome: string;
  closing_line: string;
};

const DISPLAY_SCORE_BY_STATUS: Record<LionStatus, number> = {
  NOT_SUSTAINABLE: 19,
  AT_RISK: 47,
  FRAGILE: 66,
  STABLE: 83,
  STRONG: 95,
};

function statusToUnlockDecision(status: LionStatus): LegacyClientCapitalUnlockDecision {
  if (status === "NOT_SUSTAINABLE" || status === "AT_RISK") return "WORSENS";
  if (status === "STRONG") return "IMPROVES";
  return "NEUTRAL";
}

export function toLegacyClientReport(verdict: LionVerdict): LegacyLionClientReport {
  if (!verdict?.lion_status) {
    throw new Error("Lion verdict missing - canonical pipeline not used");
  }

  const unlockDecision = statusToUnlockDecision(verdict.lion_status);

  return {
    verdict: {
      status: verdict.lion_status,
      score: DISPLAY_SCORE_BY_STATUS[verdict.lion_status],
      summary: verdict.core.what_is_happening,
    },
    strengths: [verdict.headline],
    risks: [verdict.core.what_will_happen],
    goal_gap: {
      desired_monthly_income: 0,
      current_sustainable_income: 0,
      monthly_gap: 0,
      target_capital_required: 0,
      summary: verdict.core.what_must_be_done,
    },
    progress: {
      current_capital: 0,
      target_capital: 0,
      progress_percentage: 0,
      summary: "Progress metrics remain owned by the model-specific layer.",
    },
    strategic_options: [
      {
        type: "CONSERVATIVE",
        action: verdict.action_codes[0] ?? "Review required actions",
        impact: "Addresses the weakest structural constraint",
        trade_off: "May require changing assumptions or commitments",
      },
      {
        type: "BALANCED",
        action: verdict.action_codes[1] ?? verdict.core.what_must_be_done,
        impact: "Improves structural consistency without changing Lion truth",
        trade_off: "Requires validation against the full capital graph",
      },
      {
        type: "AGGRESSIVE",
        action: verdict.action_codes[2] ?? "Escalate to execution review",
        impact: "Moves faster once required inputs and risks are clear",
        trade_off: "Higher operational complexity",
      },
    ],
    capital_unlock: {
      available: verdict.lion_status !== "NOT_SUSTAINABLE",
      amount_unlockable: 0,
      new_monthly_commitment: 0,
      expected_return: 0,
      net_impact: 0,
      decision: unlockDecision,
      summary:
        unlockDecision === "WORSENS"
          ? "Do not unlock capital while the structure is under material pressure."
          : unlockDecision === "IMPROVES"
            ? "Unlocking can be considered only if it preserves the current strength."
            : "Treat any unlock as conditional on preserving the canonical Lion verdict.",
    },
    scenario_actions: {
      bull: "Validate upside assumptions without changing required actions.",
      base: "Keep the canonical verdict as the active decision state.",
      bear: "Stress the weakest signal before adding complexity.",
    },
    priority_actions: verdict.action_codes,
    do_nothing_outcome: verdict.core.what_will_happen,
    closing_line: "Strength Behind Every Structure - keep the canonical Lion verdict current.",
  };
}
