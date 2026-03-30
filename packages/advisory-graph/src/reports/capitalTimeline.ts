/**
 * Capital Timeline — shared copy and pure helpers for optional historical print pages.
 */

export const CAPITAL_TIMELINE_SCOPE_NOTE =
  "Progress reflects only the areas measured in this report. A complete view considers sustainability, structure, and resilience together.";

export type CapitalTimelinePoint = {
  /** UTC epoch ms */
  t: number;
  /** Display metric 0–100 */
  y: number;
  source: "saved" | "current";
};

export type CapitalTimelineTrajectory = "improving" | "stable" | "deteriorating";

export function formatCapitalTrajectoryLabel(t: CapitalTimelineTrajectory): string {
  switch (t) {
    case "improving":
      return "Improving";
    case "deteriorating":
      return "Deteriorating";
    default:
      return "Stable";
  }
}

/** Overall direction from oldest to newest (first vs last), with a small dead band. */
export function capitalTrajectoryFromYValues(ys: number[]): CapitalTimelineTrajectory {
  if (ys.length < 2) return "stable";
  const diff = ys[ys.length - 1] - ys[0];
  const threshold = 4;
  if (Math.abs(diff) < threshold) return "stable";
  return diff > 0 ? "improving" : "deteriorating";
}

export function latestChangePlainEnglish(prevY: number, currY: number): string {
  const d = currY - prevY;
  if (Math.abs(d) < 1) {
    return `Your headline resilience score stayed at about ${currY} out of 100 compared with your last saved report — effectively unchanged on this measure.`;
  }
  if (d > 0) {
    return `Your headline resilience score rose from ${prevY} to ${currY} out of 100 — an improvement of ${d} points since your last saved report.`;
  }
  return `Your headline resilience score fell from ${prevY} to ${currY} out of 100 — a decrease of ${Math.abs(d)} points since your last saved report.`;
}

export type CapitalTimelinePrintPayload = {
  points: CapitalTimelinePoint[];
  metricLabel: string;
  latestChangePlain: string;
  trajectory: CapitalTimelineTrajectory;
};

const DEFAULT_METRIC_LABEL = "Capital resilience score (0–100)";

/**
 * Builds print payload when at least one prior saved point exists and a current reading is provided.
 * `historical` must be only `source: 'saved'` points, ascending by `t`.
 */
export function buildCapitalTimelinePrintPayload(
  historicalAsc: CapitalTimelinePoint[],
  currentY: number,
  nowMs: number,
  metricLabel: string = DEFAULT_METRIC_LABEL,
): CapitalTimelinePrintPayload | null {
  const priorSaved = historicalAsc.filter((p) => p.source === "saved");
  if (priorSaved.length < 1 || !Number.isFinite(currentY)) return null;

  const current: CapitalTimelinePoint = { t: nowMs, y: Math.round(currentY), source: "current" };
  const points = [...priorSaved, current].sort((a, b) => a.t - b.t);
  const ys = points.map((p) => p.y);
  const trajectory = capitalTrajectoryFromYValues(ys);
  const prevY = points[points.length - 2]?.y ?? priorSaved[priorSaved.length - 1].y;
  const currY = points[points.length - 1].y;
  return {
    points,
    metricLabel,
    latestChangePlain: latestChangePlainEnglish(prevY, currY),
    trajectory,
  };
}
