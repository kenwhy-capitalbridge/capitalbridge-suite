import { notFound } from "next/navigation";
import { CB_REPORT_PLAYWRIGHT_PDF_SHORT_FOOTER } from "@cb/shared/legalMonocopy";

import { ForeverReportDocumentClient } from "@/app/dashboard/report-document/[exportId]/ForeverReportDocumentClient";
import { getForeverMockReportPdfProps } from "@/lib/foreverReportMockPdfData";

/**
 * Local / CI PDF layout check: same DOM as dashboard report-document, mock calculator + Lion.
 *
 * - `next dev`: available at http://localhost:3006/docs/forever-report-mock
 * - `next start` (production build): set CB_FOREVER_ALLOW_MOCK_REPORT=1
 * - Deployed production: 404 unless CB_FOREVER_ALLOW_MOCK_REPORT=1 (avoid leaking mock route)
 */
export default function ForeverReportMockPage() {
  const allow =
    process.env.NODE_ENV !== "production" || process.env.CB_FOREVER_ALLOW_MOCK_REPORT === "1";
  if (!allow) notFound();

  const props = getForeverMockReportPdfProps();

  return (
    <main className="min-h-0">
      <ForeverReportDocumentClient
        {...props}
        shortFooterLegal={CB_REPORT_PLAYWRIGHT_PDF_SHORT_FOOTER}
      />
    </main>
  );
}
