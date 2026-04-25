// =============================================
// LION VERDICT ENGINE (TRUTH -> NARRATIVE)
// =============================================

import type { ArbitrationResult, LionStatus } from "./arbitration";

export type AgreementLevel = "HIGH" | "MEDIUM" | "LOW";
export type SignalSummary = ArbitrationResult["signal_summary"];

export type LionNarrativeCore = {
  what_is_happening: string;
  what_will_happen: string;
  what_must_be_done: string;
};

export type LionVerdict = {
  lion_status: LionStatus;
  agreement_level: AgreementLevel;
  signal_summary: SignalSummary;
  reason: string[];
  headline: string;
  narrative: LionNarrativeCore;
  core: LionNarrativeCore;
  guidance_codes: string[];
  action_codes: string[];
  meta: {
    dominant_model: string | null;
    agreement_level: AgreementLevel;
    signals: SignalSummary;
    reason: string[];
  };
};

const HEADLINES: Record<LionStatus, string[]> = {
  STRONG: [
    "The structure holds. Income is resilient and sufficient.",
    "The system is strong. Capital is working as intended.",
  ],
  STABLE: [
    "The structure holds, but strength is limited.",
    "Income is sufficient, but resilience is not complete.",
  ],
  FRAGILE: [
    "The structure is holding, but under pressure.",
    "The system is fragile. Stability is not assured.",
  ],
  AT_RISK: [
    "The structure is weakening. Risk is emerging.",
    "The system is at risk. Gaps are forming.",
  ],
  NOT_SUSTAINABLE: [
    "The structure cannot hold. Failure is present.",
    "The system is not sustainable in its current form.",
  ],
};

const REASON_ACTION_MAP: Record<string, string> = {
  no_income_streams: "define_income_streams",
  no_obligations: "define_obligations",
  no_assets: "establish_capital_base",
  withdrawal_not_defined: "define_withdrawal_strategy",
  preconditions_not_met: "complete_required_inputs",
};

type SignalKey = "coverage" | "buffer" | "resilience";

function describeSignal(signal: string, type: string): string {
  switch (signal) {
    case "STRONG":
      return `${type} is strong`;
    case "ADEQUATE":
      return `${type} is sufficient`;
    case "TIGHT":
      return `${type} is tight`;
    case "WEAK":
      return `${type} is weak`;
    case "FAILED":
      return `${type} has failed`;
    default:
      return `${type} is unknown`;
  }
}

function hashString(input: string): number {
  let hash = 0;

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function selectHeadline(status: LionStatus, seed: string): string {
  const pool = HEADLINES[status];
  return pool[hashString(seed) % pool.length];
}

function buildWhatIsHappening(arbitration: ArbitrationResult): string {
  if (arbitration.reason.length > 0) {
    return `The system cannot be fully evaluated due to missing or incomplete inputs: ${arbitration.reason.join(
      ", "
    )}.`;
  }

  const { coverage, buffer, resilience } = arbitration.signal_summary;

  return `${[
    describeSignal(coverage, "Coverage"),
    describeSignal(buffer, "Buffer"),
    describeSignal(resilience, "Resilience"),
  ].join(". ")}.`;
}

function buildWhatWillHappen(arbitration: ArbitrationResult): string {
  switch (arbitration.lion_status) {
    case "NOT_SUSTAINABLE":
      return "The current structure will fail without correction.";
    case "AT_RISK":
      return "The structure is likely to deteriorate under current conditions.";
    case "FRAGILE":
      return "The structure may not hold under stress or change.";
    case "STABLE":
      return "The structure will hold under normal conditions but lacks strength.";
    case "STRONG":
      return "The structure will continue to perform reliably.";
  }
}

function actionSentenceFromReason(reason: string): string {
  switch (reason) {
    case "no_income_streams":
      return "Define at least one income stream";
    case "no_obligations":
      return "Define recurring obligations";
    case "no_assets":
      return "Establish a capital base";
    case "withdrawal_not_defined":
      return "Define a withdrawal strategy";
    default:
      return "Complete required inputs";
  }
}

function getWeakestSignal(signals: ArbitrationResult["signal_summary"]): SignalKey {
  const order = ["FAILED", "WEAK", "TIGHT", "ADEQUATE", "STRONG"];

  return (Object.entries(signals) as [SignalKey, string][])
    .sort((a, b) => order.indexOf(a[1]) - order.indexOf(b[1]))[0][0];
}

function buildWhatMustBeDone(arbitration: ArbitrationResult): string {
  if (arbitration.reason.length > 0) {
    return `${arbitration.reason.map(actionSentenceFromReason).join(". ")}.`;
  }

  switch (getWeakestSignal(arbitration.signal_summary)) {
    case "coverage":
      return "You must increase income or reduce obligations.";
    case "buffer":
      return "You must strengthen liquidity and reserves.";
    case "resilience":
      return "You must improve stability under stress conditions.";
  }
}

function applyConfidenceLayer(
  core: LionNarrativeCore,
  agreementLevel: AgreementLevel
): LionNarrativeCore {
  switch (agreementLevel) {
    case "HIGH":
      return core;
    case "MEDIUM":
      return {
        ...core,
        what_is_happening: `Some model results vary, but the direction is consistent. ${core.what_is_happening}`,
        what_will_happen: `Some scenarios are stronger than others. ${core.what_will_happen}`,
      };
    case "LOW":
      return {
        ...core,
        what_is_happening: `The model results disagree in places, which is itself a risk. ${core.what_is_happening}`,
        what_will_happen: `The structure holds under some conditions and weakens under others. ${core.what_will_happen}`,
      };
  }
}

function deriveActions(arbitration: ArbitrationResult): string[] {
  if (arbitration.reason.length > 0) {
    return arbitration.reason
      .map((reason) => REASON_ACTION_MAP[reason] || "general_correction")
      .sort();
  }

  switch (getWeakestSignal(arbitration.signal_summary)) {
    case "coverage":
      return ["increase_income", "reduce_obligations"];
    case "buffer":
      return ["increase_liquidity_buffer", "extend_runway"];
    case "resilience":
      return ["improve_resilience"];
  }
}

function deriveGuidance(arbitration: ArbitrationResult): string[] {
  return [`guidance_${arbitration.lion_status.toLowerCase()}`];
}

export function buildLionVerdict(
  arbitration: ArbitrationResult,
  context: {
    capital_graph_id: string;
    version: number;
    model_key: string;
  }
): LionVerdict {
  const seed = `${context.capital_graph_id}-${context.version}-${context.model_key}`;
  const agreementLevel = arbitration.model_consensus.agreement_level;
  const core = applyConfidenceLayer(
    {
      what_is_happening: buildWhatIsHappening(arbitration),
      what_will_happen: buildWhatWillHappen(arbitration),
      what_must_be_done: buildWhatMustBeDone(arbitration),
    },
    agreementLevel
  );

  return {
    lion_status: arbitration.lion_status,
    agreement_level: agreementLevel,
    signal_summary: arbitration.signal_summary,
    reason: arbitration.reason,
    headline: selectHeadline(arbitration.lion_status, seed),
    narrative: core,
    core,
    guidance_codes: deriveGuidance(arbitration),
    action_codes: deriveActions(arbitration),
    meta: {
      dominant_model: arbitration.dominant_model,
      agreement_level: arbitration.model_consensus.agreement_level,
      signals: arbitration.signal_summary,
      reason: arbitration.reason,
    },
  };
}
