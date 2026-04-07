import type { CalculatorInputs } from '../../calculator-types';
import type { CalculatorResults } from '../hooks/useCalculatorResults';
import { generateReportBlob } from '../../CapitalGrowthReport';
import type { ReportChartPoint } from '../../ReportPrint';
import { createReportAuditMeta } from '@cb/shared/reportTraceability';
import { CB_REPORT_BRAND_FULL_GREEN_PATH } from '@cb/shared/cbReportTemplate';

/** Rasterize the green full lockup SVG for react-pdf (reliable vs raw SVG); matches docs sample script. */
async function rasterizeGreenLockupForPdf(pageOrigin: string): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const svgUrl = `${pageOrigin}${CB_REPORT_BRAND_FULL_GREEN_PATH}`;
  try {
    const res = await fetch(svgUrl);
    if (!res.ok) return null;
    const svgText = await res.text();
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const objUrl = URL.createObjectURL(blob);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('lockup load'));
      img.src = objUrl;
    });
    const w = 720;
    const h = 160;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(objUrl);
      return null;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(objUrl);
    return canvas.toDataURL('image/png');
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
    typeof window !== 'undefined' ? await rasterizeGreenLockupForPdf(window.location.origin) : null;
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
