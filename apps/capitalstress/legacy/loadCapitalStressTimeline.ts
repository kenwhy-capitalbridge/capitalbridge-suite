import {
  type CapitalTimelinePoint,
  extractStressDisplayScoreFromSavedResults,
} from "@cb/advisory-graph/reports";

function timelineMockHistorical(now: number): CapitalTimelinePoint[] {
  return [
    { t: now - 86400000 * 100, y: 46, source: "saved" },
    { t: now - 86400000 * 45, y: 53, source: "saved" },
    { t: now - 86400000 * 12, y: 58, source: "saved" },
  ];
}

export function capitalStressTimelineMockEnabled(): boolean {
  if (typeof process === "undefined") return false;
  const v =
    process.env.NEXT_PUBLIC_CB_TIMELINE_MOCK ?? process.env.NEXT_PUBLIC_TIMELINE_MOCK ?? "";
  return String(v).trim() === "1";
}

/**
 * Fetches saved Capital Stress reports and returns display scores (oldest → newest).
 * Empty array on failure or no usable reports.
 */
export async function fetchCapitalStressTimelineSavedPoints(): Promise<CapitalTimelinePoint[]> {
  const listRes = await fetch("/api/advisory-report?list=1&limit=12");
  if (!listRes.ok) return [];
  const listBody = (await listRes.json()) as { items?: { id: string; created_at: string }[] };
  const items = Array.isArray(listBody.items) ? [...listBody.items].reverse() : [];
  if (items.length === 0) return [];

  const resolved = await Promise.all(
    items.map(async (item) => {
      const r = await fetch(`/api/advisory-report?id=${encodeURIComponent(item.id)}`);
      if (!r.ok) return null;
      const body = (await r.json()) as { results?: Record<string, unknown> };
      const results = body.results;
      if (!results || typeof results !== "object") return null;
      const y = extractStressDisplayScoreFromSavedResults(results as Record<string, unknown>);
      if (y == null) return null;
      const t = Date.parse(item.created_at);
      return {
        t: Number.isFinite(t) ? t : Date.now(),
        y,
        source: "saved" as const,
      };
    }),
  );

  const out: CapitalTimelinePoint[] = resolved.filter((p) => p != null);
  return out.sort((a, b) => a.t - b.t);
}

export async function loadCapitalStressTimelineSavedPointsForUser(
  advisoryUserId: string | null | undefined,
): Promise<CapitalTimelinePoint[]> {
  if (capitalStressTimelineMockEnabled()) {
    return timelineMockHistorical(Date.now());
  }
  if (!advisoryUserId) return [];
  try {
    return await fetchCapitalStressTimelineSavedPoints();
  } catch {
    return [];
  }
}
