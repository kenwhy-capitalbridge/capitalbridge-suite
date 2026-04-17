import type { CalculatorInputs } from '../../calculator-types';
import type { CalculatorResults } from '../hooks/useCalculatorResults';
import { generateReportBlob } from '../../CapitalGrowthReport';
import type { ReportChartPoint } from '../../ReportPrint';
import { createReportAuditMeta } from '@cb/shared/reportTraceability';

const CAPITAL_HEALTH_COVER_LOGO_PNG_PATH = '/brand/Full_CapitalBridge_Green.png';

/** Read the cover PNG and return data URL for react-pdf reliability. */
async function loadCoverLogoPngForPdf(pageOrigin: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(`${pageOrigin}${CAPITAL_HEALTH_COVER_LOGO_PNG_PATH}`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportCapitalHealthReport(args: {
  inputs: CalculatorInputs;
  result: CalculatorResults;
  chartPoints: ReportChartPoint[];
  currentAge?: number | null;
  /** Paid / entitled users only; trial exports omit Lion's Verdict in the PDF. */
  includeLionsVerdict?: boolean;
  reportClientDisplayName?: string;
}): Promise<void> {
  const audit = createReportAuditMeta({
    modelCode: 'HEALTH',
    userDisplayName: args.reportClientDisplayName ?? 'Client',
  });
  const brandFullLockupPngDataUrl =
    typeof window !== 'undefined' ? await loadCoverLogoPngForPdf(window.location.origin) : null;
  const blob = await generateReportBlob(args.inputs, args.result, {
    chartData: args.chartPoints,
    currentAge: args.currentAge ?? undefined,
    includeLionsVerdict: args.includeLionsVerdict ?? true,
    reportClientDisplayName: args.reportClientDisplayName,
    reportAudit: audit,
    brandFullLockupPngDataUrl: brandFullLockupPngDataUrl ?? undefined,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = audit.filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
