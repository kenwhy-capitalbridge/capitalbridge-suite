/**
 * STEP 7 — handoff from dashboard ForeverApp to `/dashboard/print` (same browser tab).
 * STEP 8 — full calculator snapshot + structured Lion block stored in `lion_config` (schema v2).
 * SessionStorage only; DB persistence goes through PATCH `lion_config`.
 */

export const FOREVER_PRINT_SNAPSHOT_STORAGE_KEY = "cb_forever_print_snapshot_v1";

/** Mirrors `lionCopy` from Forever `getResults()` when Lion is unlocked. */
export type ForeverPrintSnapshotLionCopy = {
  tier: string;
  headline: string;
  guidance: string;
  headlineIndex: number;
  guidanceIndex: number;
  confidenceBand: string;
  emphasis?: string;
  persona: string;
  history?: unknown;
};

export type ForeverPrintSnapshotV1 = {
  v: 1;
  savedAt: number;
  inputs: Record<string, unknown>;
  results: Record<string, unknown> & { lionCopy?: ForeverPrintSnapshotLionCopy };
};

export function readForeverPrintSnapshot(): ForeverPrintSnapshotV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(FOREVER_PRINT_SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ForeverPrintSnapshotV1;
    if (parsed?.v !== 1 || typeof parsed.inputs !== "object" || typeof parsed.results !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearForeverPrintSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(FOREVER_PRINT_SNAPSHOT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function buildLionSection(snapshot: ForeverPrintSnapshotV1 | null): Record<string, unknown> {
  const lc = snapshot?.results?.lionCopy;
  if (lc && typeof lc.headlineIndex === "number" && typeof lc.guidanceIndex === "number") {
    return {
      headlineIndex: lc.headlineIndex,
      guidanceIndex: lc.guidanceIndex,
      persona: lc.persona,
      confidenceBand: lc.confidenceBand,
      tier: lc.tier,
      emphasis: lc.emphasis ?? null,
      history: lc.history ?? null,
      headlineText: lc.headline,
      guidanceText: lc.guidance,
    };
  }
  return {
    locked: true,
    reason: snapshot ? "trial_or_lion_unavailable" : "no_dashboard_snapshot",
  };
}

/**
 * Full payload for PATCH `report_exports.lion_config` (JSONB — name is legacy; holds calculator + lion).
 * `schemaVersion` 2 nests calculator snapshot for re-download without sessionStorage.
 */
export function buildReportExportConfigPatch(
  snapshot: ForeverPrintSnapshotV1 | null,
  planSlug: string,
): Record<string, unknown> {
  return {
    schemaVersion: 2,
    planSlug,
    capturedAt: snapshot?.savedAt ?? null,
    calculator: snapshot
      ? {
          inputs: snapshot.inputs,
          results: snapshot.results,
        }
      : null,
    lion: buildLionSection(snapshot),
  };
}

/** @deprecated Use `buildReportExportConfigPatch` (schema v2). */
export function buildLionConfigJsonFromSnapshot(
  snapshot: ForeverPrintSnapshotV1 | null,
  planSlug: string,
): Record<string, unknown> {
  return buildReportExportConfigPatch(snapshot, planSlug);
}
