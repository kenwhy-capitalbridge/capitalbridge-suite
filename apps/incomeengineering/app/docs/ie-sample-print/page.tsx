"use client";

import { useMemo } from "react";
import { createReportAuditMeta } from "@cb/shared/reportTraceability";
import { IncomeReportDocumentClient } from "@/legacy/IncomeReportDocumentClient";
import { SAMPLE_INCOME_ENGINEERING_PRINT_SNAPSHOT } from "@/legacy/sampleReportPdfFixtures";

/**
 * Print-only fixture for Playwright PDF capture (`#print-report` + `.cb-report-root` on first paint).
 * Public route (not under `/dashboard`). Use with `apps/incomeengineering/scripts/render-sample-pdf-for-docs.ts`.
 */
export default function IncomeEngineeringSamplePrintPage() {
  const audit = useMemo(
    () =>
      createReportAuditMeta({
        modelCode: "INCOME",
        userDisplayName: SAMPLE_INCOME_ENGINEERING_PRINT_SNAPSHOT.reportClientDisplayName,
        now: new Date("2026-04-16T12:00:00.000Z"),
      }),
    [],
  );

  return <IncomeReportDocumentClient snapshot={SAMPLE_INCOME_ENGINEERING_PRINT_SNAPSHOT} audit={audit} />;
}
