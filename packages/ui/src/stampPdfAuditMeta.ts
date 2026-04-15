import type { jsPDF } from "jspdf";
import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import { CB_REPORT_PLAYWRIGHT_PDF_CANONICAL_FOOTER } from "@cb/shared/legalMonocopy";

/** Top band + bottom legal + pagination on every page (jsPDF exports). Matches Playwright PDF header/footer intent. */
export function stampAllPdfPagesWithAudit(doc: jsPDF, meta: ReportAuditMeta): void {
  try {
    doc.setProperties({
      title: `Capital Bridge report — ${meta.reportId}`,
      subject: `Report ID: ${meta.reportId}; Version: ${meta.versionLabel}`,
      keywords: `${meta.reportId}, ${meta.versionLabel}`,
    });
  } catch {
    /* older jsPDF */
  }
  const pageW = 210;
  const pageH = 297;
  const m = 12;
  const n = doc.getNumberOfPages();
  const canonical = CB_REPORT_PLAYWRIGHT_PDF_CANONICAL_FOOTER;
  for (let p = 1; p <= n; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(13, 58, 29);
    doc.text(meta.modelDisplayName, m, m + 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(75, 85, 99);
    const rightLines = [
      meta.clientDisplayName,
      meta.generatedAtLabel,
      ...(meta.reportExportZoneLabel ? [meta.reportExportZoneLabel] : []),
    ];
    let y = m + 2;
    for (const line of rightLines) {
      doc.text(line, pageW - m, y, { align: "right" });
      y += 3.8;
    }

    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    const pageStr = `Page ${p} of ${n}`;
    const pageStrW = doc.getTextWidth(pageStr);
    const maxFooterTextW = pageW - 2 * m - pageStrW - 6;
    const footerLines = doc.splitTextToSize(canonical, Math.max(40, maxFooterTextW));
    const lineH = 2.45;
    const blockH = footerLines.length * lineH;
    let fy = pageH - m - blockH;
    for (let i = 0; i < footerLines.length; i++) {
      doc.text(footerLines[i]!, m, fy + i * lineH);
    }
    doc.text(pageStr, pageW - m, pageH - m - 0.5, { align: "right" });
  }
}
