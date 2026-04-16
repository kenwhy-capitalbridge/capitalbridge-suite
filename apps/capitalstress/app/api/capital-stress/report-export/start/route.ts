import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { buildReportId } from "@cb/shared/reportTraceability";

import { isStressPrintSnapshotV1, type StressPrintSnapshotV1 } from "@/legacy/stressPrintSnapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  snapshot?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const snap = body.snapshot;
  if (!isStressPrintSnapshotV1(snap)) {
    return NextResponse.json({ error: "bad_snapshot" }, { status: 400 });
  }

  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const reportId = buildReportId("STRESS", `${user.id}|${now.getTime()}|${randomUUID()}`);

  const lionConfig: Record<string, unknown> = {
    schemaVersion: 1,
    stressPrintSnapshot: snap as StressPrintSnapshotV1,
  };

  const { data, error } = await supabase
    .from("report_exports")
    .insert({
      user_id: user.id,
      report_id: reportId,
      tier: null,
      lion_config: lionConfig,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("[capital-stress] report_exports insert failed:", error?.message);
    return NextResponse.json({ error: (error?.message ?? "insert_failed").slice(0, 200) }, { status: 500 });
  }

  return NextResponse.json({
    exportId: data.id,
    reportId,
    pdfUrl: `/api/capital-stress/report-pdf/${data.id}`,
  });
}
