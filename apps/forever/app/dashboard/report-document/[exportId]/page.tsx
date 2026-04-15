import { notFound } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { CB_REPORT_PLAYWRIGHT_PDF_CANONICAL_FOOTER } from "@cb/shared/legalMonocopy";
import {
  buildForeverIncomeModelReportFilename,
  CB_REPORT_MODEL_DISPLAY_NAME,
  formatForeverCoverGeneratedLabel,
  type ReportAuditMeta,
} from "@cb/shared/reportTraceability";

import { planSlugDeniesLionsVerdict } from "@cb/lion-verdict/access";
import { requireForeverDashboardAuth } from "../../foreverDashboardGate";
import { resolveForeverReportDocumentLion } from "@/lib/lionConfigChosen";
import { ForeverReportDocumentClient } from "./ForeverReportDocumentClient";

export const dynamic = "force-dynamic";

function readCalculator(lionConfig: unknown): {
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
} | null {
  if (!lionConfig || typeof lionConfig !== "object" || Array.isArray(lionConfig)) return null;
  const c = (lionConfig as Record<string, unknown>).calculator;
  if (!c || typeof c !== "object" || Array.isArray(c)) return null;
  const o = c as Record<string, unknown>;
  const inputs = o.inputs;
  const results = o.results;
  if (!inputs || typeof inputs !== "object" || !results || typeof results !== "object") return null;
  return {
    inputs: inputs as Record<string, unknown>,
    results: results as Record<string, unknown>,
  };
}

export default async function ForeverReportDocumentPage({ params }: { params: Promise<{ exportId: string }> }) {
  const { exportId } = await params;
  const id = exportId?.trim() ?? "";
  if (!id) notFound();

  const { userId, reportTimeZoneIana, reportClientDisplayName } = await requireForeverDashboardAuth();
  const supabase = await createAppServerClient();

  const { data: row, error } = await supabase
    .from("report_exports")
    .select("id, user_id, tier, report_id, lion_config, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !row || row.user_id !== userId) notFound();

  const createdAt = new Date(row.created_at);
  const tz = reportTimeZoneIana?.trim() || "UTC";
  const lc = row.lion_config as unknown;
  const lcObj = lc && typeof lc === "object" && !Array.isArray(lc) ? (lc as Record<string, unknown>) : null;
  const planFromConfig = typeof lcObj?.planSlug === "string" ? lcObj.planSlug : null;
  const tierStored = String(row.tier ?? "").toLowerCase().trim();
  const isTrial =
    planSlugDeniesLionsVerdict(tierStored) || planSlugDeniesLionsVerdict(planFromConfig);
  const calculator = readCalculator(lc);
  const lion = resolveForeverReportDocumentLion({ isTrial, lionConfig: lc, calculator });

  const audit: ReportAuditMeta = {
    reportId: row.report_id,
    versionLabel: "v1.0",
    filename: buildForeverIncomeModelReportFilename({
      planSlug: String(row.tier ?? ""),
      createdAt,
      timeZone: tz,
    }),
    generatedAt: createdAt,
    generatedAtLabel: formatForeverCoverGeneratedLabel(createdAt, tz),
    modelDisplayName: CB_REPORT_MODEL_DISPLAY_NAME.FOREVER,
    clientDisplayName: reportClientDisplayName,
  };

  return (
    <main className="min-h-0">
      <ForeverReportDocumentClient
        audit={audit}
        shortFooterLegal={CB_REPORT_PLAYWRIGHT_PDF_CANONICAL_FOOTER}
        preparedForName={reportClientDisplayName}
        isTrial={isTrial}
        lion={lion}
        calculator={calculator}
      />
    </main>
  );
}
