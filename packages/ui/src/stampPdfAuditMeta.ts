import type { jsPDF } from "jspdf";
import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import { CB_REPORT_LEGAL_NOTICE } from "@cb/shared/reportTraceability";

/** Top-right header + bottom legal block on every page (jsPDF exports). */
export function stampAllPdfPagesWithAudit(doc: jsPDF, meta: ReportAuditMeta): void {
  const pageW = 210;
  const pageH = 297;
  const m = 12;
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(13, 58, 29);
    doc.setFontSize(7);
    const right = pageW - m;
    let y = m + 2;
    const headerLines = [
      `Report ID: ${meta.reportId}`,
      meta.generatedAtLabel,
      `Version: ${meta.versionLabel}`,
      meta.modelDisplayName,
    ];
    for (const line of headerLines) {
      doc.text(line, right, y, { align: "right" });
      y += 3.8;
    }
    doc.setFontSize(5.2);
    doc.setTextColor(55, 65, 81);
    const footerLines = doc.splitTextToSize(CB_REPORT_LEGAL_NOTICE, pageW - 2 * m);
    const lineH = 2.35;
    let fy = pageH - m - footerLines.length * lineH - 1;
    for (let i = 0; i < footerLines.length; i += 1) {
      doc.text(footerLines[i]!, m, fy + i * lineH);
    }
  }
}
