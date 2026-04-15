import { notFound, redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import {
  buildCapitalBridgePdfFilename,
  CB_REPORT_MODEL_DISPLAY_NAME,
  type ReportAuditMeta,
} from "@cb/shared/reportTraceability";
import { marketIdToReportExportTimeZone, normalizeMarketId } from "@cb/shared/markets";
import { formatReportGeneratedAtLabel, reportClientDisplayNameFromAuth } from "@cb/shared/reportIdentity";

import { StressReportDocumentClient } from "./StressReportDocumentClient";
import { isStressPrintSnapshotV1, type StressPrintSnapshotV1 } from "@/legacy/stressPrintSnapshot";

export const dynamic = "force-dynamic";

function readStressSnapshot(lionConfig: unknown): StressPrintSnapshotV1 | null {
  if (!lionConfig || typeof lionConfig !== "object" || Array.isArray(lionConfig)) return null;
  const o = lionConfig as Record<string, unknown>;
  const s = o.stressPrintSnapshot;
  return isStressPrintSnapshotV1(s) ? s : null;
}

export default async function StressReportDocumentPage({ params }: { params: Promise<{ exportId: string }> }) {
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

  const snapshot = readStressSnapshot(row.lion_config);
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
  const filename = buildCapitalBridgePdfFilename({
    modelCode: "STRESS",
    userDisplayName: reportClientDisplayName,
    versionLabel,
    generatedAt: createdAt,
  });

  const audit: ReportAuditMeta = {
    reportId: row.report_id,
    versionLabel,
    filename,
    generatedAt: createdAt,
    generatedAtLabel: formatReportGeneratedAtLabel(createdAt, { timeZone }),
    modelDisplayName: CB_REPORT_MODEL_DISPLAY_NAME.STRESS,
    clientDisplayName: reportClientDisplayName,
  };

  return (
    <main className="min-h-0">
      <StressReportDocumentClient snapshot={snapshot} audit={audit} />
    </main>
  );
}
