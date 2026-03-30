"use client";

import { useMemo } from "react";
import "../../../legacy/index.css";
import { PrintReport } from "../../../legacy/PrintReport";
import { buildSampleCapitalStressPrintReportProps } from "../../../legacy/sampleReportPdfFixtures";

/**
 * Public fixture URL — full `PrintReport` client render (hydrated), not `setContent` HTML.
 */
export default function CapitalStressSampleReportPage() {
  const props = useMemo(() => buildSampleCapitalStressPrintReportProps(), []);
  return (
    <div className="cb-body min-h-screen bg-white text-[#0D3A1D]">
      <PrintReport {...props} />
    </div>
  );
}
