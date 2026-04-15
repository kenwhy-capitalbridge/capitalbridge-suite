"use client";

import { useMemo } from "react";
import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import { PrintReport } from "@/legacy/PrintReport";
import {
  buildPrintReportPropsFromSnapshot,
  type StressPrintSnapshotV1,
} from "@/legacy/stressPrintSnapshot";

export function StressReportDocumentClient({
  snapshot,
  audit,
}: {
  snapshot: StressPrintSnapshotV1;
  audit: ReportAuditMeta;
}) {
  const props = useMemo(
    () => buildPrintReportPropsFromSnapshot(snapshot, audit),
    [snapshot, audit],
  );
  return (
    <div className="cb-body min-h-screen bg-[#f7faf7] text-[#0D3A1D]">
      <PrintReport {...props} />
    </div>
  );
}
