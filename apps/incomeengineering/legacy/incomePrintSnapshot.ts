/**
 * JSON-serializable snapshot for Income Engineering Playwright PDF (same pattern as Capital Stress).
 */

import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import type { CurrencyCode } from "./config/currency";
import type {
  AssetUnlock,
  IncomeRow,
  InvestmentBucket,
  LoanRow,
  SummaryKPIs,
} from "./types/calculator";
import type { PrintReportViewProps } from "./components/PrintReportView";

export type IncomePrintSnapshotV1 = {
  v: 1;
  summary: SummaryKPIs;
  currency: CurrencyCode;
  totalCapital: number;
  monthlyExpenses: number;
  incomeRows: IncomeRow[];
  loans: LoanRow[];
  assetUnlocks: AssetUnlock[];
  investmentBuckets: InvestmentBucket[];
  medianCoverage: number;
  worstMonthCoverage: number;
  lionAccessEnabled: boolean;
  reportClientDisplayName: string;
  hasStrategicInterest: boolean;
};

export function serializeIncomePrintProps(args: {
  summary: SummaryKPIs;
  currency: CurrencyCode;
  totalCapital: number;
  monthlyExpenses: number;
  incomeRows: IncomeRow[];
  loans: LoanRow[];
  assetUnlocks: AssetUnlock[];
  investmentBuckets: InvestmentBucket[];
  medianCoverage: number;
  worstMonthCoverage: number;
  lionAccessEnabled: boolean;
  reportClientDisplayName: string;
  hasStrategicInterest: boolean;
}): IncomePrintSnapshotV1 {
  return {
    v: 1,
    summary: args.summary,
    currency: args.currency,
    totalCapital: args.totalCapital,
    monthlyExpenses: args.monthlyExpenses,
    incomeRows: args.incomeRows,
    loans: args.loans,
    assetUnlocks: args.assetUnlocks,
    investmentBuckets: args.investmentBuckets,
    medianCoverage: args.medianCoverage,
    worstMonthCoverage: args.worstMonthCoverage,
    lionAccessEnabled: args.lionAccessEnabled,
    reportClientDisplayName: args.reportClientDisplayName,
    hasStrategicInterest: args.hasStrategicInterest,
  };
}

export function buildPrintReportViewPropsFromSnapshot(
  s: IncomePrintSnapshotV1,
  auditMeta: ReportAuditMeta | null,
): PrintReportViewProps {
  return {
    summary: s.summary,
    currency: s.currency,
    totalCapital: s.totalCapital,
    monthlyExpenses: s.monthlyExpenses,
    incomeRows: s.incomeRows,
    loans: s.loans,
    assetUnlocks: s.assetUnlocks,
    investmentBuckets: s.investmentBuckets,
    medianCoverage: s.medianCoverage,
    worstMonthCoverage: s.worstMonthCoverage,
    lionAccessEnabled: s.lionAccessEnabled,
    reportClientDisplayName: s.reportClientDisplayName,
    auditMeta,
    hasStrategicInterest: s.hasStrategicInterest,
  };
}

export function isIncomePrintSnapshotV1(x: unknown): x is IncomePrintSnapshotV1 {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  if (o.v !== 1) return false;
  if (typeof o.currency !== "string") return false;
  if (typeof o.totalCapital !== "number" || typeof o.monthlyExpenses !== "number") return false;
  if (typeof o.medianCoverage !== "number" || typeof o.worstMonthCoverage !== "number") return false;
  if (typeof o.lionAccessEnabled !== "boolean") return false;
  if (typeof o.reportClientDisplayName !== "string") return false;
  if (typeof o.hasStrategicInterest !== "boolean") return false;
  if (!Array.isArray(o.incomeRows) || !Array.isArray(o.loans)) return false;
  if (!Array.isArray(o.assetUnlocks) || !Array.isArray(o.investmentBuckets)) return false;
  if (!o.summary || typeof o.summary !== "object") return false;
  const sum = o.summary as Record<string, unknown>;
  return typeof sum.monthlyIncome === "number" && typeof sum.monthlyExpenses === "number";
}
