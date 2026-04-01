import type { Tier } from "./copy";
import type { GetLionVerdictOutput } from "./getLionVerdict";
import { LION_PRESET_DECISION_BOUNDARY, LION_PRESET_STRATEGIC_OPTIONS } from "./lionStructuredPresets";

export type PaidLionNarrativeSection = { label: string; text: string };

export function buildPaidLionSectionModel(copy: GetLionVerdictOutput, tier: Tier): {
  narrative: PaidLionNarrativeSection[];
  options: readonly string[];
  decisionBoundary: string;
} {
  const narrative: PaidLionNarrativeSection[] = [
    { label: "Cash flow", text: copy.narrative.gap },
    { label: "Capital", text: copy.narrative.capital },
    { label: "Sustainability", text: copy.narrative.sustainability },
    { label: "Pressure", text: copy.narrative.pressure },
  ];
  return {
    narrative,
    options: LION_PRESET_STRATEGIC_OPTIONS[tier],
    decisionBoundary: LION_PRESET_DECISION_BOUNDARY[tier],
  };
}
