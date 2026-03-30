import type { CalculatorInputs } from '../../calculator-types';
import type { CalculatorResults } from '../hooks/useCalculatorResults';
import { generateReportBlob } from '../../CapitalGrowthReport';
import type { ReportChartPoint } from '../../ReportPrint';
import { createReportAuditMeta } from '@cb/shared/reportTraceability';

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
  const blob = await generateReportBlob(args.inputs, args.result, {
    chartData: args.chartPoints,
    currentAge: args.currentAge ?? undefined,
    includeLionsVerdict: args.includeLionsVerdict ?? true,
    reportClientDisplayName: args.reportClientDisplayName,
    reportAudit: audit,
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

