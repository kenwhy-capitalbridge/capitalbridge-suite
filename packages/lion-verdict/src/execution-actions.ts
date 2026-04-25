import type { LionStatus, ModelSignalBand } from "./arbitration";
import type { LionVerdict } from "./verdict";

export type ExecutionActionType =
  | "allocate"
  | "rebalance"
  | "refinance"
  | "de_risk"
  | "increase_income"
  | "reduce_obligation"
  | "redeem"
  | "transfer"
  | "other";

export type ExecutionActionDraft = {
  action_type: ExecutionActionType;
  title: string;
  rationale: string;
  target_effect_metric: string | null;
  recommended_amount: null;
  partner_type: "other_regulated_counterparty";
  status: "draft";
  priority: 1 | 2 | 3 | 4 | 5;
};

type ActionTemplate = Omit<ExecutionActionDraft, "priority" | "status">;

function isWeakOrFailed(signal: ModelSignalBand): boolean {
  return signal === "WEAK" || signal === "FAILED";
}

function isTightOrWorse(signal: ModelSignalBand): boolean {
  return signal === "TIGHT" || signal === "WEAK" || signal === "FAILED";
}

function coverageActions(): ActionTemplate[] {
  return [
    {
      action_type: "increase_income",
      title: "Increase income to restore coverage",
      rationale: "Income is insufficient to meet obligations",
      target_effect_metric: "cashflow_coverage_ratio",
      recommended_amount: null,
      partner_type: "other_regulated_counterparty",
    },
    {
      action_type: "reduce_obligation",
      title: "Reduce recurring obligations",
      rationale: "Obligations exceed sustainable income",
      target_effect_metric: "monthly_surplus",
      recommended_amount: null,
      partner_type: "other_regulated_counterparty",
    },
  ];
}

function bufferActions(): ActionTemplate[] {
  return [
    {
      action_type: "de_risk",
      title: "Increase liquidity buffer",
      rationale: "Insufficient buffer to absorb shocks",
      target_effect_metric: "liquidity_buffer_months",
      recommended_amount: null,
      partner_type: "other_regulated_counterparty",
    },
    {
      action_type: "refinance",
      title: "Restructure liabilities to extend runway",
      rationale: "Current structure compresses liquidity",
      target_effect_metric: "runway_months",
      recommended_amount: null,
      partner_type: "other_regulated_counterparty",
    },
  ];
}

function resilienceActions(): ActionTemplate[] {
  return [
    {
      action_type: "de_risk",
      title: "Reduce exposure to volatile components",
      rationale: "Structure fails under stress conditions",
      target_effect_metric: "resilience_score_0_100",
      recommended_amount: null,
      partner_type: "other_regulated_counterparty",
    },
  ];
}

function preconditionAction(reason: string): ActionTemplate {
  switch (reason) {
    case "no_income_streams":
      return {
        action_type: "increase_income",
        title: "Define at least one income stream",
        rationale: "Income is required for sustainability analysis",
        target_effect_metric: null,
        recommended_amount: null,
        partner_type: "other_regulated_counterparty",
      };
    case "no_obligations":
      return {
        action_type: "reduce_obligation",
        title: "Define recurring obligations",
        rationale: "Obligations are required for coverage analysis",
        target_effect_metric: null,
        recommended_amount: null,
        partner_type: "other_regulated_counterparty",
      };
    case "no_assets":
      return {
        action_type: "allocate",
        title: "Define capital base",
        rationale: "Assets are required to construct a capital structure",
        target_effect_metric: null,
        recommended_amount: null,
        partner_type: "other_regulated_counterparty",
      };
    case "withdrawal_not_defined":
      return {
        action_type: "allocate",
        title: "Define withdrawal strategy",
        rationale: "Withdrawal definition is required for sustainability modeling",
        target_effect_metric: null,
        recommended_amount: null,
        partner_type: "other_regulated_counterparty",
      };
    default:
      return {
        action_type: "other",
        title: "Complete required inputs",
        rationale: "Required inputs are missing for sustainability analysis",
        target_effect_metric: null,
        recommended_amount: null,
        partner_type: "other_regulated_counterparty",
      };
  }
}

function computePriority(
  lionStatus: LionStatus,
  hasInvalidPreconditions: boolean
): ExecutionActionDraft["priority"] {
  if (hasInvalidPreconditions || lionStatus === "NOT_SUSTAINABLE") return 1;
  if (lionStatus === "AT_RISK") return 1;
  if (lionStatus === "FRAGILE") return 2;
  if (lionStatus === "STABLE") return 3;
  return 4;
}

function dedupeActions(actions: ActionTemplate[]): ActionTemplate[] {
  const byKey = new Map<string, ActionTemplate>();

  for (const action of actions) {
    const key = `${action.action_type}:${action.target_effect_metric ?? "none"}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, action);
      continue;
    }

    byKey.set(key, {
      ...existing,
      rationale: Array.from(
        new Set([existing.rationale, action.rationale])
      ).join("; "),
    });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    `${a.action_type}:${a.target_effect_metric ?? ""}`.localeCompare(
      `${b.action_type}:${b.target_effect_metric ?? ""}`
    )
  );
}

export function shouldAutoCreateExecutionActions(verdict: LionVerdict): boolean {
  return (
    verdict.lion_status === "AT_RISK" ||
    verdict.lion_status === "NOT_SUSTAINABLE" ||
    verdict.meta.reason.length > 0
  );
}

export function generateExecutionActions(
  verdict: LionVerdict
): ExecutionActionDraft[] {
  const actions: ActionTemplate[] = [];
  const signals = verdict.meta.signals;

  if (isWeakOrFailed(signals.coverage)) {
    actions.push(...coverageActions());
  }

  if (isTightOrWorse(signals.buffer)) {
    actions.push(...bufferActions());
  }

  if (isWeakOrFailed(signals.resilience)) {
    actions.push(...resilienceActions());
  }

  for (const reason of verdict.meta.reason) {
    actions.push(preconditionAction(reason));
  }

  const priority = computePriority(
    verdict.lion_status,
    verdict.meta.reason.length > 0
  );

  return dedupeActions(actions).map((action) => ({
    ...action,
    priority,
    status: "draft",
  }));
}
