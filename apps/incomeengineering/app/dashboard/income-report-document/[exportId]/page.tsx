import { notFound, redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { createServiceClient } from "@cb/supabase/service";
import {
  buildCapitalBridgePdfFilename,
  CB_REPORT_MODEL_DISPLAY_NAME,
  type ReportAuditMeta,
} from "@cb/shared/reportTraceability";
import { marketIdToReportExportTimeZone, normalizeMarketId } from "@cb/shared/markets";
import { formatReportGeneratedAtLabel, reportClientDisplayNameFromAuth } from "@cb/shared/reportIdentity";
import { verifyPdfCaptureToken } from "@cb/shared/pdfCaptureToken";

import { IncomeReportDocumentClient } from "@/legacy/IncomeReportDocumentClient";
import { isIncomePrintSnapshotV1, type IncomePrintSnapshotV1 } from "@/legacy/incomePrintSnapshot";

export const dynamic = "force-dynamic";

function readIncomeSnapshot(lionConfig: unknown): IncomePrintSnapshotV1 | null {
  if (!lionConfig || typeof lionConfig !== "object" || Array.isArray(lionConfig)) return null;
  const o = lionConfig as Record<string, unknown>;
  const s = o.incomePrintSnapshot;
  return isIncomePrintSnapshotV1(s) ? s : null;
}

export default async function IncomeReportDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ exportId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { exportId } = await params;
  const id = exportId?.trim() ?? "";
  if (!id) notFound();

  const sp = await searchParams;
  const pdfCaptureRaw = sp.pdfCapture;
  const pdfCapture =
    typeof pdfCaptureRaw === "string"
      ? pdfCaptureRaw
      : Array.isArray(pdfCaptureRaw)
        ? pdfCaptureRaw[0]
        : undefined;

  type Row = {
    id: string;
    user_id: string;
    report_id: string;
    lion_config: unknown;
    created_at: string;
  };

  let row: Row;
  let emailForName: string | null;
  let userMetadata: Record<string, unknown> | null;

  if (pdfCapture) {
    const v = verifyPdfCaptureToken(pdfCapture, id);
    if (!v) notFound();
    let svc: ReturnType<typeof createServiceClient>;
    try {
      svc = createServiceClient();
    } catch {
      notFound();
    }
    const { data: exportRow, error } = await svc
      .from("report_exports")
      .select("id, user_id, report_id, lion_config, created_at")
      .eq("id", id)
      .eq("user_id", v.userId)
      .maybeSingle();
    if (error || !exportRow) notFound();
    row = exportRow as Row;
    const { data: adminRes, error: adminErr } = await svc.auth.admin.getUserById(v.userId);
    if (adminErr || !adminRes.user) notFound();
    emailForName = adminRes.user.email ?? null;
    userMetadata = (adminRes.user.user_metadata as Record<string, unknown>) ?? null;
  } else {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/dashboard");
    }
    const { data: exportRow, error } = await supabase
      .from("report_exports")
      .select("id, user_id, report_id, lion_config, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error || !exportRow || exportRow.user_id !== user.id) notFound();
    row = exportRow as Row;
    emailForName = user.email ?? null;
    userMetadata = (user.user_metadata as Record<string, unknown>) ?? null;
  }

  const snapshot = readIncomeSnapshot(row.lion_config);
  if (!snapshot) notFound();

  let profile: {
    first_name: string | null;
    last_name: string | null;
    advisory_market: string | null;
  } | null = null;

  if (pdfCapture) {
    let svc: ReturnType<typeof createServiceClient>;
    try {
      svc = createServiceClient();
    } catch {
      notFound();
    }
    const { data: prof } = await svc
      .schema("public")
      .from("profiles")
      .select("first_name, last_name, advisory_market")
      .eq("id", row.user_id)
      .maybeSingle();
    profile = prof;
  } else {
    const supabase = await createAppServerClient();
    const { data: prof } = await supabase
      .schema("public")
      .from("profiles")
      .select("first_name, last_name, advisory_market")
      .eq("id", row.user_id)
      .maybeSingle();
    profile = prof;
  }

  const reportClientDisplayName = reportClientDisplayNameFromAuth({
    email: emailForName,
    userMetadata,
    profile: profile ?? null,
  });

  let timeZone = "UTC";
  try {
    timeZone = marketIdToReportExportTimeZone(normalizeMarketId(profile?.advisory_market));
  } catch {
    timeZone = "UTC";
  }

  const createdAt = new Date(row.created_at);
  const versionLabel = "v1.0";
  const auditFilename = buildCapitalBridgePdfFilename({
    modelCode: "INCOME",
    userDisplayName: reportClientDisplayName,
    versionLabel,
    generatedAt: createdAt,
  });

  const audit: ReportAuditMeta = {
    reportId: row.report_id,
    versionLabel,
    filename: auditFilename,
    generatedAt: createdAt,
    generatedAtLabel: formatReportGeneratedAtLabel(createdAt, { timeZone }),
    modelDisplayName: CB_REPORT_MODEL_DISPLAY_NAME.INCOME,
    clientDisplayName: reportClientDisplayName,
  };

  return (
    <main className="min-h-0">
      <IncomeReportDocumentClient snapshot={snapshot} audit={audit} />
    </main>
  );
}
