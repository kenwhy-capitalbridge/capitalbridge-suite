import type { CalculatorInputs } from '../../calculator-types';
import type { CalculatorResults } from '../hooks/useCalculatorResults';
import { generateReportBlob } from '../../CapitalGrowthReport';
import type { ReportChartPoint } from '../../ReportPrint';

const DEFAULT_PDF_FILENAME = 'Client Advisory Report.pdf';

export async function exportCapitalHealthReport(args: {
  inputs: CalculatorInputs;
  result: CalculatorResults;
  chartPoints: ReportChartPoint[];
  currentAge?: number | null;
}): Promise<void> {
  const blob = await generateReportBlob(args.inputs, args.result, {
    chartData: args.chartPoints,
    currentAge: args.currentAge ?? undefined,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = DEFAULT_PDF_FILENAME;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

