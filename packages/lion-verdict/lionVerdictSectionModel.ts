import type { Tier } from "./copy";
import type { GetLionVerdictOutput } from "./getLionVerdict";
import { LION_PRESET_DECISION_BOUNDARY, LION_PRESET_STRATEGIC_OPTIONS } from "./lionStructuredPresets";

export type PaidLionNarrativeSection = { label: string; text: string };

export function buildPaidLionSectionModel(copy: GetLionVerdictOutput, tier: Tier): {
  narrative: PaidLionNarrativeSection[];
  options: readonly string[];
  decisionBoundary: string;
} {
  const b = copy.guidanceBullets;
  const narrative: PaidLionNarrativeSection[] = [];
  if (b[0]) narrative.push({ label: "Where it stands", text: b[0] });
  if (b[1]) narrative.push({ label: "Time horizon", text: b[1] });
  if (b[2]) narrative.push({ label: "Gap", text: b[2] });
  if (b[3]) narrative.push({ label: "Required return", text: b[3] });
  return {
    narrative,
    options: LION_PRESET_STRATEGIC_OPTIONS[tier],
    decisionBoundary: LION_PRESET_DECISION_BOUNDARY[tier],
  };
}
