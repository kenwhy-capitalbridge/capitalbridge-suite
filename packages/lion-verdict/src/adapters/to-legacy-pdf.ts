import type { LionVerdict } from "../verdict";

/**
 * MIGRATION RULE (NON-NEGOTIABLE)
 *
 * - @cb/lion-verdict is the ONLY source of truth for Lion status, signals, and reasoning.
 * - advisory-graph MUST NOT compute its own Lion verdict.
 * - advisory-graph is a presentation adapter only.
 *
 * Same input MUST always produce the same Lion verdict across:
 * - API
 * - UI
 * - PDF
 */

export type LegacyPdfLion = {
  scoreAndStatusLine: string;
  narrativeQuote: string;
  summary: string;
  whyThisIsHappening: string;
  systemState: string;
  nextActions: string[];
};

function statusLabel(status: LionVerdict["lion_status"]): string {
  return status.replace(/_/g, " ");
}

function buildSummaryString(verdict: LionVerdict): string {
  return verdict.core.what_is_happening;
}

function buildDetailsString(verdict: LionVerdict): string {
  return verdict.guidance_codes.join("\n");
}

export function toLegacyPdfLion(verdict: LionVerdict): LegacyPdfLion {
  if (!verdict?.lion_status) {
    throw new Error("Lion verdict missing - canonical pipeline not used");
  }

  return {
    scoreAndStatusLine: `Lion status: ${statusLabel(verdict.lion_status)}`,
    narrativeQuote: verdict.headline,
    summary: buildSummaryString(verdict),
    whyThisIsHappening: verdict.core.what_will_happen,
    systemState: buildDetailsString(verdict),
    nextActions: verdict.action_codes,
  };
}
