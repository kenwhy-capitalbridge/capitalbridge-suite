import type { GetLionVerdictOutput } from "./getLionVerdict";

export type PaidLionNarrativeSection = { label: string; text: string };

// Legacy print adapters still consume a section-model shape; map directly from
// the shared narrative/decision engine so there is no second verdict logic path.
export function buildPaidLionSectionModel(copy: GetLionVerdictOutput): {
  narrative: PaidLionNarrativeSection[];
  decisions: string[];
  headline: string;
  ifDoNothing: string;
} {
  const narrative: PaidLionNarrativeSection[] = [
    { label: "Current position", text: copy.narrative.personalised },
    { label: "Why this is happening", text: copy.narrative.why },
    { label: "Capital position", text: copy.narrative.capital },
    { label: "Sustainability outlook", text: copy.narrative.sustainability },
    { label: "Lion guidance", text: copy.narrative.guidance },
  ];

  return {
    narrative,
    decisions: copy.decisions,
    headline: copy.narrative.headline,
    ifDoNothing: copy.narrative.ifDoNothing,
  };
}
