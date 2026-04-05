import type { Metadata } from "next";
import { createAppServerClient } from "@cb/supabase/server";
import { createReportAuditMeta } from "@cb/shared/reportTraceability";
import { requireForeverDashboardAuth } from "../foreverDashboardGate";
import { ForeverPrintScaffoldClient } from "./ForeverPrintScaffoldClient";
import { insertForeverReportExportRow } from "./insertForeverReportExport";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Forever Income report (print) | Capital Bridge",
  description: "Print / PDF capture layout for Forever Income v6.",
};

export default async function ForeverPrintPage() {
  const { userId, planSlug, reportClientDisplayName, advisoryMarketId } =
    await requireForeverDashboardAuth();
  const audit = createReportAuditMeta({
    modelCode: "FOREVER",
    userDisplayName: reportClientDisplayName,
    foreverV6Export: { planSlug, advisoryMarketId },
  });

  const supabase = await createAppServerClient();
  const exportId = await insertForeverReportExportRow(supabase, {
    userId,
    reportId: audit.reportId,
    tier: planSlug,
  });

  return (
    <main className="min-h-0">
      <ForeverPrintScaffoldClient audit={audit} exportId={exportId} planSlug={planSlug} />
    </main>
  );
}
