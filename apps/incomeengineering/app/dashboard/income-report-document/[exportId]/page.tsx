import { notFound, redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import {
  buildCapitalBridgePdfFilename,
  CB_REPORT_MODEL_DISPLAY_NAME,
  type ReportAuditMeta,
} from "@cb/shared/reportTraceability";
import { marketIdToReportExportTimeZone, normalizeMarketId } from "@cb/shared/markets";
import { formatReportGeneratedAtLabel, reportClientDisplayNameFromAuth } from "@cb/shared/reportIdentity";

import { IncomeReportDocumentClient } from "@/legacy/IncomeReportDocumentClient";
import { isIncomePrintSnapshotV1, type IncomePrintSnapshotV1 } from "@/legacy/incomePrintSnapshot";

export const dynamic = "force-dynamic";

function readIncomeSnapshot(lionConfig: unknown): IncomePrintSnapshotV1 | null {
  if (!lionConfig || typeof lionConfig !== "object" || Array.isArray(lionConfig)) return null;
  const o = lionConfig as Record<string, unknown>;
  const s = o.incomePrintSnapshot;
  return isIncomePrintSnapshotV1(s) ? s : null;
}

export default async function IncomeReportDocumentPage({ params }: { params: Promise<{ exportId: string }> }) {
  const { exportId } = await params;
  const id = exportId?.trim() ?? "";
  if (!id) notFound();

  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/dashboard");
  }

  const { data: row, error } = await supabase
    .from("report_exports")
    .select("id, user_id, report_id, lion_config, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !row || row.user_id !== user.id) notFound();

  const snapshot = readIncomeSnapshot(row.lion_config);
  if (!snapshot) notFound();

  const { data: profile } = await supabase
    .schema("public")
    .from("profiles")
    .select("first_name, last_name, advisory_market")
    .eq("id", user.id)
    .maybeSingle();

  const reportClientDisplayName = reportClientDisplayNameFromAuth({
    email: user.email,
    userMetadata: user.user_metadata as Record<string, unknown>,
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
