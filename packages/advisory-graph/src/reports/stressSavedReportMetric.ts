import { stressScoreToDisplay0to100 } from "../lionsVerdict";

/**
 * Reads technical resilience from a Capital Stress `getResults()` payload saved in `advisory_reports.results`.
 */
export function extractStressResilienceTechnicalFromResults(
  results: Record<string, unknown>,
): number | null {
  const mc = results.mcResult;
  if (!mc || typeof mc !== "object") return null;
  const raw = (mc as Record<string, unknown>).capitalResilienceScore;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return raw;
}

export function extractStressDisplayScoreFromSavedResults(
  results: Record<string, unknown>,
): number | null {
  const tech = extractStressResilienceTechnicalFromResults(results);
  if (tech == null) return null;
  return stressScoreToDisplay0to100(tech);
}
