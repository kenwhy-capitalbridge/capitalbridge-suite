"use client";

import { useEffect, useState } from "react";
import { beginReportReadyCycle, completeReportReadyCycle } from "@cb/pdf/report-ready";
import {
  CB_PDF_FOOTER_DOM_REPORT_ID_ATTR,
  CB_PDF_FOOTER_DOM_VERSION_ATTR,
} from "@cb/shared/reportPdfPlaywright";
import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import { ReportHeading, ReportProse, ReportSection } from "@cb/advisory-graph/reports";
import { ReportPrintChrome } from "@cb/ui";
import { ForeverPrintModelSnapshot } from "./ForeverPrintModelSnapshot";
import {
  buildReportExportConfigPatch,
  clearForeverPrintSnapshot,
  readForeverPrintSnapshot,
  type ForeverPrintSnapshotV1,
} from "./foreverPrintSnapshot";

type Props = {
  audit: ReportAuditMeta;
  /** `report_exports.id` when the DB insert succeeded (null if table missing / RLS / error). */
  exportId: string | null;
  planSlug: string;
};

/**
 * Forever Income v6 Playwright target — placeholder body until full 14-page layout lands.
 * Sets `window.__REPORT_READY__` for `renderPdf` (after layout stabilises).
 */
export function ForeverPrintScaffoldClient({ audit, exportId, planSlug }: Props) {
  const [dashboardSnap, setDashboardSnap] = useState<ForeverPrintSnapshotV1 | null>(null);

  useEffect(() => {
    setDashboardSnap(readForeverPrintSnapshot());
  }, []);

  useEffect(() => {
    const token = beginReportReadyCycle();
    const run = async () => {
      if (exportId) {
        const snap = readForeverPrintSnapshot();
        const lion_config = buildReportExportConfigPatch(snap, planSlug);
        try {
          const res = await fetch("/api/forever/report-export/lion-config", {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ exportId, lion_config }),
          });
          if (res.ok) clearForeverPrintSnapshot();
        } catch {
          /* network — keep snapshot for retry */
        }
      }
      await completeReportReadyCycle(token);
    };
    void run();
  }, [exportId, planSlug]);

  useEffect(() => {
    if (!exportId) return;
    document.documentElement.dataset.cbForeverExportId = exportId;
    return () => {
      delete document.documentElement.dataset.cbForeverExportId;
    };
  }, [exportId]);

  return (
    <div
      className="cb-report-root print-report-root min-h-screen bg-white px-6 py-8 text-[#0d3a1d] md:px-10"
      data-cb-forever-plan-slug={planSlug}
      data-cb-forever-export-id={exportId ?? undefined}
      {...{
        [CB_PDF_FOOTER_DOM_REPORT_ID_ATTR]: audit.reportId,
        [CB_PDF_FOOTER_DOM_VERSION_ATTR]: audit.versionLabel,
      }}
    >
      <ReportPrintChrome audit={audit} />
      <ReportHeading level={2}>Forever Income — strategic wealth report</ReportHeading>
      <ReportProse lead>
        v6 Playwright print route. Sections below reflect the dashboard snapshot when you use{" "}
        <strong>Open print layout (PDF v6)</strong>.
        {exportId
          ? " Calculator + Lion payload is PATCHed into `lion_config` (schema v2) on this export row."
          : " No `report_exports` row — apply migrations and RLS."}
      </ReportProse>
      <ForeverPrintModelSnapshot snapshot={dashboardSnap} />
      <ReportSection pageBreakBefore>
        <ReportHeading level={3} variant="sectionSmall">
          Further pages
        </ReportHeading>
        <ReportProse>
          Cover art, charts, disclosures, and full 14-page layout are scheduled in later steps.
        </ReportProse>
      </ReportSection>
    </div>
  );
}
