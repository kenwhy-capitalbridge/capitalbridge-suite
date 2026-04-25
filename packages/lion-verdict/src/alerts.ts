import type { LionStatus, ModelSignalBand } from "./arbitration";
import type { ExecutionActionDraft } from "./execution-actions";
import type { LionVerdict } from "./verdict";

export type LionAlertSeverity = "info" | "watch" | "warning" | "critical";

export type LionAlertTriggerType =
  | "status_change"
  | "signal_deterioration"
  | "invalid_preconditions";

export type LionAlertDraft = {
  previous_status: LionStatus;
  current_status: LionStatus;
  severity: LionAlertSeverity;
  trigger_type: LionAlertTriggerType;
  title: string;
  message: string;
  reason: string[];
  dominant_model: string | null;
  required_actions: ExecutionActionDraft[];
};

const BAND_ORDER: ModelSignalBand[] = [
  "FAILED",
  "WEAK",
  "TIGHT",
  "ADEQUATE",
  "STRONG",
];

function mapSeverity(status: LionStatus): LionAlertSeverity {
  switch (status) {
    case "STRONG":
      return "info";
    case "STABLE":
      return "watch";
    case "FRAGILE":
    case "AT_RISK":
      return "warning";
    case "NOT_SUSTAINABLE":
      return "critical";
  }
}

function isWorsening(
  previous: LionVerdict["meta"]["signals"],
  next: LionVerdict["meta"]["signals"]
): boolean {
  return (["coverage", "buffer", "resilience"] as const).some(
    (signal) =>
      BAND_ORDER.indexOf(next[signal]) < BAND_ORDER.indexOf(previous[signal])
  );
}

function buildTitle(status: LionStatus, triggerType: LionAlertTriggerType): string {
  if (triggerType === "invalid_preconditions") {
    return "System cannot evaluate your structure.";
  }

  switch (status) {
    case "NOT_SUSTAINABLE":
      return "Your capital structure has failed.";
    case "AT_RISK":
      return "Your structure is at risk.";
    case "FRAGILE":
      return "Your structure is fragile.";
    case "STABLE":
      return "Your structure has weakened to stable.";
    case "STRONG":
      return "Your structure has strengthened.";
  }
}

function buildMessage(verdict: LionVerdict): string {
  return `${verdict.core.what_is_happening} ${verdict.core.what_must_be_done}`;
}

export function generateLionAlert(
  previous: LionVerdict | null,
  next: LionVerdict,
  requiredActions: ExecutionActionDraft[] = []
): LionAlertDraft | null {
  if (!previous) {
    return null;
  }

  let triggerType: LionAlertTriggerType | null = null;

  if (previous.lion_status !== next.lion_status) {
    triggerType = "status_change";
  } else if (isWorsening(previous.meta.signals, next.meta.signals)) {
    triggerType = "signal_deterioration";
  } else if (next.meta.reason.length > 0) {
    triggerType = "invalid_preconditions";
  }

  if (!triggerType) {
    return null;
  }

  const severity =
    triggerType === "invalid_preconditions"
      ? "warning"
      : mapSeverity(next.lion_status);

  return {
    previous_status: previous.lion_status,
    current_status: next.lion_status,
    severity,
    trigger_type: triggerType,
    title: buildTitle(next.lion_status, triggerType),
    message: buildMessage(next),
    reason: next.meta.reason,
    dominant_model: next.meta.dominant_model,
    required_actions: requiredActions,
  };
}
