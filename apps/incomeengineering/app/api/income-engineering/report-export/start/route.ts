import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { buildReportId } from "@cb/shared/reportTraceability";

import { isIncomePrintSnapshotV1, type IncomePrintSnapshotV1 } from "@/legacy/incomePrintSnapshot";

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
  if (!isIncomePrintSnapshotV1(snap)) {
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
  const reportId = buildReportId("INCOME", `${user.id}|${now.getTime()}|${randomUUID()}`);

  const lionConfig: Record<string, unknown> = {
    schemaVersion: 1,
    incomePrintSnapshot: snap as IncomePrintSnapshotV1,
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
    console.error("[income-engineering] report_exports insert failed:", error?.message);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({
    exportId: data.id,
    reportId,
    pdfUrl: `/api/income-engineering/report-pdf/${data.id}`,
  });
}
