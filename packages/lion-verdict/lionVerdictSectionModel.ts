import type { Tier } from "./copy";
import type { GetLionVerdictOutput } from "./getLionVerdict";

export type PaidLionNarrativeSection = { label: string; text: string };

export function buildPaidLionSectionModel(copy: GetLionVerdictOutput, tier: Tier): {
  narrative: PaidLionNarrativeSection[];
  decisions: string[];
  headline: string;
  ifDoNothing: string;
} {
  const narrative: PaidLionNarrativeSection[] = [
    { label: "What is happening", text: copy.narrative.whatIsHappening },
    { label: "Why it is happening", text: copy.narrative.whyItIsHappening },
  ];
  void tier;
  return {
    narrative,
    decisions: copy.decisions,
    headline: copy.headline,
    ifDoNothing: copy.narrative.ifDoNothing,
  };
}
