import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { buildReportId } from "@cb/shared/reportTraceability";
import type { Tier } from "@cb/lion-verdict/copy";

import { planSlugDeniesLionsVerdict } from "@cb/lion-verdict/access";
import { requireForeverDashboardAuth } from "@/app/dashboard/foreverDashboardGate";
import { insertForeverReportExportRow } from "@/app/dashboard/print/insertForeverReportExport";
import { ensureForeverReportLionConfig } from "@/lib/ensureForeverReportLionConfig";
import type { ForeverPrintSnapshotV1 } from "@/app/dashboard/print/foreverPrintSnapshot";

export const dynamic = "force-dynamic";

const VERDICT_TIERS = new Set<string>(["STRONG", "STABLE", "FRAGILE", "AT_RISK", "NOT_SUSTAINABLE"]);

function isSnapshotV1(x: unknown): x is ForeverPrintSnapshotV1 {
  if (!x || typeof x !== "object") return false;
  const o = x as ForeverPrintSnapshotV1;
  return o.v === 1 && typeof o.inputs === "object" && typeof o.results === "object";
}

type Body = {
  snapshot?: unknown;
  verdictTier?: string;
};

/**
 * Create `report_exports` row + calculator payload; paid users get Lion lines via ENSURE (anti-repeat).
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!isSnapshotV1(body.snapshot)) {
    return NextResponse.json({ error: "bad_snapshot" }, { status: 400 });
  }

  const verdictRaw = typeof body.verdictTier === "string" ? body.verdictTier.trim().toUpperCase() : "";
  if (!VERDICT_TIERS.has(verdictRaw)) {
    return NextResponse.json({ error: "bad_verdict_tier" }, { status: 400 });
  }
  const verdictTier = verdictRaw as Tier;

  const { userId, planSlug } = await requireForeverDashboardAuth();
  const supabase = await createAppServerClient();

  const now = new Date();
  const reportId = buildReportId("FOREVER", `${userId}|${now.getTime()}|${randomUUID()}`);

  const lionConfig: Record<string, unknown> = {
    schemaVersion: 2,
    planSlug,
    capturedAt: body.snapshot.savedAt,
    calculator: {
      inputs: body.snapshot.inputs,
      results: body.snapshot.results,
    },
  };

  const exportId = await insertForeverReportExportRow(supabase, {
    userId,
    reportId,
    tier: planSlug,
    lionConfig,
  });

  if (!exportId) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const isTrial = planSlugDeniesLionsVerdict(planSlug);
  if (!isTrial) {
    try {
      await ensureForeverReportLionConfig(supabase, {
        userId,
        exportId,
        verdictTier,
      });
    } catch (e) {
      const err = e as Error & { status?: number };
      return NextResponse.json({ error: err.message ?? "ensure_failed" }, { status: err.status ?? 500 });
    }
  }

  return NextResponse.json({
    exportId,
    reportId,
    pdfUrl: `/api/forever/report-pdf/${exportId}`,
  });
}
